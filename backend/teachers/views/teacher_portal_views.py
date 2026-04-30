import logging
from datetime import datetime, timedelta
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    StudentAttendance,
    StudentInfo,
    Strand,
    SubStrand,
    SubStrandMark,
    Resource,
    LearningLog,
    LearnerCompetency,
    LeaveManagement, Announcement, MasterSchool,
    TeacherInfo,
    TeachersRole,
    TeachingProgress,
    TeacherLeave,
    LearningArea,
    LearningAreaMark,
    TeachingTarget,
    LearnerPortfolio,
    NationalAssessment,
    ReportCardComment
)

from core.serializers import (
    TeacherSerializer,
    TeachersRoleSerializer,
    StrandSerializer,
    SubStrandSerializer,
    SubStrandMarkSerializer,
    TeachingProgressSerializer,
    StudentAttendanceSerializer,
    AttendanceWriteSerializer,
    StudentInfoSerializer,
    ResourceSerializer,
    LearningLogSerializer,
    AnnouncementSerializer,
    LearnerCompetencySerializer,
    TeacherLeaveSerializer,
    LearningAreaMarkSerializer,
    TeachingTargetSerializer,
    LearnerPortfolioSerializer,
    NationalAssessmentSerializer
)


from core.ai_utils import extract_strands_from_file, extract_teaching_progress_from_file

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_teacher(user):
    try:
        return TeacherInfo.objects.get(
            school_id=user.school_id,
            registration_no=user.registration_no,
        )
    except TeacherInfo.DoesNotExist:
        return None


def _get_school(user):
    return MasterSchool.objects.get(id=user.school_id)




def _subjects_from_roles(roles):
    subjects = set()
    for role in roles:
        if role.subject:
            subjects.update(s.strip() for s in role.subject.split(",") if s.strip())
    return sorted(subjects)


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard  →  GET /api/teacher/dashboard/
# ─────────────────────────────────────────────────────────────────────────────

