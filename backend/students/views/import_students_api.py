"""
Student Excel Import API
──────────────────────────
Endpoints for parsing an uploaded Excel file, previewing its data,
generating registration numbers (with configurable priority ordering),
and bulk-creating student records + user accounts.
"""
import re
from datetime import datetime
from io import BytesIO

import openpyxl
from django.db import transaction
from django.contrib.auth.hashers import make_password
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from core.models import (
    MasterSchool, StudentInfo, Users, RegConfig, GradeStreamConfig,
)


# ────────────────────── helpers ──────────────────────

# Columns the system expects.  Keys = internal name, value = list of
# acceptable header synonyms (case-insensitive).
EXPECTED_COLUMNS = {
    'first_name':       ['first_name', 'first name', 'firstname'],
    'second_name':      ['second_name', 'second name', 'secondname', 'middle_name', 'middle name'],
    'surname':          ['surname', 'last_name', 'last name', 'lastname'],
    'gender':           ['gender', 'sex'],
    'date_of_birth':    ['date_of_birth', 'date of birth', 'dob', 'birth_date', 'birthdate'],
    'grade':            ['grade', 'class', 'form', 'level'],
    'stream':           ['stream', 'section'],
    'phone':            ['phone', 'phone_number', 'phone number', 'parent_phone', 'parent phone', 'contact'],
    'parent_name':      ['parent_name', 'parent name', 'guardian', 'guardian_name', 'guardian name'],
    'address':          ['address', 'postal_address', 'postal address', 'location'],
    'email':            ['email', 'email_address', 'email address'],
    'assessment_number': ['assessment_number', 'assessment number', 'nemis', 'upi'],
    'registration_no':  ['registration_no', 'registration_number', 'registration number', 'reg_no', 'reg no', 'admission_number', 'admission number', 'adm_no', 'adm no'],
}


def _normalise(header: str) -> str:
    """Lower-case & strip whitespace from a header cell."""
    return re.sub(r'\s+', ' ', str(header).strip().lower())


def _map_headers(raw_headers: list) -> dict:
    """
    Return a mapping {internal_name: column_index} for every
    recognised column in the spreadsheet.
    """
    mapping = {}
    for idx, raw in enumerate(raw_headers):
        norm = _normalise(raw)
        for internal, synonyms in EXPECTED_COLUMNS.items():
            if norm in synonyms:
                mapping[internal] = idx
                break
    return mapping


