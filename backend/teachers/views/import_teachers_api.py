"""
Teacher Excel Import API
──────────────────────────
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
    MasterSchool, TeacherInfo, Users, RegConfig
)

EXPECTED_COLUMNS = {
    'first_name':       ['first_name', 'first name', 'firstname'],
    'second_name':      ['second_name', 'second name', 'secondname', 'middle_name', 'middle name'],
    'surname':          ['surname', 'last_name', 'last name', 'lastname'],
    'gender':           ['gender', 'sex'],
    'phone':            ['phone', 'phone_number', 'phone number', 'contact'],
    'email':            ['email', 'email_address', 'email address'],
    'address':          ['address', 'postal_address', 'postal address', 'location'],
    'registration_no':  ['registration_no', 'registration_number', 'registration number', 'reg_no', 'reg no'],
}

def _normalise(header: str) -> str:
    return re.sub(r'\s+', ' ', str(header).strip().lower())

def _map_headers(raw_headers: list) -> dict:
    mapping = {}
    for idx, raw in enumerate(raw_headers):
        norm = _normalise(raw)
        for internal, synonyms in EXPECTED_COLUMNS.items():
            if norm in synonyms:
                mapping[internal] = idx
                break
    return mapping

def _next_seq(school_id: int, prefix: str) -> int:
    last = (
        TeacherInfo.objects
        .filter(school_id=school_id, registration_no__startswith=prefix)
        .order_by('-registration_no')
        .first()
    )
    if last:
        tail = last.registration_no[len(prefix):]
        try:
            return int(''.join(filter(str.isdigit, tail))) + 1
        except ValueError:
            pass
    return 1

class ImportTeachersParseView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        school_id = request.user.school_id
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded.'}, status=400)

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

        detected = list(col_map.keys())
        required = ['first_name', 'surname', 'gender', 'phone', 'email']
        missing_required = [c for c in required if c not in detected]

        data_rows = []
        for ri, row in enumerate(rows[1:], start=2):
            record = {}
            for internal, idx in col_map.items():
                val = row[idx] if idx < len(row) else None
                if val is not None:
                    val = str(val).strip()
                record[internal] = val or ''
            record['_row'] = ri
            data_rows.append(record)

        reg_cfg = RegConfig.objects.filter(school_id=school_id, target_type='teacher').first()
        reg_format = reg_cfg.reg_format if reg_cfg else ''

        return Response({
            'file_name': file.name,
            'total_rows': len(data_rows),
            'detected_columns': detected,
            'missing_required': missing_required,
            'raw_headers': raw_headers,
            'reg_format': reg_format,
            'teachers': data_rows,
        })

class ImportTeachersConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        school_id = request.user.school_id
        school = MasterSchool.objects.filter(id=school_id).first()
        if not school:
            return Response({'error': 'School not found.'}, status=404)

        teachers_data = request.data.get('teachers', [])
        reg_format = request.data.get('reg_format', '').strip()
        start_number = int(request.data.get('start_number', 0))

        if not teachers_data:
            return Response({'error': 'No teacher data provided.'}, status=400)

        if reg_format:
            RegConfig.objects.update_or_create(
                school_id=school_id,
                target_type='teacher',
                defaults={'reg_format': reg_format},
            )

        if start_number and start_number > 0:
            seq = start_number
        else:
            seq = _next_seq(school_id, reg_format) if reg_format else 1

        created_teachers = []
        errors = []

        for idx, row in enumerate(teachers_data):
            try:
                reg_no = (row.get('registration_no') or '').strip()
                if not reg_no:
                    padded = f"{seq:02d}"
                    reg_no = f"{reg_format}{padded}" if reg_format else f"SCH{school_id}TCH{padded}"
                    seq += 1

                first_name = (row.get('first_name') or '').strip()
                second_name = (row.get('second_name') or '').strip() or '-'
                surname = (row.get('surname') or '').strip()
                gender = (row.get('gender') or '').strip()
                phone_raw = (row.get('phone') or '').strip()
                address = (row.get('address') or '').strip() or '-'
                email = (row.get('email') or '').strip() or f"{reg_no.lower()}@shulebase.com"

                missing = []
                if not first_name: missing.append('first_name')
                if not surname: missing.append('surname')
                if not gender: missing.append('gender')
                if not phone_raw: missing.append('phone')

                if missing:
                    errors.append({
                        'row': row.get('_row', idx + 1),
                        'name': f"{first_name} {surname}",
                        'error': f"Missing: {', '.join(missing)}"
                    })
                    continue

                if TeacherInfo.objects.filter(school_id=school_id, registration_no=reg_no).exists():
                    errors.append({
                        'row': row.get('_row', idx + 1),
                        'name': f"{first_name} {surname}",
                        'error': f"Duplicate registration number: {reg_no}"
                    })
                    continue

                with transaction.atomic():
                    # Username and password should be teacher's first name (lowercase)
                    base_username = first_name.lower()
                    username = base_username
                    counter = 1
                    while Users.objects.filter(username=username, school_id=school_id).exists():
                        username = f"{base_username}{counter}"
                        counter += 1

                    user_exists = Users.objects.filter(username=username, school_id=school_id).exists()
                    if not user_exists:
                        Users.objects.create(
                            username=username,
                            password=make_password(base_username),
                            role='Teacher',
                            school=school,
                            school_name=school.school_name,
                            registration_no=reg_no,
                            email=email
                        )

                    teacher = TeacherInfo.objects.create(
                        registration_no=reg_no,
                        school=school,
                        first_name=first_name,
                        second_name=second_name,
                        surname=surname,
                        gender=gender,
                        phone=phone_raw,
                        address=address,
                        email=email,
                    )

                created_teachers.append({
                    'registration_no': teacher.registration_no,
                    'name': f"{teacher.first_name} {teacher.surname}",
                })

            except Exception as e:
                print(f"[ImportTeachers] Error row {row.get('_row', idx+1)}: {e}")
                errors.append({
                    'row': row.get('_row', idx + 1),
                    'name': f"{row.get('first_name', '')} {row.get('surname', '')}",
                    'error': str(e)
                })

        return Response({
            'message': f'Successfully imported {len(created_teachers)} teachers.',
            'created': len(created_teachers),
            'errors_count': len(errors),
            'errors': errors,
            'teachers': created_teachers,
        }, status=status.HTTP_201_CREATED if created_teachers else status.HTTP_400_BAD_REQUEST)
