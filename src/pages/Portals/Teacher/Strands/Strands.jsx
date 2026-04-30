import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Row, Col, Modal, Form, Spinner,
  Stack, Button, Dropdown, ListGroup, Accordion
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Strands.css';

/* ─── tiny icon helpers (no extra dep) ─────── */
const Icon = ({ name }) => {
  const icons = {
    plus: '+',
    edit: '✎',
    trash: '⌫',
    chart: '◈',
    scores: '⊞',
    report: '⊟',
    view: '◉',
    back: '←',
    save: '✓',
    summative: '⊕',
    warn: '⚠',
    attendance: '👥',
    completed: '🏆',
    performance: '📊',
    trend: '📈',
    participation: '◔',
    dashboard: '⊞',
    strands: '📚',
    add: '✚',
  };
  return <span style={{ fontStyle: 'normal', fontSize: '1.1em' }}>{icons[name] || ''}</span>;
};

/* ─── Level badge ───────────────────────────── */
const LevelBadge = ({ level }) => {
  if (!level) return null;
  const numericLevel = typeof level === 'string' ? parseInt(level.replace(/\D/g, '')) : level;
  const cls = `l${numericLevel}`;
  return <span className={`str-level-badge ${cls}`}>Level {numericLevel}</span>;
};

export default function TeacherStrandPortal() {
  const { showMessage } = useMessage();
  const navigate = useNavigate();
  const [view, setView]         = useState('dashboard'); // 'dashboard', 'list', 'detail', 'scoring'
  const [loading, setLoading]   = useState(true);
  const [dashboardData, setDashboardData] = useState({ strands: [], subjects: [], assigned_subjects: [], grades: [], streams: [] });
  const [portalStats, setPortalStats]     = useState(null);
  const [activeSubStrand, setActiveSubStrand] = useState(null);
  const [selectedStrandId, setSelectedStrandId]   = useState(null);
  const [selectedSubject, setSelectedSubject]     = useState('');
  const [isEditingSub, setIsEditingSub]           = useState(false);
  const [isEditingStrand, setIsEditingStrand]     = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', grade: '', stream: '', description: '' });
  const [showStrandModal, setShowStrandModal]       = useState(false);
  const [showSubStrandModal, setShowSubStrandModal] = useState(false);
  const [showRecordModal, setShowRecordModal]       = useState(false);
  const [showReportModal, setShowReportModal]       = useState(false);
  const [showConfirmDelete, setShowConfirmDelete]   = useState(false);
  const [recordPayload, setRecordPayload] = useState({ term: 'Term 1', assessement_type: 'Class Work', out_of: 100 });
  const [recordData, setRecordData]       = useState({ students: [], scores: {}, remarks: {}, raws: {}, levels: {} });
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [showSummativeModal, setShowSummativeModal] = useState(false);
  const [summativePayload, setSummativePayload] = useState({ grade: '', stream: '', learning_area_id: '', term: 'Term 1', exam_type: 'Opener', year: new Date().getFullYear() });
  const [summativeData, setSummativeData]     = useState({ students: [], marks: {}, subjects: [] });
  const [isSavingSummative, setIsSavingSummative]   = useState(false);
  const [isLoadingSummative, setIsLoadingSummative] = useState(false);
  const [sSearch, setSSearch]                       = useState('');

  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioData, setPortfolioData] = useState({ evidence_type: 'Project', description: '', file: null });
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);
  const [studentPortfolios, setStudentPortfolios] = useState([]);

  const [showNationalModal, setShowNationalModal] = useState(false);
  const [nationalStudents, setNationalStudents] = useState([]);
  const [nationalMarks, setNationalMarks]       = useState({}); // { student_id: { marks: '', overall_level: 3, remark: '' } }
  const [nationalConfig, setNationalConfig]     = useState({ assessment_type: 'KPSEA', year: new Date().getFullYear() });
  const [nationalSearch, setNationalSearch]     = useState('');
  const [isSavingNational, setIsSavingNational] = useState(false);
  
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [rubricFile, setRubricFile] = useState(null);
  const [extractedStrands, setExtractedStrands] = useState([]);
  const [rubricSubject, setRubricSubject] = useState('');
  const [rubricGrade, setRubricGrade] = useState('');
  const [rubricStream, setRubricStream] = useState('');

  const [gradeFilter, setGradeFilter]     = useState('');
  const [streamFilter, setStreamFilter]   = useState('');
  const [enlargedSubject, setEnlargedSubject] = useState(null);

  const [showClassListModal, setShowClassListModal] = useState(false);
  const [classListStudents, setClassListStudents] = useState([]);
  const [classListLoading, setClassListLoading] = useState(false);
  const [classListSearch, setClassListSearch] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewStudent, setSelectedReviewStudent] = useState(null);
  const [classTeacherComment, setClassTeacherComment] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isClassTeacher, setIsClassTeacher] = useState(true);
  const [isClassTeacherOfSelectedClass, setIsClassTeacherOfSelectedClass] = useState(true);
  const [reviewTerm, setReviewTerm] = useState('Term 1');
  const [reviewYear, setReviewYear] = useState(new Date().getFullYear());
  const [reviewSystem, setReviewSystem] = useState('cba'); // 'cba' | 'summative'
  const [reviewPerformanceData, setReviewPerformanceData] = useState({ cbc: null, summative: null });
  const [isFetchingReviewData, setIsFetchingReviewData] = useState(false);

  /* ── fetch ──────────────────────────────────── */
  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await api.get('teacher-portal/dashboard/', {
        params: { grade: gradeFilter, stream: streamFilter }
      });
      setPortalStats(res.data);
    } catch {
      showMessage({ type: 'error', text: 'Failed to refresh analytics.' });
    }
  }, [gradeFilter, streamFilter, showMessage]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [strandsRes, statsRes] = await Promise.all([
        api.get('teacher-portal/strands/'),
        api.get('teacher-portal/dashboard/', { params: { grade: gradeFilter, stream: streamFilter } })
      ]);
      setDashboardData(strandsRes.data);
      setPortalStats(statsRes.data);
    } catch {
      showMessage({ type: 'error', text: 'Failed to load teacher portal data.' });
    } finally {
      setLoading(false);
    }
  }, [showMessage, gradeFilter, streamFilter]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // When filters change while on dashboard, refresh stats
  useEffect(() => {
    if (view === 'dashboard' && !loading) {
      fetchDashboardStats();
    }
  }, [gradeFilter, streamFilter, view]); // eslint-disable-line

  const filteredStrands = useMemo(() => {
    return (dashboardData.strands || []).filter(s => {
      const matchGrade = !gradeFilter || s.grade === gradeFilter;
      const matchStream = !streamFilter || s.stream === streamFilter;
      return matchGrade && matchStream;
    });
  }, [dashboardData.strands, gradeFilter, streamFilter]);

  const subjectsGrouped = useMemo(() => {
    const g = {};
    const assigned = dashboardData.assigned_subjects || [];
    let subjectsToInitialize = [];

    if (!gradeFilter && !streamFilter) {
      // Show all subjects assigned to the teacher
      subjectsToInitialize = dashboardData.subjects || [];
    } else if (assigned.length > 0) {
      // Filter subjects based on grade/stream assignment
      subjectsToInitialize = Array.from(new Set(
        assigned.filter(as => {
          const matchGrade = !gradeFilter || as.grade === gradeFilter;
          const matchStream = !streamFilter || as.stream === streamFilter;
          return matchGrade && matchStream;
        }).map(as => as.subject)
      ));
    } else {
      // Fallback for when assigned_subjects is not yet loaded or empty:
      // Show subjects that have strands matching the current filter
      subjectsToInitialize = Array.from(new Set(filteredStrands.map(s => s.subject || 'Unspecified')));
    }

    subjectsToInitialize.forEach(sub => { g[sub] = []; });
    
    filteredStrands.forEach(s => {
      const key = s.subject || 'Unspecified';
      if (!g[key]) g[key] = [];
      g[key].push(s);
    });

    return g;
  }, [filteredStrands, dashboardData.subjects, dashboardData.assigned_subjects, gradeFilter, streamFilter]);

  /* stats for header pills */
  const stats = useMemo(() => {
    const subjects = Object.keys(subjectsGrouped).length;
    const strands  = filteredStrands.length;
    const topics   = filteredStrands.reduce((a, s) => a + (s.sub_strands?.length || 0), 0) || 0;
    return { subjects, strands, topics };
  }, [subjectsGrouped, filteredStrands]);

  const hasTransitionGrade = useMemo(() => {
    if (!gradeFilter) return false;
    const match = gradeFilter.match(/\d+/);
    if (!match) return false;
    const num = parseInt(match[0]);
    return num === 6 || num === 9;
  }, [gradeFilter]);

  const getCBCLevel = useCallback((pct) => {
    if (pct === '' || pct == null || isNaN(Number(pct))) return '';
    const p = Number(pct);
    if (p >= 80) return 4; if (p >= 60) return 3; if (p >= 40) return 2; return 1;
  }, []);

  const getCBCRemark = useCallback((pct) => {
    if (pct === '' || pct == null || isNaN(Number(pct))) return '';
    const p = Number(pct);
    if (p >= 80) return "Excellent";
    if (p >= 60) return "Very Good";
    if (p >= 40) return "Good";
    return "Fair";
  }, []);

  /* ── load scores ─────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!showRecordModal || !activeSubStrand) return;
      try {
        const res = await api.get(`teacher-portal/sub-strands/${activeSubStrand.id}/scores/${activeSubStrand.grade}/${activeSubStrand.stream}/?term=${recordPayload.term}`);
        if (!cancelled) setRecordData({ students: res.data.students || [], scores: res.data.scores || {}, remarks: res.data.remarks || res.data.remark || {}, raws: res.data.raw_marks || {}, levels: res.data.levels || {} });
      } catch { if (!cancelled) setRecordData({ students: [], scores: {}, remarks: {}, raws: {}, levels: {} }); }
    };
    load();
    return () => { cancelled = true; };
  }, [showRecordModal, activeSubStrand, recordPayload.term]);

  useEffect(() => {
    if (!showRecordModal) return;
    const raws = recordData.raws || {};
    const newScores = { ...recordData.scores }; 
    const newLevels = { ...recordData.levels };
    const newRemarks = { ...recordData.remarks };
    Object.keys(raws).forEach(reg => {
      const raw = raws[reg];
      if (raw === '' || raw == null || recordPayload.out_of === 0) { 
        newScores[reg] = ''; 
        newLevels[reg] = ''; 
        newRemarks[reg] = ''; 
      } else { 
        const p = Number(((raw / recordPayload.out_of) * 100).toFixed(2)); 
        newScores[reg] = p; 
        newLevels[reg] = getCBCLevel(p); 
        newRemarks[reg] = getCBCRemark(p); 
      }
    });
    setRecordData(prev => ({ ...prev, scores: newScores, levels: newLevels, remarks: newRemarks }));
  }, [recordPayload.out_of, recordData.raws, showRecordModal, getCBCLevel, getCBCRemark]);

  /* ── summative ────────────────────────────────── */
  useEffect(() => {
    if (!showSummativeModal || !summativePayload.grade || !summativePayload.stream) return;
    const fetchSummativeData = async () => {
      setIsLoadingSummative(true);
      try {
        const res = await api.get(`teacher-portal/learning-area-marks/?grade=${summativePayload.grade}&stream=${summativePayload.stream}&learning_area_id=${summativePayload.learning_area_id}&term=${summativePayload.term}&exam_type=${summativePayload.exam_type}&year=${summativePayload.year}`);
        setSummativeData({ subjects: res.data.subjects || [], students: res.data.students || [], marks: res.data.marks || {} });
      } catch { setSummativeData(prev => ({ ...prev, students: [], marks: {} })); }
      finally { setIsLoadingSummative(false); }
    };
    fetchSummativeData();
  }, [showSummativeModal, summativePayload.grade, summativePayload.stream, summativePayload.learning_area_id, summativePayload.term, summativePayload.exam_type, summativePayload.year]);

  /* ── national students & existing marks ──────── */
  useEffect(() => {
    if (!showNationalModal || !gradeFilter || !streamFilter) return;
    const loadNationalData = async () => {
      try {
        const [studentsRes, marksRes] = await Promise.all([
          api.get(`teacher-portal/learning-area-marks/?grade=${gradeFilter}&stream=${streamFilter}`),
          api.get(`teacher-portal/national-assessments/?grade=${gradeFilter}&stream=${streamFilter}`)
        ]);
        
        const pupils = studentsRes.data.students || [];
        setNationalStudents(pupils);
        
        // Map existing marks to the state
        const existing = {};
        (marksRes.data || []).forEach(m => {
           if (m.assessment_type === nationalConfig.assessment_type && m.year === Number(nationalConfig.year)) {
             existing[m.student] = { marks: m.marks, overall_level: m.overall_level, remark: m.remark };
           }
        });
        setNationalMarks(existing);
      } catch { 
        setNationalStudents([]); 
        setNationalMarks({});
      }
    };
    loadNationalData();
  }, [showNationalModal, gradeFilter, streamFilter, nationalConfig.assessment_type, nationalConfig.year]);

  /* ── handlers ────────────────────────────────── */
  const fetchClassList = async () => {
    if (!gradeFilter || !streamFilter) {
      showMessage({ type: 'warning', text: 'Please select a Grade and Stream first to view the class list.' });
      return;
    }
    setClassListLoading(true);
    setShowClassListModal(true);
    try {
      const res = await api.get(`teacher-portal/learning-area-marks/?grade=${gradeFilter}&stream=${streamFilter}`);
      setClassListStudents(res.data.students || []);
      setIsClassTeacherOfSelectedClass(res.data.is_class_teacher !== false);
    } catch {
      showMessage({ type: 'error', text: 'Failed to load class list.' });
      setShowClassListModal(false);
    } finally {
      setClassListLoading(false);
    }
  };

  const handleOpenReview = async (student) => {
    setSelectedReviewStudent(student);
    setClassTeacherComment('');
    setReviewPerformanceData({ cbc: null, summative: null });
    setShowReviewModal(true);
    setIsFetchingReviewData(true);
    try {
      const [commentRes, cbcRes, summativeRes] = await Promise.allSettled([
        api.get(`teacher-portal/report-comments/?student_id=${student.registration_no}&term=${reviewTerm}&year=${reviewYear}`),
        api.get(`academics/cbc/student/${student.registration_no}/strands/?term=${reviewTerm}&year=${reviewYear}&aggregate=true`),
        api.get(`students/${student.registration_no}/academics/?term=${reviewTerm}&year=${reviewYear}`)
      ]);
      
      if (commentRes.status === 'fulfilled' && commentRes.value.data) {
        setClassTeacherComment(commentRes.value.data.class_teacher_comment || '');
        setIsClassTeacher(commentRes.value.data.is_class_teacher !== false);
      }
      
      const cbcRaw = cbcRes.status === 'fulfilled' ? cbcRes.value.data : null;
      const cbcData = Array.isArray(cbcRaw) ? cbcRaw : (cbcRaw?.marks || cbcRaw?.overall_competencies || cbcRaw?.competencies || null);
      
      const summativeRaw = summativeRes.status === 'fulfilled' ? summativeRes.value.data : null;
      const summativeData = summativeRaw?.marks || null;
      
      setReviewPerformanceData({ cbc: cbcData, summative: summativeData });
      
    } catch (err) {
      console.error('Error fetching review data', err);
    } finally {
      setIsFetchingReviewData(false);
    }
  };

  const handleSaveReview = async () => {
    setIsSavingReview(true);
    try {
      await api.post(`teacher-portal/report-comments/`, {
        student_id: selectedReviewStudent.registration_no,
        term: reviewTerm,
        year: reviewYear,
        class_teacher_comment: classTeacherComment
      });
      showMessage({ type: 'success', text: 'Class teacher comment saved successfully!' });
      setShowReviewModal(false);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to save comment.';
      showMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleCreateStrand = async (e) => {
    e.preventDefault();
    try {
      if (isEditingStrand && selectedStrandId) {
        await api.put(`teacher-portal/strands/${selectedStrandId}/`, { ...formData, subject: selectedSubject });
        showMessage({ type: 'success', text: 'Strand updated.' });
      } else {
        await api.post('teacher-portal/strands/', { ...formData, subject: selectedSubject });
        showMessage({ type: 'success', text: 'Strand created.' });
      }
      setShowStrandModal(false); setIsEditingStrand(false); setSelectedStrandId(null);
      setFormData({ name: '', subject: '', grade: '', stream: '', description: '' });
      fetchInitialData();
    } catch { showMessage({ type: 'error', text: isEditingStrand ? 'Error updating strand.' : 'Error creating strand.' }); }
  };

  const handleSubStrandSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingSub) { await api.put(`teacher-portal/sub-strands/${activeSubStrand.id}/`, { name: formData.name, description: formData.description }); showMessage({ type: 'success', text: 'Topic updated.' }); }
      else { const strand = dashboardData.strands.find(s => s.id === selectedStrandId); await api.post(`teacher-portal/strands/${selectedStrandId}/sub-strands/${strand.grade}/${strand.stream}/`, { name: formData.name, description: formData.description }); showMessage({ type: 'success', text: 'Topic added.' }); }
      setShowSubStrandModal(false); setIsEditingSub(false); setFormData({ name: '', description: '' }); fetchInitialData();
    } catch { showMessage({ type: 'error', text: 'Action failed.' }); }
  };

  const handleSaveRecord = async () => {
    if (!activeSubStrand) return;
    setIsSavingRecord(true);
    try {
      await api.post(`teacher-portal/sub-strands/${activeSubStrand.id}/scores/${activeSubStrand.grade}/${activeSubStrand.stream}/`, { term: recordPayload.term, assessement_type: recordPayload.assessement_type, out_of: recordPayload.out_of, scores: recordData.scores, raw_marks: recordData.raws || {}, levels: recordData.levels || {}, remarks: recordData.remarks, remark: recordData.remarks });
      showMessage({ type: 'success', text: 'Scores saved' }); setShowRecordModal(false); fetchInitialData();
    } catch { showMessage({ type: 'error', text: 'Failed to save scores' }); }
    finally { setIsSavingRecord(false); }
  };

  const performDeleteTarget = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'substrand') await api.delete(`teacher-portal/sub-strands/${deleteTarget.id}/`);
      else await api.delete(`teacher-portal/strands/${deleteTarget.id}/`);
      setShowConfirmDelete(false); setDeleteTarget(null); fetchInitialData(); showMessage({ type: 'success', text: 'Deleted successfully' });
    } catch { showMessage({ type: 'error', text: 'Delete failed' }); }
  };

  const handleDownloadSubjectReport = async (subjectName, format) => {
    try {
      const strand = dashboardData.strands.find(s => s.subject === subjectName);
      if (!strand) { showMessage({ type: 'warning', text: 'No grade/stream associated with this subject yet.' }); return; }
      const url = `teacher-portal/reports/subject-aggregated/?subject=${encodeURIComponent(subjectName)}&grade=${encodeURIComponent(strand.grade)}&stream=${encodeURIComponent(strand.stream)}&format=${format}`;
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Subject_Performance_${subjectName}_${strand.grade}.${format}`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch { showMessage({ type: 'error', text: 'Error generating report.' }); }
  };

  const handleDownloadLearningAreaReport = async (subjectName, format, laId = null) => {
    try {
      let strand = null;
      if (!laId) {
        strand = dashboardData.strands.find(s => s.subject === subjectName);
        if (!strand) { showMessage({ type: 'warning', text: 'No grade/stream associated with this subject yet.' }); return; }
      }
      
      const g = laId ? summativePayload.grade : strand.grade;
      const s = laId ? summativePayload.stream : strand.stream;

      const url = `teacher-portal/reports/learning-area-marks/?subject=${encodeURIComponent(subjectName)}&grade=${encodeURIComponent(g)}&stream=${encodeURIComponent(s)}&format=${format}${laId ? `&learning_area_id=${laId}` : ''}`;
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Summative_Marks_${subjectName}_${g}.${format}`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch { showMessage({ type: 'error', text: 'Error generating summative report.' }); }
  };

  const handleDownloadSubStrandReport = async (subStrand, format) => {
    try {
      const url = `teacher-portal/reports/substrand/?sub_strand_id=${subStrand.id}&grade=${encodeURIComponent(subStrand.grade)}&stream=${encodeURIComponent(subStrand.stream)}&format=${format}`;
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Topic_Report_${subStrand.name}_${subStrand.grade}.${format}`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch { showMessage({ type: 'error', text: 'Error generating topic report.' }); }
  };

  const handleSavePortfolio = async () => {
    if (!activeSubStrand || !portfolioData.file) return;
    setIsSavingPortfolio(true);
    const fd = new FormData();
    fd.append('student', activeSubStrand.student_id);
    fd.append('sub_strand', activeSubStrand.id);
    fd.append('term', recordPayload.term);
    fd.append('evidence_file', portfolioData.file);
    fd.append('evidence_type', portfolioData.evidence_type);
    fd.append('description', portfolioData.description);

    try {
      await api.post('teacher-portal/learner-portfolio/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showMessage({ type: 'success', text: 'Evidence uploaded to portfolio.' });
      setShowPortfolioModal(false);
      setPortfolioData({ evidence_type: 'Project', description: '', file: null });
    } catch {
      showMessage({ type: 'error', text: 'Upload failed.' });
    } finally {
      setIsSavingPortfolio(false);
    }
  };

  const handleSaveNational = async () => {
    setIsSavingNational(true);
    try {
      const payload = Object.entries(nationalMarks).map(([sid, data]) => ({
        student: sid,
        assessment_type: nationalConfig.assessment_type,
        year: nationalConfig.year,
        ...data
      })).filter(x => x.marks !== '' || x.remark !== '');
      
      if (payload.length === 0) {
        showMessage({ type: 'info', text: 'No marks entered to save.' });
        return;
      }

      await api.post('teacher-portal/national-assessments/', payload);
      showMessage({ type: 'success', text: 'National assessment results saved!' });
      setShowNationalModal(false);
    } catch { 
      showMessage({ type: 'error', text: 'Failed to save national results.' }); 
    } finally {
      setIsSavingNational(false);
    }
  };

  const handleRubricExtract = async () => {
    if (!rubricFile) return;
    setIsExtracting(true);
    const fd = new FormData();
    fd.append('file', rubricFile);
    fd.append('subject', rubricSubject);
    fd.append('grade', rubricGrade);
    fd.append('stream', rubricStream);

    try {
      const res = await api.post('teacher-portal/strands/extract-rubric/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedStrands(res.data.extracted_data || []);
      showMessage({ type: 'success', text: 'Strands identified successfully!' });
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Failed to extract strands. Please try again.' });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveExtractedStrands = async () => {
    try {
      await api.post('teacher-portal/strands/bulk-create/', {
        subject: rubricSubject,
        grade: rubricGrade,
        stream: rubricStream,
        strands: extractedStrands
      });
      showMessage({ type: 'success', text: 'Strands and topics saved!' });
      setShowRubricModal(false);
      fetchInitialData();
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to save strands.' });
    }
  };

  /* ── Loader ──────────────────────────────────── */
  if (loading && (view === 'list' || view === 'dashboard')) return (
    <div className="str-portal-root str-loader-wrap">
      <div className="str-spinner" />
      <p style={{ color: 'var(--t-text-muted)', fontSize: '0.85rem', margin: 0 }}>Loading portal data…</p>
    </div>
  );

  /* ─────────────────────── RENDER ─────────────── */
  return (
    <div className="str-portal-root t-page">

      {/* ── DASHBOARD VIEW ───────────────────────── */}
      {view === 'dashboard' && portalStats && (
        <Container className="str-dashboard-animate">
          <div className="str-page-header">
            <div>
              <h2 className="str-page-title">
                Teacher <span>Dashboard</span>
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--t-text-muted)', marginTop: 2 }}>
                Detailed performance and academic overview
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className="str-filters d-flex gap-2 me-2">
                <Form.Select 
                  size="sm" 
                  className="str-filter-select" 
                  value={gradeFilter} 
                  onChange={e => setGradeFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: '100px' }}
                >
                  <option value="">All Grades</option>
                  {dashboardData.grades?.map(g => <option key={g} value={g}>{g}</option>)}
                </Form.Select>
                <Form.Select 
                  size="sm" 
                  className="str-filter-select" 
                  value={streamFilter} 
                  onChange={e => setStreamFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: '100px' }}
                >
                  <option value="">All Streams</option>
                  {dashboardData.streams?.map(s => <option key={s} value={s}>{s}</option>)}
                </Form.Select>
              </div>

               <button className="str-btn str-btn-primary" onClick={() => setView('list')}>
                <Icon name="strands" /> Subject Management
              </button>
            </div>
          </div>

          <Row className="mb-4">
            <Col lg={3} md={6}>
              <div className="str-stat-card card-att">
                <div className="ssc-icon"><Icon name="attendance" /></div>
                <div className="ssc-body">
                  <span className="ssc-label">Today's Attendance</span>
                  <h3 className="ssc-value">{portalStats.present_today} / {portalStats.total_students}</h3>
                  <div className="ssc-progress"><div className="ssc-bar" style={{ width: `${(portalStats.present_today / portalStats.total_students * 100) || 0}%` }}></div></div>
                </div>
              </div>
            </Col>
            <Col lg={3} md={6}>
              <div className="str-stat-card card-progress">
                <div className="ssc-icon"><Icon name="completed" /></div>
                <div className="ssc-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="ssc-label">Curriculum Progress</span>
                    <button className="ssc-view-btn" onClick={() => navigate('/teachers-portal/teachingprogress')}>View All</button>
                  </div>
                  <div className="ssc-subject-mini-list">
                    {portalStats.subject_progress?.slice(0, 3).map((sp, idx) => (
                      <div key={idx} className="ssc-mini-row">
                        <div className="ssc-mini-info">
                          <span>{sp.subject}</span>
                          <small>{sp.percent}%</small>
                        </div>
                        <div className="ssc-mini-progress">
                          <div className="ssc-mini-bar" style={{ width: `${sp.percent}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {(!portalStats.subject_progress || portalStats.subject_progress.length === 0) && (
                      <p className="ssc-empty">No progress data yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={6}>
              <div className="str-stat-card card-welcome">
                <div className="ssc-body">
                  <h4 style={{ margin: 0, fontWeight: 700 }}>Hello, {portalStats.teacher?.first_name || 'Teacher'}!</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                    You are managing {portalStats.subjects?.length} subjects across {dashboardData.grades?.length} grades.
                  </p>
                  <div className="mt-3 d-flex gap-2">
                    <button className="str-btn str-btn-ghost btn-sm" onClick={() => setShowSummativeModal(true)}>Record Marks</button>
                    <button className="str-btn str-btn-ghost btn-sm" onClick={() => setView('list')}>Manage Topics</button>
                    {hasTransitionGrade && (
                      <button className="str-btn str-btn-ghost btn-sm" onClick={() => setShowNationalModal(true)}>National (KPSEA/KESSA)</button>
                    )}
                    <button className="str-btn str-btn-ghost btn-sm" onClick={fetchClassList}>Class Remarks</button>
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          <Row>
            <Col lg={8}>
              <div className="str-glass-card mb-4">
                <div className="sgc-header">
                  <h5 className="mb-0">Subject Performance Overview</h5>
                  <Icon name="performance" />
                </div>
                <div className="sgc-body">
                  <div className="perf-grid">
                    {portalStats.performance?.map(p => (
                      <div key={p.subject} className="perf-item">
                        <div className="perf-info">
                          <span className="perf-name">{p.subject}</span>
                          <span className="perf-val">{p.summative_avg}% Avg</span>
                        </div>
                        <div className="perf-bar-wrap">
                          <div className="perf-bar formative" style={{ width: `${p.formative_avg}%` }} title="Formative Score"></div>
                          <div className="perf-bar summative" style={{ width: `${p.summative_avg}%` }} title="Summative Score"></div>
                        </div>
                        <div className="perf-labels">
                          <span>Formative: {p.formative_avg}%</span>
                          <span>Summative: {p.summative_avg}%</span>
                        </div>
                      </div>
                    ))}
                    {portalStats.performance?.length === 0 && (
                      <div className="text-center py-5 text-muted">No performance data available yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="str-glass-card">
                <div className="sgc-header">
                  <h5 className="mb-0">Attendance Trend (Last 14 Days)</h5>
                  <Icon name="trend" />
                </div>
                <div className="sgc-body p-0">
                  <div className="trend-viz">
                    {portalStats.attendance_trend?.map((t, idx) => (
                      <div key={idx} className="trend-col">
                        <div className="trend-bar" style={{ height: `${t.rate || 0}%` }}>
                          <div className="trend-tooltip">{t.date}: {t.rate?.toFixed(1)}%</div>
                        </div>
                        <span className="trend-date">{new Date(t.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Col>

            <Col lg={4}>
              <div className="str-glass-card h-100">
                <div className="sgc-header">
                  <h5 className="mb-0">Termly Participation</h5>
                  <Icon name="participation" />
                </div>
                <div className="sgc-body">
                  {Object.entries(portalStats.attendance_by_term || {}).map(([term, rate]) => (
                    <div key={term} className="term-stat-row">
                      <div className="tsr-info">
                        <span>{term}</span>
                        <strong>{rate ? `${rate.toFixed(1)}%` : '—'}</strong>
                      </div>
                      <div className="tsr-circle-wrap">
                         <svg viewBox="0 0 36 36" className="circular-chart">
                          <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="circle" strokeDasharray={`${rate || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      )}

      {/* ── SUBJECT LIST VIEW ────────────────────── */}
      {view === 'list' && (
        <Container>
          {/* Header */}
          <div className="str-page-header">
            <div>
              <h2 className="str-page-title">
                Subject <span>Management</span>
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--t-text-muted)', marginTop: 2 }}>
                CBC curriculum tracker — strands, topics & assessments
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              
              <div className="str-filters d-flex gap-2 me-2">
                <Form.Select 
                  size="sm" 
                  className="str-filter-select" 
                  value={gradeFilter} 
                  onChange={e => setGradeFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: '100px' }}
                >
                  <option value="">All Grades</option>
                  {dashboardData.grades?.map(g => <option key={g} value={g}>{g}</option>)}
                </Form.Select>
                <Form.Select 
                  size="sm" 
                  className="str-filter-select" 
                  value={streamFilter} 
                  onChange={e => setStreamFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: '100px' }}
                >
                  <option value="">All Streams</option>
                  {dashboardData.streams?.map(s => <option key={s} value={s}>{s}</option>)}
                </Form.Select>
              </div>

              <div className="str-stat-row">
                <div className="str-stat-pill"><span className="spv">{stats.subjects}</span><span className="spl">Subjects</span></div>
                <div className="str-stat-pill"><span className="spv">{stats.strands}</span><span className="spl">Strands</span></div>
                <div className="str-stat-pill"><span className="spv">{stats.topics}</span><span className="spl">Topics</span></div>
              </div>
              <button className="str-btn str-btn-secondary" onClick={() => setView('dashboard')}>
                <Icon name="dashboard" /> Dashboard
              </button>
              <button className="str-btn str-btn-primary" onClick={() => setShowSummativeModal(true)}>
                <Icon name="summative" /> Summative Marks
              </button>
            </div>
          </div>

          {/* Subject grid */}
          <Row>
            {Object.keys(subjectsGrouped).length === 0 && (
              <Col>
                <div className="str-empty-state">
                  <div className="str-empty-icon">📚</div>
                  <h4>No subjects assigned</h4>
                  <p>Your subjects will appear here once assigned by the administrator.</p>
                </div>
              </Col>
            )}

            {Object.keys(subjectsGrouped).map(subjectName => {
              const isEnlarged = enlargedSubject === subjectName;
              return (
                <Col lg={isEnlarged ? 12 : 6} key={subjectName} className={`mb-4 str-col ${isEnlarged ? 'str-col-enlarged' : ''}`}>
                  {isEnlarged && <div className="str-enlarge-backdrop" onClick={() => setEnlargedSubject(null)} />}
                  <div className={`str-subject-card ${isEnlarged ? 'enlarged' : ''}`}>

                    {/* Card header */}
                    <div className="str-card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 str-subject-name">{subjectName}</h5>
                      <Stack direction="horizontal" gap={2}>
                        <button 
                          className="str-btn str-btn-secondary str-btn-sm"
                          onClick={() => setEnlargedSubject(isEnlarged ? null : subjectName)}
                          title={isEnlarged ? "Collapse Card" : "Enlarge Card"}
                          style={{ minWidth: '36px' }}
                        >
                          {isEnlarged ? '🗗' : '🗖'}
                        </button>
                        <Dropdown align="end">
                          <Dropdown.Toggle className="str-reports-toggle dropdown-toggle" id={`rpt-${subjectName}`}>
                            ◈ Reports
                          </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Header>CBA (Aggregated Topics)</Dropdown.Header>
                          <Dropdown.Item onClick={() => handleDownloadSubjectReport(subjectName, 'pdf')}>
                            📄 Download PDF Summary
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleDownloadSubjectReport(subjectName, 'csv')}>
                            📊 Download CSV Data
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                      <button
                        className="str-btn str-btn-secondary str-btn-sm"
                        onClick={() => { 
                          setSelectedSubject(subjectName); 
                          setFormData({ 
                            ...formData, 
                            subject: subjectName,
                            grade: gradeFilter || '',
                            stream: streamFilter || ''
                          }); 
                          setShowStrandModal(true); 
                        }}
                      >
                        + Strand
                      </button>
                      <button
                        className="str-btn str-btn-primary str-btn-sm"
                        style={{ background: 'linear-gradient(45deg, #6366f1, #a855f7)', border: 'none' }}
                        onClick={() => {
                          setRubricSubject(subjectName);
                          // Try to guess grade/stream from the first strand if available
                          const firstStrand = subjectsGrouped[subjectName][0];
                          if (firstStrand) {
                            setRubricGrade(firstStrand.grade);
                            setRubricStream(firstStrand.stream);
                          } else {
                            setRubricGrade(gradeFilter || '');
                            setRubricStream(streamFilter || '');
                          }
                          setExtractedStrands([]);
                          setRubricFile(null);
                          setShowRubricModal(true);
                        }}
                      >
                        <Icon name="add" /> Upload Rubric
                      </button>
                    </Stack>
                  </div>

                  {/* Card body */}
                  <div className="card-body p-0" style={{ flex: 1 }}>
                    {subjectsGrouped[subjectName].length === 0 ? (
                      <div className="str-no-strands">
                        No strands yet — add one to get started.
                      </div>
                    ) : (
                      <Accordion flush>
                        {subjectsGrouped[subjectName].map((strand, i) => (
                          <Accordion.Item eventKey={i.toString()} key={strand.id}>
                            <Accordion.Header>
                              <div className="d-flex justify-content-between w-100 pe-2 align-items-center">
                                <div className="str-strand-header">
                                  <span className="str-strand-name">{strand.name}</span>
                                  <span className="str-class-badge">{strand.grade} · {strand.stream}</span>
                                </div>
                                <Dropdown align="end" onClick={e => e.stopPropagation()}>
                                  <Dropdown.Toggle className="str-icon-toggle dropdown-toggle" id={`st-${strand.id}`}>
                                    ···
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => {
                                      setSelectedStrandId(strand.id); setSelectedSubject(strand.subject || subjectName);
                                      setFormData({ name: strand.name, subject: strand.subject, grade: strand.grade, stream: strand.stream, description: strand.description });
                                      setIsEditingStrand(true); setShowStrandModal(true);
                                    }}>
                                      ✎ &nbsp;Edit Strand
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item className="text-danger" onClick={() => { setDeleteTarget({ type: 'strand', id: strand.id, name: strand.name }); setShowConfirmDelete(true); }}>
                                      ⌫ &nbsp;Delete Strand
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </Accordion.Header>

                            <Accordion.Body>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="str-topics-label">Topics ({strand.sub_strands?.length || 0})</span>
                                <button className="str-btn str-btn-ghost" onClick={() => { setSelectedStrandId(strand.id); setIsEditingSub(false); setFormData({ name: '', description: '' }); setShowSubStrandModal(true); }}>
                                  + Add Topic
                                </button>
                              </div>

                              <ListGroup variant="flush">
                                {(!strand.sub_strands || strand.sub_strands.length === 0) && (
                                  <ListGroup.Item className="str-topic-item" style={{ textAlign: 'center', padding: '0.9rem 0 !important', color: 'var(--t-text-muted)', fontSize: '0.78rem' }}>
                                    No topics yet
                                  </ListGroup.Item>
                                )}
                                {strand.sub_strands?.map(sub => (
                                  <ListGroup.Item key={sub.id} className="str-topic-item d-flex justify-content-between align-items-center">
                                    <span className="str-topic-name" title={sub.name}>{sub.name}</span>
                                    <Stack direction="horizontal" gap={1}>
                                      <button className="str-btn str-btn-ghost str-btn-sm" onClick={() => { setActiveSubStrand({ ...sub, grade: strand.grade, stream: strand.stream, subject: subjectName }); setView('view-substrand'); }}>
                                        View
                                      </button>
                                      <Dropdown align="end">
                                        <Dropdown.Toggle className="str-icon-toggle dropdown-toggle" id={`sub-${sub.id}`}>
                                          ···
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                          <Dropdown.Item onClick={() => { setActiveSubStrand({ ...sub, grade: strand.grade, stream: strand.stream }); setRecordData({ students: [], scores: {}, remarks: {}, raws: {}, levels: {} }); setShowRecordModal(true); }}>
                                            ⊞ &nbsp;Record Scores
                                          </Dropdown.Item>
                                          <Dropdown.Item onClick={() => { setActiveSubStrand({ ...sub, grade: strand.grade, stream: strand.stream }); setShowReportModal(true); }}>
                                            ◈ &nbsp;Performance Report
                                          </Dropdown.Item>
                                          <Dropdown.Divider />
                                          <Dropdown.Item onClick={() => { setActiveSubStrand(sub); setIsEditingSub(true); setFormData({ name: sub.name, description: sub.description }); setShowSubStrandModal(true); }}>
                                            ✎ &nbsp;Edit Topic
                                          </Dropdown.Item>
                                          <Dropdown.Item className="text-danger" onClick={() => { setDeleteTarget({ type: 'substrand', id: sub.id, name: sub.name, grade: strand.grade, stream: strand.stream }); setShowConfirmDelete(true); }}>
                                            ⌫ &nbsp;Delete
                                          </Dropdown.Item>
                                        </Dropdown.Menu>
                                      </Dropdown>
                                    </Stack>
                                  </ListGroup.Item>
                                ))}
                              </ListGroup>
                            </Accordion.Body>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    )}
                  </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Container>
      )}

      {view === 'view-substrand' && <Container><SubStrandDetailView subStrand={activeSubStrand} onBack={() => setView('list')} /></Container>}
      {view === 'scoring' && (
        <SubStrandScoring 
          subStrand={activeSubStrand} 
          onBack={() => { setView('list'); fetchInitialData(); }} 
          onEvidence={(student) => {
            setActiveSubStrand({ ...activeSubStrand, student_id: student.registration_no, student_name: `${student.first_name} ${student.surname || student.last_name}` });
            setShowPortfolioModal(true);
          }}
        />
      )}
      {view === 'report' && <SubStrandReport subStrand={activeSubStrand} onBack={() => setView('list')} onDownload={(format) => handleDownloadSubStrandReport(activeSubStrand, format)} />}

      {/* ── STRAND MODAL ──────────────────────── */}
      <Modal show={showStrandModal} onHide={() => { setShowStrandModal(false); setIsEditingStrand(false); setSelectedStrandId(null); }} centered>
        <Form onSubmit={handleCreateStrand}>
          <Modal.Header closeButton>
            <Modal.Title>{isEditingStrand ? `Edit Strand — ${selectedSubject}` : `New Strand — ${selectedSubject}`}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Strand Name</Form.Label>
              <Form.Control required placeholder="e.g. Numbers & Operations" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Grade</Form.Label>
                  <Form.Select required value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })}>
                    <option value="">Select grade</option>
                    {dashboardData.grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Stream</Form.Label>
                  <Form.Select required value={formData.stream} onChange={e => setFormData({ ...formData, stream: e.target.value })}>
                    <option value="">Select stream</option>
                    {dashboardData.streams.map(s => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStrandModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{isEditingStrand ? 'Save Changes' : 'Create Strand'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── SUBSTRAND MODAL ───────────────────── */}
      <Modal show={showSubStrandModal} onHide={() => setShowSubStrandModal(false)} centered>
        <Form onSubmit={handleSubStrandSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{isEditingSub ? 'Edit Topic' : 'Add Topic'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control required placeholder="e.g. Place Value" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description <span style={{ color: 'var(--t-text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Brief overview of this topic…" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSubStrandModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Topic</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── RECORD SCORES MODAL ───────────────── */}
      <Modal show={showRecordModal} onHide={() => setShowRecordModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Record Scores — <span style={{ color: 'var(--str-indigo)' }}>{activeSubStrand?.name}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* params row */}
          <div className="str-params-row mb-3">
            <div className="str-param-chip">
              <span>Class</span>
              <strong>{activeSubStrand?.grade} · {activeSubStrand?.stream}</strong>
            </div>
            <div style={{ flex: 1 }} />
            <Form.Select size="sm" value={recordPayload.term} style={{ width: 'auto', minWidth: 110 }} onChange={e => setRecordPayload({ ...recordPayload, term: e.target.value })}>
              <option>Term 1</option><option>Term 2</option><option>Term 3</option>
            </Form.Select>
            <Form.Select size="sm" value={recordPayload.assessement_type} style={{ width: 'auto', minWidth: 140 }} onChange={e => setRecordPayload({ ...recordPayload, assessement_type: e.target.value })}>
              <option>Class Work</option><option>Homework</option><option>Exam</option>
              <option>SBA-Written</option><option>SBA-Project</option><option>SBA-Practical</option>
              <option>SBA-Oral</option><option>SBA-Observation</option>
            </Form.Select>
            <Form.Control size="sm" type="number" style={{ width: 90 }} value={recordPayload.out_of}
              onChange={e => setRecordPayload({ ...recordPayload, out_of: Number(e.target.value) })}
              placeholder="Out of"
            />
          </div>

          <div className="str-scroll-region">
            <table className="str-score-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ width: 120 }}>Raw /{recordPayload.out_of}</th>
                  <th style={{ width: 90 }}>Pct %</th>
                  <th style={{ width: 130 }}>Level</th>
                  <th style={{ width: 100 }}>Portfolio</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {recordData.students.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--t-text-muted)', fontSize: '0.82rem' }}>
                    No students found for this class.
                  </td></tr>
                )}
                {recordData.students.map(s => (
                  <tr key={s.registration_no}>
                    <td>
                      <div className="str-student-name">{s.first_name} {s.last_name}</div>
                      <div className="str-reg-no">{s.registration_no}</div>
                    </td>
                    <td>
                      <Form.Control type="number" min={0} max={recordPayload.out_of}
                        value={recordData.raws?.[s.registration_no] ?? ''}
                        onChange={e => {
                          const raw = e.target.value === '' ? '' : Number(e.target.value);
                          const reg = s.registration_no;
                          const pct = (raw === '' || !recordPayload.out_of) ? '' : Number(((raw / recordPayload.out_of) * 100).toFixed(2));
                          setRecordData(prev => ({
                            ...prev,
                            raws: { ...prev.raws, [reg]: raw },
                            scores: { ...prev.scores, [reg]: pct },
                            levels: { ...prev.levels, [reg]: getCBCLevel(pct) },
                            remarks: { ...prev.remarks, [reg]: getCBCRemark(pct) }
                          }));
                        }}
                      />
                    </td>
                    <td>
                      <Form.Control type="number" value={recordData.scores?.[s.registration_no] ?? ''} disabled />
                    </td>
                    <td>
                      <Form.Select
                        value={recordData.levels?.[s.registration_no] ?? ''}
                        onChange={e => setRecordData(p => ({ ...p, levels: { ...p.levels, [s.registration_no]: e.target.value } }))}>
                        <option value="">—</option>
                        <option value={1}>Level 1</option>
                        <option value={2}>Level 2</option>
                        <option value={3}>Level 3</option>
                        <option value={4}>Level 4</option>
                      </Form.Select>
                    </td>
                    <td>
                      <button className="str-btn str-btn-ghost str-btn-sm" onClick={() => { 
                        setActiveSubStrand({ ...activeSubStrand, student_id: s.registration_no, student_name: `${s.first_name} ${s.surname || s.last_name}` });
                        setShowPortfolioModal(true); 
                      }}>
                        <Icon name="add" /> Evidence
                      </button>
                    </td>
                    <td>
                      <Form.Control placeholder="Optional…"
                        value={recordData.remarks[s.registration_no] || ''}
                        onChange={e => setRecordData({ ...recordData, remarks: { ...recordData.remarks, [s.registration_no]: e.target.value } })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRecordModal(false)}>Close</Button>
          <Button variant="success" onClick={handleSaveRecord} disabled={isSavingRecord}>
            {isSavingRecord ? <><Spinner size="sm" animation="border" className="me-2" />Saving…</> : '✓ Save Scores'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── REPORT MODAL ──────────────────────── */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Performance Report — <span style={{ color: 'var(--str-indigo)' }}>{activeSubStrand?.name}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeSubStrand
            ? <SubStrandReport subStrand={activeSubStrand} onBack={null} onDownload={(format) => handleDownloadSubStrandReport(activeSubStrand, format)} />
            : <p style={{ color: 'var(--t-text-muted)', fontSize: '0.85rem' }}>No data available.</p>}
        </Modal.Body>
      </Modal>

      {/* ── CONFIRM DELETE ────────────────────── */}
      <Modal show={showConfirmDelete} onHide={() => setShowConfirmDelete(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="str-delete-warning">
            <span className="str-delete-icon">⚠️</span>
            <div className="str-delete-text">
              <p>Delete <strong>{deleteTarget?.name}</strong>?</p>
              <p style={{ marginTop: 4, color: 'var(--t-text-muted)', fontSize: '0.78rem' }}>This action cannot be undone.</p>
              {deleteTarget?.grade && <small>{deleteTarget.grade} — {deleteTarget.stream}</small>}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={performDeleteTarget}>Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* ── SUMMATIVE MODAL ───────────────────── */}
      <Modal show={showSummativeModal} onHide={() => { setShowSummativeModal(false); setSummativePayload({ grade: '', stream: '', learning_area_id: '', term: 'Term 1', exam_type: 'Opener', year: new Date().getFullYear() }); setSummativeData({ students: [], marks: {}, subjects: [] }); }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Summative Assessment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={3}><Form.Group><Form.Label>Grade</Form.Label>
                <Form.Select value={summativePayload.grade} onChange={e => setSummativePayload({ ...summativePayload, grade: e.target.value, learning_area_id: '' })}>
                  <option value="">Select</option>{dashboardData.grades.map(g => <option key={g} value={g}>{g}</option>)}
                </Form.Select></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Stream</Form.Label>
                <Form.Select value={summativePayload.stream} onChange={e => setSummativePayload({ ...summativePayload, stream: e.target.value, learning_area_id: '' })}>
                  <option value="">Select</option>{dashboardData.streams.map(s => <option key={s} value={s}>{s}</option>)}
                </Form.Select></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Subject</Form.Label>
                <Form.Select value={summativePayload.learning_area_id} onChange={e => setSummativePayload({ ...summativePayload, learning_area_id: e.target.value })} disabled={!summativePayload.grade || !summativePayload.stream}>
                  <option value="">Select</option>{summativeData.subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </Form.Select></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Term</Form.Label>
                <Form.Select value={summativePayload.term} onChange={e => setSummativePayload({ ...summativePayload, term: e.target.value })}>
                  <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                </Form.Select></Form.Group></Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}><Form.Group><Form.Label>Exam Type</Form.Label>
                <Form.Select value={summativePayload.exam_type} onChange={e => setSummativePayload({ ...summativePayload, exam_type: e.target.value })}>
                  <option>Opener</option><option>Mid Term</option><option>End Term</option>
                </Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Year</Form.Label>
                <Form.Control type="number" value={summativePayload.year} onChange={e => setSummativePayload({ ...summativePayload, year: e.target.value })} />
              </Form.Group></Col>
            </Row>

            <div className="mb-3">
              <Form.Control 
                placeholder="Search student in this class..." 
                value={sSearch}
                onChange={e => setSSearch(e.target.value)}
              />
            </div>

            {isLoadingSummative
              ? <div style={{ textAlign: 'center', padding: '2.5rem' }}><Spinner animation="border" style={{ color: 'var(--str-indigo)' }} /></div>
              : (
                <div className="str-scroll-region">
                  <table className="str-score-table">
                    <thead>
                      <tr><th>Student</th><th style={{ width: 130 }}>Marks (0–100)</th><th>Remarks</th></tr>
                    </thead>
                    <tbody>
                      {summativeData.students.filter(s => {
                        const q = sSearch.toLowerCase();
                        return !q || s.first_name.toLowerCase().includes(q) || (s.surname || '').toLowerCase().includes(q) || s.registration_no.toLowerCase().includes(q);
                      }).length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--t-text-muted)', fontSize: '0.82rem' }}>
                          {summativePayload.grade && summativePayload.stream ? 'No matching students found.' : 'Select grade and stream to load students.'}
                        </td></tr>
                      )}
                      {summativeData.students.filter(s => {
                        const q = sSearch.toLowerCase();
                        return !q || s.first_name.toLowerCase().includes(q) || (s.surname || '').toLowerCase().includes(q) || s.registration_no.toLowerCase().includes(q);
                      }).map(s => {
                        const entry = summativeData.marks[s.registration_no] || {};
                        return (
                          <tr key={s.registration_no}>
                            <td>
                              <div className="str-student-name">{s.first_name} {s.surname}</div>
                              <div className="str-reg-no">{s.registration_no}</div>
                            </td>
                            <td>
                              <Form.Control 
                                type="number" min={0} max={100} 
                                value={entry.marks ?? ''} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setSummativeData(prev => ({ 
                                    ...prev, 
                                    marks: { 
                                      ...prev.marks, 
                                      [s.registration_no]: { 
                                        ...entry, 
                                        marks: val,
                                        remark: getCBCRemark(val)
                                      } 
                                    } 
                                  }));
                                }} 
                              />
                            </td>
                            <td>
                              <Form.Control 
                                placeholder="Remarks…" 
                                value={entry.remark ?? ''} 
                                onChange={e => setSummativeData(prev => ({ ...prev, marks: { ...prev.marks, [s.registration_no]: { ...entry, remark: e.target.value } } }))} 
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <div className="me-auto d-flex gap-2">
            <Dropdown drop="up">
              <Dropdown.Toggle variant="outline-primary" size="sm" disabled={!summativePayload.learning_area_id}>
                📄 Report
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => {
                  const sub = summativeData.subjects.find(s => String(s.id) === String(summativePayload.learning_area_id));
                  handleDownloadLearningAreaReport(sub?.name || '', 'pdf', summativePayload.learning_area_id);
                }}>PDF Format</Dropdown.Item>
                <Dropdown.Item onClick={() => {
                  const sub = summativeData.subjects.find(s => String(s.id) === String(summativePayload.learning_area_id));
                  handleDownloadLearningAreaReport(sub?.name || '', 'csv', summativePayload.learning_area_id);
                }}>CSV Format</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
          <Button variant="secondary" onClick={() => setShowSummativeModal(false)}>Close</Button>
          <Button variant="success"
            onClick={async () => {
              setIsSavingSummative(true);
              try { await api.post('teacher-portal/learning-area-marks/', { ...summativePayload, marks: summativeData.marks }); showMessage({ type: 'success', text: 'Summative marks saved.' }); setShowSummativeModal(false); }
              catch { showMessage({ type: 'error', text: 'Failed to save marks.' }); }
              finally { setIsSavingSummative(false); }
            }}
            disabled={isSavingSummative || summativeData.students.length === 0}
          >
            {isSavingSummative ? <><Spinner size="sm" animation="border" className="me-2" />Saving…</> : '✓ Save All Marks'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── PORTFOLIO MODAL ───────────────────── */}
      <Modal show={showPortfolioModal} onHide={() => setShowPortfolioModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Learner Portfolio — <span style={{ color: 'var(--str-indigo)' }}>{activeSubStrand?.student_name}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Evidence Type</Form.Label>
              <Form.Select value={portfolioData.evidence_type} onChange={e => setPortfolioData({ ...portfolioData, evidence_type: e.target.value })}>
                <option>Project</option>
                <option>Photo</option>
                <option>Drawing</option>
                <option>Written Task</option>
                <option>Practical Task</option>
                <option>Observation Note</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>File / Evidence</Form.Label>
              <Form.Control type="file" onChange={e => setPortfolioData({ ...portfolioData, file: e.target.files[0] })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description / Note</Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Describe the evidence or achievement…" value={portfolioData.description} onChange={e => setPortfolioData({ ...portfolioData, description: e.target.value })} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPortfolioModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSavePortfolio} disabled={isSavingPortfolio || !portfolioData.file}>
            {isSavingPortfolio ? 'Uploading…' : 'Upload to Portfolio'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── NATIONAL ASSESSMENT MODAL ────────── */}
      <Modal show={showNationalModal} onHide={() => setShowNationalModal(false)} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>National Assessment (KPSEA/KESSA)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <Row className="g-3">
              <Col md={4}>
                <Form.Label className="t-label">Assessment Type</Form.Label>
                <Form.Select value={nationalConfig.assessment_type} onChange={e => setNationalConfig({ ...nationalConfig, assessment_type: e.target.value })}>
                  <option>KPSEA</option><option>KESSA</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label className="t-label">Exam Year</Form.Label>
                <Form.Control type="number" value={nationalConfig.year} onChange={e => setNationalConfig({ ...nationalConfig, year: e.target.value })} />
              </Col>
              <Col md={4}>
                <Form.Label className="t-label">Search Student</Form.Label>
                <Form.Control 
                  placeholder="Name or Reg No..." 
                  value={nationalSearch}
                  onChange={e => setNationalSearch(e.target.value)}
                />
              </Col>
            </Row>
          </div>

          <div className="str-scroll-region" style={{ maxHeight: '50vh', border: '1px solid var(--t-border)', borderRadius: 8 }}>
            <table className="str-score-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ width: 100 }}>Marks</th>
                  <th style={{ width: 140 }}>Level</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {nationalStudents.filter(s => {
                  const q = nationalSearch.toLowerCase();
                  return !q || s.first_name.toLowerCase().includes(q) || (s.surname || '').toLowerCase().includes(q) || s.registration_no.toLowerCase().includes(q);
                }).map(s => {
                  const entry = nationalMarks[s.registration_no] || { marks: '', overall_level: 3, remark: '' };
                  return (
                    <tr key={s.registration_no}>
                      <td>
                        <div className="str-student-name">{s.first_name} {s.surname}</div>
                        <div className="str-reg-no" style={{ fontSize: '0.65rem' }}>{s.registration_no}</div>
                      </td>
                      <td>
                        <Form.Control 
                          type="number" 
                          size="sm"
                          value={entry.marks} 
                          onChange={e => {
                            const val = e.target.value;
                            setNationalMarks({ 
                              ...nationalMarks, 
                              [s.registration_no]: { 
                                ...entry, 
                                marks: val,
                                overall_level: getCBCLevel(val),
                                remark: getCBCRemark(val)
                              } 
                            });
                          }} 
                        />
                      </td>
                      <td>
                        <Form.Select 
                          size="sm"
                          value={entry.overall_level} 
                          onChange={e => setNationalMarks({ ...nationalMarks, [s.registration_no]: { ...entry, overall_level: e.target.value } })}
                        >
                          <option value={4}>Exceeding (4)</option>
                          <option value={3}>Meeting (3)</option>
                          <option value={2}>Approaching (2)</option>
                          <option value={1}>Below (1)</option>
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Control 
                          size="sm"
                          placeholder="Remarks…" 
                          value={entry.remark} 
                          onChange={e => setNationalMarks({ ...nationalMarks, [s.registration_no]: { ...entry, remark: e.target.value } })} 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNationalModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveNational} disabled={isSavingNational}>
            {isSavingNational ? 'Saving…' : 'Save All Results'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── CLASS LIST MODAL ────────── */}
      <Modal show={showClassListModal} onHide={() => setShowClassListModal(false)} centered size="xl" scrollable className="str-record-modal">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontWeight: 700 }}>Class List — Grade {gradeFilter} {streamFilter}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <Form.Control 
              placeholder="Search Student..." 
              value={classListSearch}
              onChange={e => setClassListSearch(e.target.value)}
            />
          </div>
          {classListLoading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <div className="str-scroll-region" style={{ maxHeight: '50vh', border: '1px solid var(--t-border)', borderRadius: 8 }}>
              <table className="str-score-table">
                <thead>
                  <tr>
                    <th>Registration No</th>
                    <th>Student Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classListStudents.filter(s => {
                    const q = classListSearch.toLowerCase();
                    return !q || s.first_name.toLowerCase().includes(q) || (s.surname || '').toLowerCase().includes(q) || s.registration_no.toLowerCase().includes(q);
                  }).map(s => (
                    <tr key={s.registration_no}>
                      <td>{s.registration_no}</td>
                      <td>{s.first_name} {s.surname}</td>
                      <td>
                        {isClassTeacherOfSelectedClass ? (
                          <button className="str-btn str-btn-primary btn-sm" onClick={() => handleOpenReview(s)}>Review Performance</button>
                        ) : (
                          <span className="text-muted" style={{fontSize: '0.85rem'}}>Unauthorized</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {classListStudents.length === 0 && (
                    <tr><td colSpan="3" className="text-center py-3">No students found for this class.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClassListModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* ── REVIEW PERFORMANCE MODAL ────────── */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontWeight: 700 }}>Review Performance — {selectedReviewStudent?.first_name} {selectedReviewStudent?.surname}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0">Academic Performance for {reviewTerm} {reviewYear}</h6>
            <div className="btn-group" role="group">
              <input type="radio" className="btn-check" id="sys-cba" checked={reviewSystem === 'cba'} onChange={() => setReviewSystem('cba')} />
              <label className="btn btn-outline-primary btn-sm" htmlFor="sys-cba">CBA (Strands)</label>

              <input type="radio" className="btn-check" id="sys-summative" checked={reviewSystem === 'summative'} onChange={() => setReviewSystem('summative')} />
              <label className="btn btn-outline-primary btn-sm" htmlFor="sys-summative">Summative Marks</label>
            </div>
          </div>

          {isFetchingReviewData ? (
            <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <div className="mb-4">
              {reviewSystem === 'summative' && (
                reviewPerformanceData.summative && reviewPerformanceData.summative.length > 0 ? (
                  <div className="mb-3">
                    <span className="badge bg-primary mb-2" style={{ padding: '0.4em 0.8em' }}>Summative Marks</span>
                    <div className="d-flex flex-wrap gap-2">
                      {reviewPerformanceData.summative.map(m => (
                        <span key={m.id} className="badge bg-light text-dark border p-2" style={{ fontSize: '0.85rem' }}>
                          {m.subject || m.exam_type || 'Exam'}: <strong className="text-primary">{m.score || m.total_marks}%</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted fst-italic text-center py-3 border rounded bg-light">No summative marks found for this term.</div>
                )
              )}

              {reviewSystem === 'cba' && (
                reviewPerformanceData.cbc && reviewPerformanceData.cbc.length > 0 ? (
                  <div>
                    <span className="badge bg-success mb-2" style={{ padding: '0.4em 0.8em' }}>CBC Levels (Strands)</span>
                    <div className="d-flex flex-wrap gap-2">
                      {reviewPerformanceData.cbc.map((c, idx) => (
                        <span key={c.id || idx} className="badge bg-light text-dark border p-2" style={{ fontSize: '0.85rem' }}>
                          {c.subject || c.competency} {c.strand ? `(${c.strand})` : ''}: <strong className="text-success">{c.level ? `Level ${c.level}` : (c.rating || 'N/A')}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted fst-italic text-center py-3 border rounded bg-light">No CBA strands data found for this term.</div>
                )
              )}
            </div>
          )}

          {!isClassTeacher && (
            <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.85rem' }}>
              <strong>Note:</strong> You are viewing this student's performance, but only the assigned <strong>Class Teacher</strong> for this grade and stream can submit the official review.
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="t-label">Class Teacher Comment</Form.Label>
            <Form.Control 
              as="textarea"
              rows={4}
              placeholder="Enter overall class teacher comment..."
              value={classTeacherComment}
              onChange={e => setClassTeacherComment(e.target.value)}
              disabled={!isClassTeacher}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviewModal(false)}>Cancel</Button>
          {isClassTeacher && (
            <Button variant="primary" onClick={handleSaveReview} disabled={isSavingReview}>
              {isSavingReview ? 'Saving...' : 'Save Comment'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
      
      {/* ── RUBRIC UPLOAD MODAL ────────── */}
      <Modal show={showRubricModal} onHide={() => setShowRubricModal(false)} centered size="xl" scrollable className="str-rubric-modal">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontWeight: 700 }}>Identify Strands for <span>{rubricSubject}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!extractedStrands.length ? (
            <div className="text-center py-5">
              <div className="str-upload-zone mb-4">
                <input 
                  type="file" 
                  id="rubricFile" 
                  hidden 
                  accept=".pdf,image/*" 
                  onChange={e => setRubricFile(e.target.files[0])} 
                />
                <label htmlFor="rubricFile" className="str-upload-label">
                  <div className="str-upload-icon">📄</div>
                  {rubricFile ? (
                    <div className="text-primary fw-bold">{rubricFile.name}</div>
                  ) : (
                    <div>Click to select Rubric (PDF or Image)</div>
                  )}
                </label>
              </div>
              <Button 
                className="str-btn str-btn-primary px-5" 
                onClick={handleRubricExtract} 
                disabled={!rubricFile || isExtracting}
              >
                {isExtracting ? (
                  <><Spinner animation="border" size="sm" className="me-2" /> Identifying Strands...</>
                ) : (
                  'Process with AI'
                )}
              </Button>
            </div>
          ) : (
            <div className="extracted-content">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="mb-0 fw-bold">Review Identified Content</h6>
                <div className="d-flex gap-3">
                  <span className="text-muted small">Grade: <strong>{rubricGrade}</strong></span>
                  <span className="text-muted small">Stream: <strong>{rubricStream}</strong></span>
                </div>
              </div>
              <div className="str-scroll-region" style={{ maxHeight: '60vh' }}>
                <table className="str-score-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Strand</th>
                      <th>Sub-strands (Topics)</th>
                      <th style={{ width: 80 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedStrands.map((s, sIdx) => (
                      <tr key={sIdx}>
                        <td>
                          <Form.Control 
                            value={s.strand} 
                            onChange={e => {
                              const newList = [...extractedStrands];
                              newList[sIdx].strand = e.target.value;
                              setExtractedStrands(newList);
                            }}
                          />
                        </td>
                        <td>
                          {s.sub_strands.map((sub, subIdx) => (
                            <div key={subIdx} className="mb-3 p-2" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                              <div className="d-flex gap-2 mb-2">
                                <Form.Control 
                                  size="sm" 
                                  className="fw-bold"
                                  placeholder="Topic Name"
                                  value={sub.name} 
                                  onChange={e => {
                                    const newList = [...extractedStrands];
                                    newList[sIdx].sub_strands[subIdx].name = e.target.value;
                                    setExtractedStrands(newList);
                                  }}
                                />
                                <button 
                                  className="btn btn-sm text-danger"
                                  onClick={() => {
                                    const newList = [...extractedStrands];
                                    newList[sIdx].sub_strands.splice(subIdx, 1);
                                    setExtractedStrands(newList);
                                  }}
                                >
                                  &times;
                                </button>
                              </div>
                              <div className="ps-3 border-start">
                                <div className="small text-muted mb-1" style={{ fontSize: '0.65rem' }}>EXPECTED OUTCOMES:</div>
                                {(sub.expected_outcomes || []).map((outcome, oIdx) => (
                                  <div key={oIdx} className="d-flex gap-2 mb-1">
                                    <Form.Control 
                                      size="sm" 
                                      as="textarea"
                                      rows={1}
                                      value={outcome} 
                                      onChange={e => {
                                        const newList = [...extractedStrands];
                                        newList[sIdx].sub_strands[subIdx].expected_outcomes[oIdx] = e.target.value;
                                        setExtractedStrands(newList);
                                      }}
                                    />
                                    <button 
                                      className="btn btn-sm p-0 text-muted"
                                      onClick={() => {
                                        const newList = [...extractedStrands];
                                        newList[sIdx].sub_strands[subIdx].expected_outcomes.splice(oIdx, 1);
                                        setExtractedStrands(newList);
                                      }}
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}
                                <button 
                                  className="btn btn-sm btn-link p-0 text-muted" 
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={() => {
                                    const newList = [...extractedStrands];
                                    if (!newList[sIdx].sub_strands[subIdx].expected_outcomes) {
                                      newList[sIdx].sub_strands[subIdx].expected_outcomes = [];
                                    }
                                    newList[sIdx].sub_strands[subIdx].expected_outcomes.push("");
                                    setExtractedStrands(newList);
                                  }}
                                >
                                  + Add Outcome
                                </button>
                              </div>
                            </div>
                          ))}
                          <button 
                            className="btn btn-sm btn-link p-0 text-primary"
                            onClick={() => {
                              const newList = [...extractedStrands];
                              newList[sIdx].sub_strands.push({ name: '', expected_outcomes: [] });
                              setExtractedStrands(newList);
                            }}
                          >
                            + Add Topic
                          </button>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              const newList = [...extractedStrands];
                              newList.splice(sIdx, 1);
                              setExtractedStrands(newList);
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRubricModal(false)}>Cancel</Button>
          {extractedStrands.length > 0 && (
            <Button variant="primary" onClick={handleSaveExtractedStrands}>
              Save Identified Strands
            </Button>
          )}
        </Modal.Footer>
      </Modal>

    </div>
  );
}

/* ─── Detail view ─────────────────────────────── */
function SubStrandDetailView({ subStrand, onBack }) {
  return (
    <div>
      <button className="str-btn str-btn-secondary mb-3" onClick={onBack}>← Back to Portal</button>
      <div className="str-detail-card card">
        <div className="str-card-header d-flex align-items-center gap-2">
          <h5 className="mb-0" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>{subStrand.name}</h5>
          <span className="str-class-badge">{subStrand.grade} · {subStrand.stream}</span>
        </div>
        <div className="card-body" style={{ color: 'var(--t-text)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--t-text-muted)', marginBottom: 4 }}>Subject</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{subStrand.subject}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--t-text-muted)', marginBottom: 4 }}>Class</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{subStrand.grade} — {subStrand.stream}</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--t-border)', paddingTop: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--t-text-muted)', marginBottom: 6 }}>Description</p>
            <p style={{ margin: 0, color: subStrand.description ? 'var(--t-text)' : 'var(--t-text-muted)', fontSize: '0.87rem' }}>
              {subStrand.description || 'No description provided for this topic.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Scoring view ────────────────────────────── */
function SubStrandScoring({ subStrand, onBack, onEvidence }) {
  const { showMessage } = useMessage();
  const [loading, setLoading] = useState(true);
  const [term, setTerm]       = useState('Term 1');
  const [data, setData]       = useState({ students: [], scores: {}, remarks: {} });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get(`teacher-portal/sub-strands/${subStrand.id}/scores/${subStrand.grade}/${subStrand.stream}/?term=${term}`); setData({ students: res.data.students || [], scores: res.data.scores || {}, remarks: res.data.remarks || res.data.remark || {} }); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [subStrand, term]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBulkSave = async () => {
    setIsSaving(true);
    try {
      const scoresPayload = {}; const levelsPayload = {};
      Object.entries(data.scores || {}).forEach(([reg, val]) => {
        if (val === null || val === undefined || val === '') return;
        const n = Number(val); if (Number.isNaN(n)) return;
        scoresPayload[reg] = n;
        levelsPayload[reg] = n >= 80 ? 4 : n >= 60 ? 3 : n >= 40 ? 2 : 1;
      });
      await api.post(`teacher-portal/sub-strands/${subStrand.id}/scores/${subStrand.grade}/${subStrand.stream}/`, { term, scores: scoresPayload, remarks: data.remarks, remark: data.remarks, levels: levelsPayload });
      showMessage({ type: 'success', text: 'Scores recorded!' });
    } catch { showMessage({ type: 'error', text: 'Failed to save.' }); }
    finally { setIsSaving(false); }
  };

  return (
    <Container>
      <button className="str-btn str-btn-secondary mb-3" onClick={onBack}>← Back</button>
      <div className="str-detail-card card mb-4">
        <div className="str-card-header d-flex justify-content-between align-items-center">
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--t-text)' }}>{subStrand.name}</h4>
            <small style={{ color: 'var(--t-text-muted)', fontSize: '0.78rem' }}>{subStrand.grade} — {subStrand.stream}</small>
          </div>
          <div className="d-flex gap-2">
            <Form.Control 
              placeholder="Search student..." 
              size="sm"
              style={{ width: 180 }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Form.Select style={{ width: 130 }} size="sm" value={term} onChange={e => setTerm(e.target.value)}>
              <option>Term 1</option><option>Term 2</option><option>Term 3</option>
            </Form.Select>
          </div>
        </div>
      </div>
      {loading
        ? <div className="str-loader-wrap" style={{ minHeight: 200 }}><div className="str-spinner" /></div>
        : (
          <div className="str-detail-card card overflow-hidden">
            <table className="str-score-table">
              <thead><tr><th>Student</th><th style={{ width: 150 }}>Score</th><th>Remarks</th></tr></thead>
              <tbody>
                {data.students.filter(s => {
                  const q = searchQuery.toLowerCase();
                  return !q || s.first_name.toLowerCase().includes(q) || (s.surname || '').toLowerCase().includes(q) || s.registration_no.toLowerCase().includes(q);
                }).map(s => (
                  <tr key={s.registration_no}>
                    <td>
                      <div className="str-student-name">{s.first_name} {s.surname || s.last_name}</div>
                      {s.assessment_number && <div style={{ fontSize: '0.65rem', color: 'var(--t-text-muted)' }}>{s.assessment_number}</div>}
                    </td>
                    <td>
                      <Form.Control 
                        type="number" 
                        value={data.scores[s.registration_no] || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setData({ 
                            ...data, 
                            scores: { ...data.scores, [s.registration_no]: val },
                            remarks: { ...data.remarks, [s.registration_no]: getCBCRemark(val) }
                          });
                        }} 
                      />
                    </td>
                    <td>
                      <div className="d-flex gap-2 align-items-center">
                        <Form.Control value={data.remarks[s.registration_no] || ''} onChange={e => setData({ ...data, remarks: { ...data.remarks, [s.registration_no]: e.target.value } })} />
                        <button className="str-btn str-btn-ghost str-btn-sm" onClick={() => onEvidence(s)}>
                          <Icon name="add" /> Evidence
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <button className="str-btn str-btn-primary mt-3" onClick={handleBulkSave} disabled={isSaving}>
        {isSaving ? 'Saving…' : '✓ Record Scores'}
      </button>
    </Container>
  );
}

/* ─── Report view ─────────────────────────────── */
function SubStrandReport({ subStrand, onBack, onDownload }) {
  return (
    <Container>
      {onBack && <button className="str-btn str-btn-secondary mb-3" onClick={onBack}>← Back</button>}
      <div className="str-detail-card card">
        <div className="str-card-header">
          <h5 style={{ margin: 0, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Performance Report — {subStrand.name}</h5>
        </div>
        <div className="card-body" style={{ color: 'var(--t-text)' }}>
          <div className="str-params-row mb-3">
            <span className="str-param-chip">Grade <strong>{subStrand.grade}</strong></span>
            <span className="str-param-chip">Stream <strong>{subStrand.stream}</strong></span>
          </div>
          <table className="str-score-table">
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody><tr><td>Status</td><td style={{ color: 'var(--str-emerald)', fontWeight: 600 }}>Report Ready</td></tr></tbody>
          </table>
          <div className="d-flex gap-2 mt-3">
            <button className="str-btn str-btn-primary" onClick={() => onDownload ? onDownload('pdf') : window.print()}>🖨 Download PDF</button>
            <button className="str-btn str-btn-secondary" onClick={() => onDownload ? onDownload('csv') : null}>📊 Download CSV</button>
          </div>
        </div>
      </div>
    </Container>
  );
}