def _parse_date(val):
    """Coerce various date representations to YYYY-MM-DD string."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return s  # return raw string – validation will catch it


# Grade ordering helpers: higher grades get LOWER sequence numbers
# so they receive earlier registration numbers.
GRADE_ORDER = {
    '9': 1, 'grade 9': 1, 'form 3': 1,
    '8': 2, 'grade 8': 2, 'form 2': 2,
    '7': 3, 'grade 7': 3, 'form 1': 3,
    '6': 4, 'grade 6': 4,
    '5': 5, 'grade 5': 5,
    '4': 6, 'grade 4': 6,
    '3': 7, 'grade 3': 7,
    '2': 8, 'grade 2': 8,
    '1': 9, 'grade 1': 9,
    'pp2': 10, 'pp 2': 10,
    'pp1': 11, 'pp 1': 11,
    'playgroup': 12, 'baby class': 12,
}


def _grade_sort_key(grade_str: str) -> int:
    """Return a numeric key for sorting students by grade (senior first)."""
    return GRADE_ORDER.get(grade_str.strip().lower(), 99)


def _next_seq(school_id: int, prefix: str) -> int:
    """
    Determine the next sequence number for registration numbers that
    share the given prefix.
    """
    last = (
        StudentInfo.objects
        .filter(school_id=school_id, registration_no__startswith=prefix)
        .order_by('-registration_no')
        .first()
    )
    if last:
        tail = last.registration_no[len(prefix):]
        try:
            return int(tail) + 1
        except ValueError:
            pass
    return 1


# ────────────────────── views ──────────────────────

class ImportStudentsParseView(APIView):
    """
    POST: Accepts an Excel file upload.
    Parses the workbook and returns a JSON preview of rows, detected
    column mapping, and any missing columns.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        school_id = request.user.school_id
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded.'}, status=400)

        # Accept .xlsx and .xls
        if not file.name.lower().endswith(('.xlsx', '.xls')):
            return Response({'error': 'Only Excel files (.xlsx / .xls) are supported.'}, status=400)

        try:
            wb = openpyxl.load_workbook(BytesIO(file.read()), data_only=True)
            ws = wb.active
        except Exception as e:
            return Response({'error': f'Could not read Excel file: {e}'}, status=400)

        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            return Response({'error': 'The file must have a header row and at least one data row.'}, status=400)

        raw_headers = [str(h) if h else '' for h in rows[0]]
        col_map = _map_headers(raw_headers)

        # Detected & missing
        detected = list(col_map.keys())
        required = ['first_name', 'surname', 'gender', 'date_of_birth', 'grade', 'stream', 'phone', 'address']
        missing_required = [c for c in required if c not in detected]

        # Parse data rows
        data_rows = []
        for ri, row in enumerate(rows[1:], start=2):
            record = {}
            for internal, idx in col_map.items():
                val = row[idx] if idx < len(row) else None
                if internal == 'date_of_birth':
                    val = _parse_date(val)
                elif val is not None:
                    val = str(val).strip()
                record[internal] = val or ''
            record['_row'] = ri  # original Excel row for user reference
            data_rows.append(record)

        # Registration config
        reg_cfg = RegConfig.objects.filter(school_id=school_id, target_type='student').first()
        reg_format = reg_cfg.reg_format if reg_cfg else ''

        # Available grades/streams for the school
        gs_qs = GradeStreamConfig.objects.filter(school_id=school_id).order_by('grade', 'stream')
        grades = sorted(set(gs_qs.values_list('grade', flat=True)))
        streams = sorted(set(gs_qs.values_list('stream', flat=True)))

        return Response({
            'file_name': file.name,
            'total_rows': len(data_rows),
            'detected_columns': detected,
            'missing_required': missing_required,
            'raw_headers': raw_headers,
            'reg_format': reg_format,
            'available_grades': grades,
            'available_streams': streams,
            'students': data_rows,
        })