class DashboardAPIView(APIView):
    """
    Returns all data needed to render the teacher dashboard.

    Response:
    {
        "teacher": { ...TeacherInfo fields },
        "is_class_teacher": bool,
        "subjects": ["Math", ...],
        "present_today": 12,
        "absent_today": 3,
        "completed": 5,
        "ongoing": 2
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school_id = request.user.school_id
        teacher = _get_teacher(request.user)

        if not teacher:
            return Response(
                {"detail": "Teacher profile not found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # filters
        filter_term = request.query_params.get("filter_term", "").strip()
        f_grade = request.query_params.get("grade", "").strip()
        f_stream = request.query_params.get("stream", "").strip()

        # --- Roles and Subjects ---
        roles = TeachersRole.objects.filter(school_id=school_id, registration_no=teacher)
        if f_grade:  roles = roles.filter(grade=f_grade)
        if f_stream: roles = roles.filter(stream=f_stream)
        
        class_role = roles.filter(type_of_teacher="Class Teacher").first()
        # If the user explicitly filtered, use those. Otherwise use class teacher role if any.
        active_grade = f_grade or (class_role.grade if class_role else None)
        active_stream = f_stream or (class_role.stream if class_role else None)

        # --- Teaching Progress (Optimized) ---
        p_qs = TeachingProgress.objects.filter(school_id=school_id, registration_no=teacher)
        if f_grade:  p_qs = p_qs.filter(grade=f_grade)
        if f_stream: p_qs = p_qs.filter(stream=f_stream)
        
        progress_stats = p_qs.aggregate(
            completed=Count('id', filter=Q(status="Completed")),
            ongoing=Count('id', filter=Q(status="Ongoing"))
        )

        # --- Student Attendance ---
        present_today = 0
        absent_today = 0
        attendance_rate = None
        attendance_by_term = {}
        total_students = 0
        attendance_trend = []
        
        if active_grade and active_stream:
            student_ids = StudentInfo.objects.filter(
                school_id=school_id, grade=active_grade, stream=active_stream
            ).values_list("registration_no", flat=True)
            total_students = StudentInfo.objects.filter(
                school_id=school_id, grade=active_grade, stream=active_stream
            ).count()

            if student_ids.exists():
                attendance_stats = StudentAttendance.objects.filter(
                    school_id=school_id,
                    registration_no__in=student_ids,
                    date_of_attendance=timezone.now().date(),
                ).aggregate(
                    present_today=Count('id', filter=Q(status="Present")),
                    absent_today=Count('id', filter=Q(status="Absent"))
                )
                present_today = attendance_stats.get('present_today', 0)
                absent_today = attendance_stats.get('absent_today', 0)

                year = str(datetime.now().year)
                base_qs = StudentAttendance.objects.filter(
                    school_id=school_id,
                    registration_no__in=student_ids,
                    year=year,
                )
                if filter_term:
                    base_qs = base_qs.filter(term=filter_term)

                totals = base_qs.aggregate(
                    present=Count('id', filter=Q(status="Present")),
                    absent=Count('id', filter=Q(status="Absent")),
                )
                present = totals.get('present', 0) or 0
                absent = totals.get('absent', 0) or 0
                total = present + absent
                attendance_rate = (present / total * 100) if total > 0 else None

                # Termly breakdown
                for t in ["Term 1", "Term 2", "Term 3"]:
                    t_tot = StudentAttendance.objects.filter(
                        school_id=school_id, registration_no__in=student_ids,
                        year=year, term=t,
                    ).aggregate(present=Count('id', filter=Q(status="Present")), absent=Count('id', filter=Q(status="Absent")))
                    p, a = t_tot.get('present', 0) or 0, t_tot.get('absent', 0) or 0
                    tt = p + a
                    attendance_by_term[t] = (p / tt * 100) if tt > 0 else None

                # Trend (14 days)
                today = timezone.now().date()
                dates = [today - timedelta(days=i) for i in range(13, -1, -1)]
                for d in dates:
                    row = StudentAttendance.objects.filter(
                        school_id=school_id, registration_no__in=student_ids, date_of_attendance=d,
                    ).aggregate(present=Count('id', filter=Q(status="Present")), absent=Count('id', filter=Q(status="Absent")))
                    p, a = row.get('present', 0) or 0, row.get('absent', 0) or 0
                    tt = p + a
                    rate = (p / tt * 100) if tt > 0 else None
                    attendance_trend.append({"date": str(d), "present": p, "absent": a, "rate": rate})

        # --- Performance Overview ---
        performance = []
        # Re-fetch subjects based on (potentially filtered) roles
        assigned_subjects = _subjects_from_roles(roles)
        
        for sub_name in assigned_subjects:
            # Summative average
            s_marks_qs = LearningAreaMark.objects.filter(
                school_id=school_id, 
                learning_area__name__iexact=sub_name.strip()
            )
            if f_grade:  s_marks_qs = s_marks_qs.filter(grade=f_grade)
            if f_stream: s_marks_qs = s_marks_qs.filter(stream=f_stream)
            avg_summative = s_marks_qs.aggregate(avg=Avg('marks'))['avg'] or 0
            
            # Formative average
            f_marks_qs = SubStrandMark.objects.filter(
                sub_strand__strand__school_id=school_id,
                sub_strand__strand__subject__iexact=sub_name.strip()
            )
            if f_grade:  f_marks_qs = f_marks_qs.filter(student__grade=f_grade)
            if f_stream: f_marks_qs = f_marks_qs.filter(student__stream=f_stream)
            avg_formative = f_marks_qs.aggregate(avg=Avg('score'))['avg'] or 0
            
            performance.append({
                "subject": sub_name,
                "summative_avg": round(float(avg_summative), 1),
                "formative_avg": round(float(avg_formative), 1)
            })

        # --- Subject Progress Analytics ---
        subject_progress = []
        targets = TeachingTarget.objects.filter(school_id=school_id, teacher=teacher)
        if f_grade: targets = targets.filter(grade=f_grade)
        if f_stream: targets = targets.filter(stream=f_stream)
        target_map = {f"{t.grade}-{t.stream}-{t.subject}-{t.term}": t.total_topics for t in targets}
        
        current_term = filter_term or "Term 1"
        current_year = datetime.now().year

        for role in roles:
            if not role.subject: continue
            subs = [s.strip() for s in role.subject.split(",") if s.strip()]
            for sub in subs:
                target = target_map.get(f"{role.grade}-{role.stream}-{sub}-{current_term}", 0)
                completed = TeachingProgress.objects.filter(
                    school_id=school_id, registration_no=teacher,
                    grade=role.grade, stream=role.stream, subject=sub,
                    term=current_term, year=current_year, status="Completed"
                ).count()
                pct = (completed / target * 100) if target > 0 else 0
                subject_progress.append({
                    "subject": sub, "grade": role.grade, "stream": role.stream,
                    "completed": completed, "total": target, "percent": round(pct, 1)
                })

        return Response({
            "teacher": TeacherSerializer(teacher).data,
            "is_class_teacher": class_role is not None,
            "subjects": assigned_subjects,
            "performance": performance,
            "present_today": present_today,
            "absent_today": absent_today,
            "total_students": total_students,
            "attendance_rate": round(attendance_rate, 1) if attendance_rate is not None else None,
            "attendance_by_term": attendance_by_term,
            "attendance_trend": attendance_trend,
            "completed": progress_stats.get('completed', 0),
            "ongoing": progress_stats.get('ongoing', 0),
            "subject_progress": subject_progress,
            "grades": sorted({r.grade for r in roles if r.grade}),
            "streams": sorted({r.stream for r in roles if r.stream}),
        })


# ─────────────────────────────────────────────────────────────────────────────
# Teacher Account  →  GET/PUT /api/teacher/account/
# ─────────────────────────────────────────────────────────────────────────────

class TeacherAccountAPIView(APIView):
    """
    GET  → returns the logged-in teacher's profile.
    PUT  → updates the teacher's profile fields.

    Response (GET):
    { "teacher": { ...TeacherInfo fields } }
    """
    permission_classes = [IsAuthenticated]

    def _get_teacher_or_404(self, user):
        try:
            return TeacherInfo.objects.get(
                registration_no=user.registration_no,
                school_id=user.school_id,
            )
        except TeacherInfo.DoesNotExist:
            return None

    def get(self, request):
        teacher = self._get_teacher_or_404(request.user)
        if not teacher:
            return Response(
                {"detail": "Teacher record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"teacher": TeacherSerializer(teacher).data})

    def put(self, request):
        teacher = self._get_teacher_or_404(request.user)
        if not teacher:
            return Response(
                {"detail": "Teacher record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TeacherSerializer(teacher, data=request.data, partial=True)
        if serializer.is_valid():
            obj = serializer.save()
            # Preserve immutable fields
            obj.registration_no = request.user.registration_no
            obj.date_of_registration = teacher.date_of_registration
            obj.school = _get_school(request.user)
            obj.save()
            return Response({"teacher": TeacherSerializer(obj).data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# Attendance  →  GET/POST /api/teacher/attendance/
# ─────────────────────────────────────────────────────────────────────────────

class AttendanceAPIView(APIView):
    """
    GET  → returns pupils, grades, streams, and attendance records.
           Query params: grade, stream, filter_date, filter_term

    POST → bulk-create attendance records.
           Body: { grade, stream, term_select, statuses: { reg_no: "Present"|"Absent" } }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school_id = request.user.school_id
        teacher = _get_teacher(request.user)

        filter_date = request.query_params.get("filter_date", "")
        filter_term = request.query_params.get("filter_term", "")
        f_grade = request.query_params.get("grade", "").strip()
        f_stream = request.query_params.get("stream", "").strip()

        class_roles = TeachersRole.objects.filter(
            school_id=school_id, registration_no=teacher, type_of_teacher="Class Teacher"
        )
        
        grades_list = list(class_roles.values_list("grade", flat=True).distinct())
        streams_list = list(class_roles.values_list("stream", flat=True).distinct())
        
        grade = f_grade or class_roles.values_list("grade", flat=True).first()
        stream = f_stream or class_roles.values_list("stream", flat=True).first()

        pupils = (
            StudentInfo.objects.filter(school_id=school_id, grade=grade, stream=stream)
            .order_by("registration_no")
            if grade and stream else StudentInfo.objects.none()
        )

        today = timezone.now().date()
        attendance_recorded = list(
            StudentAttendance.objects.filter(
                school_id=school_id,
                registration_no__grade=grade,
                registration_no__stream=stream,
                date_of_attendance=today,
            ).values_list("registration_no", flat=True)
        )

        records_qs = StudentAttendance.objects.filter(
            school_id=school_id,
            registration_no__grade=grade,
            registration_no__stream=stream,
        ).order_by("-date_of_attendance")
        if filter_date:
            records_qs = records_qs.filter(date_of_attendance=filter_date)
        if filter_term:
            records_qs = records_qs.filter(term=filter_term)

        return Response({
            "grades": grades_list,
            "streams": streams_list,
            "grade": grade,
            "stream": stream,
            "pupils": StudentInfoSerializer(pupils, many=True).data,
            "attendance_recorded": attendance_recorded,
            "attendance_records": StudentAttendanceSerializer(records_qs, many=True).data,
            "term_choices": ["Term 1", "Term 2", "Term 3"],
            "today": str(today),
        })

    def post(self, request):
        school_id = request.user.school_id
        school_instance = _get_school(request.user)
        serializer = AttendanceWriteSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        grade = data["grade"]
        stream = data["stream"]
        term = data["term_select"]
        statuses = data["statuses"]  # { reg_no: "Present"|"Absent" }

        today = timezone.now().date()
        year = today.year
        time_str = timezone.now().strftime("%H:%M")

        already_recorded = set(
            StudentAttendance.objects.filter(
                school_id=school_id,
                registration_no__grade=grade,
                registration_no__stream=stream,
                date_of_attendance=today,
            ).values_list("registration_no", flat=True)
        )

        pupils = StudentInfo.objects.filter(
            school_id=school_id, grade=grade, stream=stream
        )
        pupil_map = {str(p.registration_no): p for p in pupils}

        records = [
            StudentAttendance(
                school=school_instance,
                registration_no=pupil_map[reg_no],
                date_of_attendance=today,
                year=year,
                time=time_str,
                status=att_status,
                term=term,
            )
            for reg_no, att_status in statuses.items()
            if reg_no not in already_recorded and reg_no in pupil_map
        ]

        if records:
            StudentAttendance.objects.bulk_create(records)

        return Response(
            {"detail": f"{len(records)} attendance record(s) saved."},
            status=status.HTTP_201_CREATED,
        )


class LearnerPortfolioAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = request.query_params.get('student_id')
        sub_strand_id = request.query_params.get('sub_strand_id')
        
        qs = LearnerPortfolio.objects.filter(student__school_id=request.user.school_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if sub_strand_id:
            qs = qs.filter(sub_strand_id=sub_strand_id)
            
        serializer = LearnerPortfolioSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = LearnerPortfolioSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(recorded_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NationalAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        grade = request.query_params.get('grade')
        stream = request.query_params.get('stream')
        
        qs = NationalAssessment.objects.filter(student__school_id=request.user.school_id)
        if grade:
            qs = qs.filter(student__grade=grade)
        if stream:
            qs = qs.filter(student__stream=stream)
            
        serializer = NationalAssessmentSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        if isinstance(request.data, list):
            saved_data = []
            for item in request.data:
                serializer = NationalAssessmentSerializer(data=item)
                if serializer.is_valid():
                    serializer.save(recorded_by=request.user)
                    saved_data.append(serializer.data)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            return Response(saved_data, status=status.HTTP_201_CREATED)
        else:
            serializer = NationalAssessmentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(recorded_by=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# Strands  →  /api/teacher/strands/
# ─────────────────────────────────────────────────────────────────────────────

class StrandListAPIView(APIView):
    """
    GET  → list all strands for the logged-in teacher.
    POST → create a new strand.

    Response (GET):
    { strands: [...], subjects: [...], grades: [...], streams: [...] }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school_id = request.user.school_id
        teacher = _get_teacher(request.user)

        strands = Strand.objects.filter(
            school_id=school_id, created_by=request.user
        ).order_by("subject", "name")

        roles = TeachersRole.objects.filter(school_id=school_id, registration_no=teacher)
        grades, streams, subjects = [], [], set()
        assigned_subjects = []
        
        for role in roles:
            if role.grade:
                grades.append(role.grade)
            if role.stream:
                streams.append(role.stream)
            if role.subject:
                subs = [s.strip() for s in role.subject.split(",") if s.strip()]
                subjects.update(subs)
                for s in subs:
                    assigned_subjects.append({
                        "subject": s,
                        "grade": role.grade,
                        "stream": role.stream
                    })

        return Response({
            "strands": StrandSerializer(strands, many=True).data,
            "subjects": sorted(subjects),
            "assigned_subjects": assigned_subjects,
            "grades": sorted(set(grades)),
            "streams": sorted(set(streams)),
        })

    def post(self, request):
        school_instance = _get_school(request.user)
        serializer = StrandSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(school=school_instance, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StrandDetailAPIView(APIView):
    """
    PUT    /api/teacher/strands/<pk>/  → update strand
    DELETE /api/teacher/strands/<pk>/  → delete strand
    """
    permission_classes = [IsAuthenticated]

    def _get_strand(self, pk, user):
        try:
            return Strand.objects.get(pk=pk, school_id=user.school_id, created_by=user)
        except Strand.DoesNotExist:
            return None

    def put(self, request, pk):
        strand = self._get_strand(pk, request.user)
        if not strand:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = StrandSerializer(strand, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        strand = self._get_strand(pk, request.user)
        if not strand:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        strand.delete()
        return Response({"detail": "Strand deleted."}, status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# Sub-Strands  →  /api/teacher/strands/<strand_id>/sub-strands/<grade>/<stream>/
# ─────────────────────────────────────────────────────────────────────────────

class SubStrandListAPIView(APIView):
    """
    GET  → list sub-strands for a strand/grade/stream.
    POST → create a new sub-strand.
    """
    permission_classes = [IsAuthenticated]

    def _get_strand(self, strand_id, grade, stream):
        try:
            return Strand.objects.get(pk=strand_id, grade=grade, stream=stream)
        except Strand.DoesNotExist:
            return None

    def get(self, request, strand_id, grade, stream):
        strand = self._get_strand(strand_id, grade, stream)
        if not strand:
            return Response({"detail": "Strand not found."}, status=status.HTTP_404_NOT_FOUND)
        sub_strands = strand.sub_strands.all().order_by("created_at")
        return Response({
            "strand": StrandSerializer(strand).data,
            "sub_strands": SubStrandSerializer(sub_strands, many=True).data,
        })

    def post(self, request, strand_id, grade, stream):
        strand = self._get_strand(strand_id, grade, stream)
        if not strand:
            return Response({"detail": "Strand not found."}, status=status.HTTP_404_NOT_FOUND)

        name = (request.data.get("name") or "").strip()
        description = (request.data.get("description") or "").strip()

        if not name:
            return Response(
                {"detail": "Name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            sub_strand = SubStrand.objects.create(
                strand=strand,
                name=name,
                description=description or None,
                created_by=request.user,
            )
            return Response(
                SubStrandSerializer(sub_strand).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception:
            logger.exception("Failed to create SubStrand for strand_id=%s", strand_id)
            return Response(
                {"detail": "Failed to create sub-strand."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SubStrandDetailAPIView(APIView):
    """
    PUT /api/teacher/sub-strands/<sub_strand_id>/  → update name/description
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, sub_strand_id):
        try:
            sub_strand = SubStrand.objects.get(pk=sub_strand_id)
        except SubStrand.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        name = (request.data.get("name") or "").strip()
        description = (request.data.get("description") or "").strip()

        if not name:
            return Response(
                {"detail": "Sub-strand name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            sub_strand.name = name
            sub_strand.description = description
            sub_strand.save()
            return Response({
                "status": "success",
                "data": SubStrandSerializer(sub_strand).data,
            })
        except Exception as e:
            return Response(
                {"detail": f"Server error: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request, sub_strand_id):
        """Allow deletion of a sub-strand by its creator within the same school."""
        try:
            sub_strand = SubStrand.objects.select_related('strand').get(pk=sub_strand_id, strand__school_id=request.user.school_id, created_by=request.user)
        except SubStrand.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            sub_strand.delete()
            return Response({"detail": "Sub-strand deleted."}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.exception("Failed to delete SubStrand id=%s: %s", sub_strand_id, e)
            return Response({"detail": "Delete failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# Sub-Strand Scores  →  /api/teacher/sub-strands/<id>/scores/<grade>/<stream>/
# ─────────────────────────────────────────────────────────────────────────────

class SubStrandScoresAPIView(APIView):
    """
    GET  → return students + existing scores for a sub-strand/grade/stream/term.
           Query params: term

    POST → bulk upsert scores.
           Body: { term, scores: { reg_no: score }, remarks: { reg_no: remark } }
    """
    permission_classes = [IsAuthenticated]

    def _get_sub_strand(self, sub_strand_id):
        try:
            return SubStrand.objects.select_related("strand").get(pk=sub_strand_id)
        except SubStrand.DoesNotExist:
            return None

    def get(self, request, sub_strand_id, grade, stream):
        school_id = request.user.school_id
        sub_strand = self._get_sub_strand(sub_strand_id)
        if not sub_strand:
            return Response({"detail": "Sub-strand not found."}, status=status.HTTP_404_NOT_FOUND)

        students = StudentInfo.objects.filter(
            school_id=school_id, grade=grade, stream=stream
        ).order_by("registration_no")

        current_year = str(datetime.now().year)
        selected_term = request.query_params.get("term", "").strip()

        marks_qs = SubStrandMark.objects.filter(sub_strand=sub_strand, year=current_year)
        if selected_term:
            marks_qs = marks_qs.filter(term=selected_term)

        rows = marks_qs.values("student__registration_no", "score", "remark", "raw_score", "level")
        score_map  = {r["student__registration_no"]: r["score"]  for r in rows}
        remark_map = {r["student__registration_no"]: r["remark"] for r in rows}
        raw_map    = {r["student__registration_no"]: r.get("raw_score") for r in rows}
        level_map  = {r["student__registration_no"]: r.get("level") for r in rows}

        return Response({
            "sub_strand": SubStrandSerializer(sub_strand).data,
            "strand": StrandSerializer(sub_strand.strand).data,
            "students": StudentInfoSerializer(students, many=True).data,
            "scores": score_map,
            "remarks": remark_map,
            "raw_marks": raw_map,
            "levels": level_map,
            "term_choices": ["Term 1", "Term 2", "Term 3"],
            "selected_term": selected_term,
        })

    def post(self, request, sub_strand_id, grade, stream):
        school_id = request.user.school_id
        sub_strand = self._get_sub_strand(sub_strand_id)
        if not sub_strand:
            return Response({"detail": "Sub-strand not found."}, status=status.HTTP_404_NOT_FOUND)

        term = (request.data.get("term") or "").strip()
        if term not in ["Term 1", "Term 2", "Term 3"]:
            return Response(
                {"detail": "Valid term is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scores      = request.data.get("scores", {})   # { reg_no: score }
        remarks     = request.data.get("remarks", {})  # { reg_no: remark }
        levels_payload = request.data.get("levels", {})  # optional { reg_no: level }
        raw_marks   = request.data.get("raw_marks", {})  # optional { reg_no: raw }
        out_of_val  = request.data.get("out_of")
        assessement_type = request.data.get("assessement_type")

        print("Ass type: ",assessement_type)
        try:
            out_of = float(out_of_val) if out_of_val not in (None, "") else None
        except Exception:
            out_of = None
        current_year = str(datetime.now().year)

        students = StudentInfo.objects.filter(
            school_id=school_id, grade=grade, stream=stream
        )
        student_map = {str(s.registration_no): s for s in students}

        updated, errors = 0, []
        for reg_no, raw_score in scores.items():
            if raw_score in (None, ""):
                continue
            student = student_map.get(str(reg_no))
            if not student:
                continue
            try:
                # determine level: prefer explicit level from payload, else compute from score
                level_value = None
                lp_key = str(reg_no)
                if lp_key in levels_payload and levels_payload.get(lp_key) not in (None, ""):
                    try:
                        lv = levels_payload.get(lp_key)
                        # accept both numeric (1,2,3,4) or strings like 'Level 2'
                        if isinstance(lv, str) and lv.lower().startswith('level'):
                            level_value = int(lv.split()[-1])
                        else:
                            level_value = int(lv)
                    except Exception:
                        level_value = None

                # Determine raw and percentage score values
                raw_val = None
                if str(reg_no) in raw_marks and raw_marks.get(str(reg_no)) not in (None, ""):
                    try:
                        raw_val = float(raw_marks.get(str(reg_no)))
                    except Exception:
                        raw_val = None

                # If raw_val is provided and out_of is known, compute percentage
                if raw_val is not None and out_of:
                    score_pct = (raw_val / out_of) * 100
                elif raw_val is not None:
                    # no out_of given; assume raw_val is already percentage
                    score_pct = raw_val
                else:
                    # fall back to 'scores' payload
                    try:
                        score_pct = float(raw_score)
                    except Exception:
                        # invalid score value, skip
                        continue

                # if level not provided, compute using CBC bands on percentage
                if level_value is None:
                    if score_pct >= 80:
                        level_value = 4
                    elif score_pct >= 60:
                        level_value = 3
                    elif score_pct >= 40:
                        level_value = 2
                    else:
                        level_value = 1

                SubStrandMark.objects.update_or_create(
                    student=student,
                    sub_strand=sub_strand,
                    term=term,
                    year=current_year,
                    defaults={
                        "score": score_pct,
                        "raw_score": raw_val if raw_val is not None else score_pct,
                        "assessement_type": assessement_type,
                        "level": level_value,
                        "remark": remarks.get(reg_no, ""),
                        "recorded_by": request.user,
                    },
                )
                updated += 1
            except Exception as e:
                logger.exception("Error saving score for %s", reg_no)
                errors.append({"registration_no": reg_no, "error": str(e)})

        return Response(
            {"status": "success" if not errors else "partial", "updated": updated, "errors": errors},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Teaching Progress  →  /api/teacher/teaching-progress/
# ─────────────────────────────────────────────────────────────────────────────

class TeachingProgressAPIView(APIView):
    """
    GET  → list all progress records + available choices for the form.
    POST → create a new progress entry.
           Body: TeachingProgress fields

    Response (GET):
    {
        "progresses": [...],
        "grade_choices": [...],
        "stream_choices": [...],
        "subject_choices": [...]
    }
    """
    permission_classes = [IsAuthenticated]

    def _choices(self, request):
        school_id = request.user.school_id
        teacher = _get_teacher(request.user)
        roles = TeachersRole.objects.filter(school_id=school_id, registration_no=teacher)
        grades   = sorted({r.grade   for r in roles if r.grade})
        streams  = sorted({r.stream  for r in roles if r.stream})
        subjects = sorted({
            s.strip()
            for role in roles if role.subject
            for s in role.subject.split(",") if s.strip()
        })
        return grades, streams, subjects

    def get(self, request):
        school_id = request.user.school_id
        teacher = _get_teacher(request.user)
        
        if not teacher:
            return Response({"detail": "Teacher profile not found."}, status=status.HTTP_404_NOT_FOUND)

        # filters
        f_grade = request.query_params.get("grade", "").strip()
        f_stream = request.query_params.get("stream", "").strip()
        selected_term = request.query_params.get("term", "Term 1")
        year = request.query_params.get("year", timezone.now().year)

        grades, streams, subjects = self._choices(request)
        
        # apply filters to choices for the stats loop
        loop_grades = [f_grade] if f_grade else grades
        loop_streams = [f_stream] if f_stream else streams

        progresses_qs = TeachingProgress.objects.filter(
            school_id=school_id, registration_no=teacher, term=selected_term, year=year
        )
        if f_grade:  progresses_qs = progresses_qs.filter(grade=f_grade)
        if f_stream: progresses_qs = progresses_qs.filter(stream=f_stream)
        progresses = progresses_qs.order_by("-date_of_teaching")
        
        targets_qs = TeachingTarget.objects.filter(
            school_id=school_id, teacher=teacher, term=selected_term, year=year
        )
        if f_grade:  targets_qs = targets_qs.filter(grade=f_grade)
        if f_stream: targets_qs = targets_qs.filter(stream=f_stream)
        
        target_map = {f"{t.grade}-{t.stream}-{t.subject}": t.total_topics for t in targets_qs}

        # --- Include Curriculum Strands for tracking ---
        curriculum_strands = []
        subject_filter = request.query_params.get("subject", "").strip()
        if not subject_filter:
            if progresses.exists():
                subject_filter = progresses.first().subject
            elif subjects:
                subject_filter = subjects[0]

        # Use f_grade if provided, otherwise fallback to first available grade
        g_filter = f_grade if f_grade else (grades[0] if grades else None)

        if subject_filter and g_filter:
            # Fetch strands for the GRADE and SUBJECT, ignoring stream
            curriculum_strands = Strand.objects.filter(
                school_id=school_id, 
                grade__iexact=g_filter, 
                subject__icontains=subject_filter
            ).prefetch_related('sub_strands').distinct()
            
        strands_data = []
        seen_strands = set()
        for s in curriculum_strands:
            if s.name not in seen_strands:
                strands_data.append({
                    "id": s.id,
                    "name": s.name,
                    "sub_strands": [{"id": ss.id, "name": ss.name, "description": ss.description} for ss in s.sub_strands.all()]
                })
                seen_strands.add(s.name)
        # Calculate stats per subject - Always show ALL assigned subjects for the teacher
        subject_stats = []
        for g in grades: # Use full grades list
            for s in streams: # Use full streams list
                class_roles = TeachersRole.objects.filter(
                    school_id=school_id, registration_no=teacher, grade=g, stream=s
                )
                class_subjects = sorted({
                    sub.strip()
                    for role in class_roles if role.subject
                    for sub in role.subject.split(",") if sub.strip()
                })
                
                for sub in class_subjects:
                    s_clean = sub.strip()
                    # Count unique topics (SubStrands) - Super Search
                    curriculum_total = SubStrand.objects.filter(
                        strand__school_id=school_id,
                        strand__grade__iexact=g.strip(),
                        strand__subject__icontains=s_clean
                    ).values('name').distinct().count()

                    # Fallback to manual target if no curriculum uploaded
                    total = curriculum_total if curriculum_total > 0 else target_map.get(f"{g}-{s}-{s_clean}", 0)
                    
                    completed = TeachingProgress.objects.filter(
                        school_id=school_id, registration_no=teacher,
                        grade__iexact=g.strip(), stream=s, subject__iexact=s_clean,
                        term=selected_term, year=year, status="Completed"
                    ).count()
                    
                    percent = (completed / total * 100) if total > 0 else 0
                    subject_stats.append({
                        "grade": g,
                        "stream": s,
                        "subject": sub,
                        "total_topics": total,
                        "completed_topics": completed,
                        "percent": round(percent, 1),
                        "has_curriculum": curriculum_total > 0
                    })

        return Response({
            "progresses": TeachingProgressSerializer(progresses, many=True).data,
            "curriculum_strands": strands_data,
            "subject_stats": subject_stats,
            "grade_choices": grades,
            "stream_choices": streams,
            "subject_choices": subjects,
            "term_choices": ["Term 1", "Term 2", "Term 3"],
            "targets": target_map
        }, status=status.HTTP_200_OK)

    def post(self, request):
        school_instance = _get_school(request.user)
        teacher = _get_teacher(request.user)
        
        if not teacher:
            return Response({"detail": "Teacher profile not found for this account."}, status=status.HTTP_404_NOT_FOUND)
        
        data = request.data.copy()
        # Clean empty strings for dates/integers
        for k, v in data.items():
            if v == "":
                data[k] = None

        # Check if it's a target update
        is_target = data.get("is_target", False)
        if is_target:
            grade = data.get("grade")
            stream = data.get("stream")
            subject = data.get("subject")
            total = data.get("total_topics", 0)
            term = data.get("term", "Term 1")
            year = data.get("year", timezone.now().year)

            if not all([grade, stream, subject]):
                return Response({"detail": "Grade, Stream, and Subject are required for targets."}, status=status.HTTP_400_BAD_REQUEST)

            target, created = TeachingTarget.objects.update_or_create(
                school=school_instance,
                teacher=teacher,
                grade=grade,
                stream=stream,
                subject=subject,
                term=term,
                year=year,
                defaults={"total_topics": int(total) if total else 0}
            )
            return Response({"detail": "Target updated successfully.", "id": target.id})

        # Regular progress entry
        serializer = TeachingProgressSerializer(data=data)
        if serializer.is_valid():
            serializer.save(registration_no=teacher, school=school_instance)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        logger.error("TeachingProgress validation failed: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TeachingProgressDetailAPIView(APIView):
    """
    PUT    /api/teacher/teaching-progress/<pk>/  → update a progress record
    DELETE /api/teacher/teaching-progress/<pk>/  → delete a progress record
    """
    permission_classes = [IsAuthenticated]

    def _get_progress(self, pk, user):
        teacher = _get_teacher(user)
        try:
            return TeachingProgress.objects.get(
                pk=pk, school_id=user.school_id, registration_no=teacher
            )
        except TeachingProgress.DoesNotExist:
            return None

    def put(self, request, pk):
        progress = self._get_progress(pk, request.user)
        if not progress:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TeachingProgressSerializer(progress, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        progress = self._get_progress(pk, request.user)
        if not progress:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        progress.delete()
        return Response({"detail": "Deleted."}, status=status.HTTP_204_NO_CONTENT)




from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count

from core.serializers import LearnerCompetencySerializer, AnnouncementSerializer, ResourceSerializer, LearningLogSerializer,SubStrandSerializer,SubStrandMarkSerializer
import re
class ResourceListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _extract_youtube_id(self, url):
        """
        Helper to extract ID from various YouTube URL formats:
        - https://www.youtube.com/watch?v=VIDEO_ID
        - https://youtu.be/VIDEO_ID
        - https://www.youtube.com/embed/VIDEO_ID
        """
        if not url:
            return url
        
        # Regular expression for YouTube ID extraction
        pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
        match = re.search(pattern, url)
        
        if match:
            return match.group(1)
        return url # Return original if it's already an ID or doesn't match

    def get(self, request):
        resources = Resource.objects.filter(
            school_id=request.user.school_id, 
            recorded_by=request.user
        ).order_by('-created_at')
        
        # Get all unique grades, streams, and subjects from the teacher's roles
        teacher = _get_teacher(request.user)
        roles = TeachersRole.objects.filter(school_id=request.user.school_id, registration_no=teacher)

        grades = sorted(list(set(r.grade for r in roles if r.grade)))
        streams = sorted(list(set(r.stream for r in roles if r.stream)))
        subjects = _subjects_from_roles(roles)
        
        
        serializer = ResourceSerializer(resources, many=True)
        
        return Response({
            "resources": serializer.data,
            "grades": grades,
            "streams": streams,
            "subjects": subjects,
        })

    def post(self, request):
        data = request.data.copy()
        
        
        # User requested to keep the full link instead of extracting ID
        # self._extract_youtube_id logic is preserved but not applied here per request

        serializer = ResourceSerializer(data=data)
        if serializer.is_valid():
            serializer.save(
                school_id=request.user.school_id, 
                recorded_by=request.user
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResourceDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Resource.objects.get(pk=pk, recorded_by=user)
        except Resource.DoesNotExist:
            return None

    def put(self, request, pk):
        resource = self.get_object(pk, request.user)
        if not resource:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ResourceSerializer(resource, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        resource = self.get_object(pk, request.user)
        if not resource:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        resource.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ResourceProgressAPIView(APIView):

    """
    Returns a list of students and their progress for a specific resource.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        logs = LearningLog.objects.filter(resource_id=pk).select_related('student')
        
        # Aggregate data for the header
        stats = logs.aggregate(
            avg_progress=Avg('progress'),
            total_views=Count('id')
        )

        return Response({
            "stats": stats,
            "logs": LearningLogSerializer(logs, many=True).data
        })


# ─────────────────────────────────────────────────────────────────────────────
# teachers announcements 

class AnnouncementAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        announcements = Announcement.objects.filter(
            school_id=request.user.school_id, 
            target_audience="Teachers"
        ).order_by('-created_at')
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)




class LearnerCompetencyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school_id = request.user.school_id
        grade = request.query_params.get('grade')
        stream = request.query_params.get('stream')
        term = request.query_params.get('term')
        competency = request.query_params.get('competency')
        year = request.query_params.get('year', timezone.now().year)

        if not all([grade, stream, competency, term]):
            return Response({"detail": "Missing filter parameters."}, status=400)

        # Get all students in the class
        students = StudentInfo.objects.filter(
            school_id=school_id, grade=grade, stream=stream
        ).order_by('registration_no')

        # Get existing competency records for these students
        existing_records = LearnerCompetency.objects.filter(
            school_id=school_id, grade=grade, stream=stream,
            term=term, competency=competency, year=year
        )

        # Create a mapping of student_id -> {level, comment} for easy frontend lookup
        record_map = {
            rec.student_id: {"level": rec.level, "comment": rec.comment} 
            for rec in existing_records
        }

        return Response({
            "students": StudentInfoSerializer(students, many=True).data,
            "existing_records": record_map,
            "competency_choices": ["Communication", "Collaboration", "Critical Thinking", "Creativity", "Self-efficacy", "Citizenship", "Digital Literacy"]
        })

    def post(self, request):
        school_id = request.user.school_id
        data = request.data
        
        # Expecting: { grade, stream, term, competency, year, assessments: { student_id: { level, comment } } }
        grade = data.get('grade')
        stream = data.get('stream')
        term = data.get('term')
        competency = data.get('competency')
        subject = data.get('subject')
        year = data.get('year', timezone.now().year)
        assessments = data.get('assessments', {})

        updated_count = 0
        errors = []
        for student_id, values in assessments.items():
            level = values.get('level')
            if not level:
                continue  # Skip if no level selected

            # Normalize student identifier to string and resolve to StudentInfo
            sid = str(student_id)
            student = StudentInfo.objects.filter(school_id=school_id, registration_no=sid).first()
            if not student:
                errors.append({"student_id": student_id, "error": "student not found"})
                continue

            try:
                LearnerCompetency.objects.update_or_create(
                    school_id=school_id,
                    student=student,
                    term=term,
                    competency=competency,
                    year=year,
                    subject=subject,
                    defaults={
                        'grade': grade,
                        'stream': stream,
                        'level': level,
                        'comment': values.get('comment', ''),
                        'recorded_by': request.user
                    }
                )
                updated_count += 1
            except Exception as e:
                logger.exception("Error saving learner competency for %s", sid)
                errors.append({"student_id": student_id, "error": str(e)})

        return Response({"detail": f"Successfully updated {updated_count} assessments."}, status=status.HTTP_200_OK)



from ..views.teachers_views import SchoolMixin

# ═══════════════════════════════════════════════════════════════
#  TEACHER LEAVE  — APPLICATION & LIST
#  GET  /teachers/leave/             → admin: all leaves  |  teacher: own leaves
#  POST /teachers/leave/             → teacher applies for leave
# ═══════════════════════════════════════════════════════════════

class TeacherLeaveListView(SchoolMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, 'role', '').lower()
        qs   = TeacherLeave.objects.filter(school_id=self.school_id).select_related('teacher').order_by('-applied_on')

        # Teachers only see their own leave records
        if role == 'teacher':
            qs = qs.filter(teacher__registration_no=request.user.registration_no)

        # Optional filters
        status_filter = request.GET.get('status')
        search        = request.GET.get('search', '').strip()

        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(teacher__first_name__icontains=search) |
                Q(teacher__surname__icontains=search)    |
                Q(teacher__registration_no__icontains=search)
            )

        serializer = TeacherLeaveSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Teacher submits a leave application."""
        role = getattr(request.user, 'role', '').lower()
        if role != 'teacher':
            return Response({'error': 'Only teachers can apply for leave.'}, status=status.HTTP_403_FORBIDDEN)

        teacher = get_object_or_404(TeacherInfo, school_id=self.school_id, registration_no=request.user.registration_no)

        data = request.data.copy()
        data['school']       = self.school_id
        data['teacher']      = teacher.registration_no
        data['status']       = 'Pending'
        data['applied_on']   = timezone.now().date()

        serializer = TeacherLeaveSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LearningAreaMarkAPIView(APIView):
    """
    GET: Fetch students and marks for summative assessments.
    POST: Bulk save/update marks.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school_id = request.user.school_id
        grade = request.query_params.get("grade")
        stream = request.query_params.get("stream")
        learning_area_id = request.query_params.get("learning_area_id")
        term = request.query_params.get("term")
        exam_type = request.query_params.get("exam_type")
        year = request.query_params.get("year", datetime.now().year)

        # 1. Start with all learning areas for the school
        learning_areas_qs = LearningArea.objects.filter(school_id=school_id)
        
        # 2. Filter by grade if possible (permissive match)
        if grade:
            grade_matches = learning_areas_qs.filter(Q(grade_level__iexact=grade) | Q(grade_level__icontains=grade))
            if grade_matches.exists():
                learning_areas_qs = grade_matches

        # 3. Restrict by teacher roles if the user is a teacher
        user_role = getattr(request.user, 'role', '').lower()
        teacher = _get_teacher(request.user)
        
        if user_role == 'teacher':
            if teacher:
                roles = TeachersRole.objects.filter(school_id=school_id, registration_no=teacher)
                if grade and stream:
                    roles = roles.filter(grade__iexact=grade, stream__iexact=stream)
                
                allowed_subject_names = _subjects_from_roles(roles)
                if allowed_subject_names:
                    name_q = Q()
                    for name in allowed_subject_names:
                        name_q |= Q(name__iexact=name.strip())
                    
                    # Apply strict filtering for teachers to avoid showing unassigned subjects
                    learning_areas_qs = learning_areas_qs.filter(name_q)
                else:
                    # No roles/subjects assigned for this specific class
                    learning_areas_qs = learning_areas_qs.none()
            else:
                # User is a teacher but not linked to a teacher profile
                learning_areas_qs = learning_areas_qs.none()

        resp_data = {
            "subjects": [{"id": la.id, "name": la.name, "grade": la.grade_level} for la in learning_areas_qs],
            "students": [],
            "marks": {}
        }

        if grade and stream:
            students = StudentInfo.objects.filter(school_id=school_id, grade=grade, stream=stream).order_by("registration_no")
            resp_data["students"] = StudentInfoSerializer(students, many=True).data
            
            is_class_teacher = True
            if user_role == 'teacher':
                is_class_teacher = TeachersRole.objects.filter(
                    school_id=school_id,
                    registration_no=teacher,
                    grade=grade,
                    stream=stream,
                    type_of_teacher__iexact='Class Teacher'
                ).exists()
            resp_data["is_class_teacher"] = is_class_teacher
            
            if all([learning_area_id, term, exam_type]):
                marks = LearningAreaMark.objects.filter(
                    school_id=school_id, 
                    learning_area_id=learning_area_id,
                    term=term,
                    exam_type=exam_type,
                    year=year
                )
                marks_map = {m.student_id: {"marks": m.marks, "remark": m.remark or ""} for m in marks}
                resp_data["marks"] = marks_map

        return Response(resp_data)

    def post(self, request):
        school_id = request.user.school_id
        data = request.data
        grade = data.get("grade")
        stream = data.get("stream")
        learning_area_id = data.get("learning_area_id")
        term = data.get("term")
        exam_type = data.get("exam_type")
        year = data.get("year", datetime.now().year)
        marks_data = data.get("marks", {}) # {reg_no: marks}

        if not all([grade, stream, learning_area_id, term, exam_type]):
            return Response({"detail": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

        learning_area = get_object_or_404(LearningArea, id=learning_area_id, school_id=school_id)
        
        updated_count = 0
        for reg_no, val in marks_data.items():
            if val is None: continue
            score = val.get('marks') if isinstance(val, dict) else val
            remark = val.get('remark') if isinstance(val, dict) else ""

            if score in [None, ""]: continue
            student = get_object_or_404(StudentInfo, registration_no=reg_no, school_id=school_id)
            LearningAreaMark.objects.update_or_create(
                school_id=school_id,
                student=student,
                learning_area=learning_area,
                term=term,
                exam_type=exam_type,
                year=year,
                defaults={
                    'grade': grade,
                    'stream': stream,
                    'marks': float(score),
                    'remark': remark,
                    'recorded_by': request.user
                }
            )
            updated_count += 1

        return Response({"detail": f"Successfully updated {updated_count} records."}, status=status.HTTP_200_OK)


class RubricExtractAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        subject = request.data.get('subject')
        
        if not file_obj or not subject:
            return Response({"detail": "File and subject are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            extracted_data = extract_strands_from_file(file_obj, subject)
            return Response({"extracted_data": extracted_data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StrandBulkCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        school_instance = _get_school(request.user)
        subject = request.data.get('subject')
        grade = request.data.get('grade')
        stream = request.data.get('stream')
        strands_data = request.data.get('strands', [])

        if not subject or not grade:
            return Response({"detail": "Subject and grade are required."}, status=status.HTTP_400_BAD_REQUEST)

        created_strands = 0
        created_sub_strands = 0

        for s_data in strands_data:
            strand_obj = Strand.objects.create(
                school=school_instance,
                subject=subject,
                grade=grade,
                name=s_data['strand'],
                description=s_data.get('description', ''),
                created_by=request.user
            )
            created_strands += 1

            for sub_data in s_data.get('sub_strands', []):
                # Join multiple outcomes with newlines into the description field
                outcomes = sub_data.get('expected_outcomes', [])
                description = "\n".join([f"• {o}" for o in outcomes]) if outcomes else sub_data.get('description', '')
                
                SubStrand.objects.create(
                    strand=strand_obj,
                    name=sub_data['name'],
                    description=description,
                    created_by=request.user
                )
                created_sub_strands += 1

        return Response({
            "detail": f"Successfully created {created_strands} strands and {created_sub_strands} topics."
        }, status=status.HTTP_201_CREATED)

class ProgressExtractAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        subject = request.data.get('subject')
        
        if not file_obj or not subject:
            return Response({"detail": "File and subject are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            extracted_data = extract_teaching_progress_from_file(file_obj, subject)
            return Response({"extracted_data": extracted_data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProgressBulkCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        school_instance = _get_school(request.user)
        teacher = _get_teacher(request.user)
        subject = request.data.get('subject')
        grade = request.data.get('grade')
        stream = request.data.get('stream')
        term = request.data.get('term', 'Term 1')
        year = request.data.get('year', timezone.now().year)
        progresses = request.data.get('progresses', [])

        if not teacher:
            return Response({"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND)

        created_count = 0
        for p_data in progresses:
            # Parse date if provided
            teaching_date = p_data.get('date_of_teaching')
            if not teaching_date:
                teaching_date = timezone.now()

            TeachingProgress.objects.create(
                registration_no=teacher,
                school=school_instance,
                grade=grade,
                stream=stream,
                subject=subject,
                term=term,
                year=year,
                topic=p_data.get('topic'),
                sub_topic=p_data.get('sub_topic'),
                status=p_data.get('status', 'Completed'),
                date_of_teaching=teaching_date
            )
            created_count += 1

        return Response({"detail": f"Successfully recorded {created_count} progress entries."}, status=status.HTTP_201_CREATED)

class ReportCardCommentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school_id = request.user.school_id
        student_id = request.query_params.get('student_id')
        term = request.query_params.get('term')
        year = request.query_params.get('year', timezone.now().year)

        if not student_id or not term:
            return Response({"detail": "Missing parameters."}, status=400)

        comment = ReportCardComment.objects.filter(
            school_id=school_id,
            student_id=student_id,
            term=term,
            year=year
        ).first()

        is_class_teacher = True
        if request.user.role == 'Teacher':
            from core.models import TeacherInfo, TeachersRole, StudentInfo
            teacher_info = TeacherInfo.objects.filter(phone=request.user.username, school_id=school_id).first()
            student = StudentInfo.objects.filter(registration_no=student_id, school_id=school_id).first()
            
            is_class_teacher = False
            if teacher_info and student:
                is_class_teacher = TeachersRole.objects.filter(
                    registration_no=teacher_info,
                    grade=student.grade,
                    stream=student.stream,
                    type_of_teacher__iexact='Class Teacher'
                ).exists()

        data = {
            "class_teacher_comment": comment.class_teacher_comment if comment else "",
            "headteacher_comment": comment.headteacher_comment if comment else "",
            "is_class_teacher": is_class_teacher
        }
        return Response(data)

    def post(self, request):
        school_id = request.user.school_id
        data = request.data
        student_id = data.get('student_id')
        term = data.get('term')
        year = data.get('year', timezone.now().year)
        
        if not student_id or not term:
            return Response({"detail": "Missing parameters."}, status=400)

        comment_obj, _ = ReportCardComment.objects.get_or_create(
            school_id=school_id,
            student_id=student_id,
            term=term,
            year=year
        )

        if request.user.role == 'Teacher':
            from core.models import TeacherInfo, TeachersRole, StudentInfo
            teacher_info = TeacherInfo.objects.filter(phone=request.user.username, school_id=school_id).first()
            student = StudentInfo.objects.filter(registration_no=student_id, school_id=school_id).first()
            
            is_class_teacher = False
            if teacher_info and student:
                is_class_teacher = TeachersRole.objects.filter(
                    registration_no=teacher_info,
                    grade=student.grade,
                    stream=student.stream,
                    type_of_teacher__iexact='Class Teacher'
                ).exists()
            
            if not is_class_teacher:
                return Response({"detail": "You must be the assigned class teacher for this grade and stream to review this student."}, status=403)

        if request.user.role in ['SystemOwner', 'Admin', 'HeadTeacher']:
            if 'headteacher_comment' in data:
                comment_obj.headteacher_comment = data.get('headteacher_comment')

        if request.user.role in ['Teacher', 'Class Teacher', 'SystemOwner', 'Admin']:
            if 'class_teacher_comment' in data:
                comment_obj.class_teacher_comment = data.get('class_teacher_comment')

        comment_obj.save()
        return Response({"detail": "Comment saved successfully."})