class ImportStudentsConfirmView(APIView):
    """
    POST: Receives the reviewed student list from the frontend and
    bulk-creates StudentInfo + User accounts inside an atomic transaction.

    Expected payload:
    {
      "students": [ { ... row data ... }, ... ],
      "reg_format": "SCH-2026-",
      "priority": "senior_first" | "as_is",
      "start_number": 1
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        school_id = request.user.school_id
        school = MasterSchool.objects.filter(id=school_id).first()
        if not school:
            return Response({'error': 'School not found.'}, status=404)

        students_data = request.data.get('students', [])
        reg_format = request.data.get('reg_format', '').strip()
        priority = request.data.get('priority', 'senior_first')
        start_number = int(request.data.get('start_number', 0))

        if not students_data:
            return Response({'error': 'No student data provided.'}, status=400)

        # Save / update reg config if provided
        if reg_format:
            RegConfig.objects.update_or_create(
                school_id=school_id,
                target_type='student',
                defaults={'reg_format': reg_format},
            )

        # Determine next sequence number
        if start_number and start_number > 0:
            seq = start_number
        else:
            seq = _next_seq(school_id, reg_format) if reg_format else 1

        # Sort by grade priority if requested
        if priority == 'senior_first':
            students_data = sorted(students_data, key=lambda r: _grade_sort_key(r.get('grade', '')))

        created_students = []
        errors = []

        for idx, row in enumerate(students_data):
            try:
                # ── Build / assign registration number ──
                reg_no = (row.get('registration_no') or '').strip()
                if not reg_no:
                    padded = f"{seq:03d}"
                    reg_no = f"{reg_format}{padded}" if reg_format else f"SCH{school_id}REG{padded}"
                    seq += 1

                # ── Validate required fields ──
                first_name = (row.get('first_name') or '').strip()
                second_name = (row.get('second_name') or '').strip() or '-'
                surname = (row.get('surname') or '').strip()
                gender = (row.get('gender') or '').strip()
                dob = (row.get('date_of_birth') or '').strip()
                grade = (row.get('grade') or '').strip()
                stream = (row.get('stream') or '').strip()
                phone_raw = (row.get('phone') or '').strip()
                address = (row.get('address') or '').strip() or '-'
                email = (row.get('email') or '').strip() or None
                parent_name = (row.get('parent_name') or '').strip() or None
                assessment_number = (row.get('assessment_number') or '').strip() or None

                missing = []
                if not first_name: missing.append('first_name')
                if not surname: missing.append('surname')
                if not gender: missing.append('gender')
                if not dob: missing.append('date_of_birth')
                if not grade: missing.append('grade')
                if not stream: missing.append('stream')
                if not phone_raw: missing.append('phone')

                if missing:
                    errors.append({
                        'row': row.get('_row', idx + 1),
                        'name': f"{first_name} {surname}",
                        'error': f"Missing: {', '.join(missing)}"
                    })
                    continue

                # Parse phone
                try:
                    phone = int(re.sub(r'[^\d]', '', phone_raw))
                except (ValueError, TypeError):
                    errors.append({
                        'row': row.get('_row', idx + 1),
                        'name': f"{first_name} {surname}",
                        'error': f"Invalid phone: {phone_raw}"
                    })
                    continue

                # Parse date
                try:
                    date_of_birth = datetime.strptime(dob, '%Y-%m-%d').date()
                except ValueError:
                    errors.append({
                        'row': row.get('_row', idx + 1),
                        'name': f"{first_name} {surname}",
                        'error': f"Invalid date: {dob}"
                    })
                    continue

                # Check duplicate
                if StudentInfo.objects.filter(school_id=school_id, registration_no=reg_no).exists():
                    errors.append({
                        'row': row.get('_row', idx + 1),
                        'name': f"{first_name} {surname}",
                        'error': f"Duplicate registration number: {reg_no}"
                    })
                    continue

                # ── Create Student Account (User) ──
                with transaction.atomic():
                    user_exists = Users.objects.filter(username=reg_no, school_id=school_id).exists()
                    if not user_exists:
                        Users.objects.create(
                            username=reg_no,
                            password=make_password(reg_no, hasher='md5'),
                            role='Student',
                            school=school,
                            school_name=school.school_name,
                            registration_no=reg_no,
                        )

                    # ── Create StudentInfo ──
                    student = StudentInfo.objects.create(
                        registration_no=reg_no,
                        school=school,
                        first_name=first_name,
                        second_name=second_name,
                        surname=surname,
                        gender=gender,
                        date_of_birth=date_of_birth,
                        date_of_registration=datetime.now().date(),
                        grade=grade,
                        stream=stream,
                        phone=phone,
                        address=address,
                        email=email,
                        parent_name=parent_name,
                        assessment_number=assessment_number,
                    )

                created_students.append({
                    'registration_no': student.registration_no,
                    'name': f"{student.first_name} {student.surname}",
                    'grade': student.grade,
                    'stream': student.stream,
                })

            except Exception as e:
                print(f"[ImportStudents] Error row {row.get('_row', idx+1)}: {e}")
                errors.append({
                    'row': row.get('_row', idx + 1),
                    'name': f"{row.get('first_name', '')} {row.get('surname', '')}",
                    'error': str(e)
                })

        return Response({
            'message': f'Successfully imported {len(created_students)} students.',
            'created': len(created_students),
            'errors_count': len(errors),
            'errors': errors,
            'students': created_students,
        }, status=status.HTTP_201_CREATED if created_students else status.HTTP_400_BAD_REQUEST)
