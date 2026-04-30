import React, { useState, useEffect } from 'react';
import students from '../../../api/api';
import './AcademicDashboard.css';
import { useGradesAndStreams } from '../../../hooks/useGradesAndStreams';

export default function AcademicDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [assessmentType, setAssessmentType] = useState('cba');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [learningAreas, setLearningAreas] = useState([]);
  const [topStudentsByGrade, setTopStudentsByGrade] = useState({});
  const [pieChart, setPieChart] = useState({ labels: [], data: [] });
  const [lineChart, setLineChart] = useState({ labels: [], data: [] });
  const [gradeDistributions, setGradeDistributions] = useState([]);
  const [gradeStudents, setGradeStudents] = useState([]);
  const [loadingGradeStudents, setLoadingGradeStudents] = useState(false);
  const [selectedModalGrade, setSelectedModalGrade] = useState('');
  const [studentStrands, setStudentStrands] = useState([]);
  const [loadingStrands, setLoadingStrands] = useState(false);
  const [strandSubjectFilter, setStrandSubjectFilter] = useState('');
  const [studentCompetencies, setStudentCompetencies] = useState(null);
  const [loadingCompetencies, setLoadingCompetencies] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [gradeCompetencies, setGradeCompetencies] = useState([]);
  const [loadingGradeCompetencies, setLoadingGradeCompetencies] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [resultPaperParams, setResultPaperParams] = useState({ grade: '', stream: '', term: '', assessement_type: '', report_type: 'cba', exam_type: 'End Term' });
  const [gradeReportParams, setGradeReportParams] = useState({ grade: '', stream: '', term: '', report_type: 'cba', assessement_type: '', exam_type: 'End Term' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportParams, setExportParams] = useState({ report_type: 'Overall Academic Performance', grade: '', format: 'PDF', stream: '', term: 'Term 1', year: new Date().getFullYear(), subject: '' });
  const [headteacherComment, setHeadteacherComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [reviewSystem, setReviewSystem] = useState('cba'); // 'cba' | 'summative'
  const [reviewPerformanceData, setReviewPerformanceData] = useState({ cbc: null, summative: null });
  const [isFetchingReviewData, setIsFetchingReviewData] = useState(false);
  
  const { grades, streams } = useGradesAndStreams(students, 
    modalType === 'gradeReport' ? gradeReportParams.grade :
    modalType === 'individual' ? selectedModalGrade : 
    modalType === 'export' ? exportParams.grade :
    modalType === 'resultPapers' ? resultPaperParams.grade :
    selectedGrade
  );

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchData();
  }, [selectedYear, selectedTerm, selectedGrade, selectedStream, assessmentType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedTerm) params.append('term', selectedTerm);
      if (selectedGrade) params.append('grade', selectedGrade);
      if (selectedStream) params.append('stream', selectedStream);
      if (assessmentType) params.append('report_type', assessmentType);
      const res = await students.get(`academics/cbc/dashboard/?${params.toString()}`);
      const data = res.data || {};
      setLearningAreas(data.learning_areas || []);
      setTopStudentsByGrade(data.top_students || {});
      setPieChart(data.pie_chart || { labels: [], data: [] });
      setLineChart(data.line_chart || { labels: [], data: [] });
      setGradeDistributions(data.grade_distributions || []);
      setError('');
    } catch {
      setError('Failed to load CBC dashboard data');
      setLearningAreas([]); setTopStudentsByGrade({});
      setPieChart({ labels: [], data: [] });
      setLineChart({ labels: [], data: [] });
      setGradeDistributions([]);
    } finally { setLoading(false); }
  };

  const cbcGradingScale = [
    { level: '4', code: 'EE', name: 'Exceeding Expectations', range: '3.5 – 4.0', description: 'Excellent Mastery', color: '#10b981' },
    { level: '3', code: 'ME', name: 'Meeting Expectation', range: '2.5 – 3.49', description: 'Good Progress', color: '#6366f1' },
    { level: '2', code: 'AE', name: 'Approaching Expectation', range: '1.5 – 2.49', description: 'Needs Improvement', color: '#d97706' },
    { level: '1', code: 'BE', name: 'Below Expectation', range: '0.0 – 1.49', description: 'Critical Intervention', color: '#ef4444' },
  ];

  const subjectPerformance = learningAreas.map(la => ({
    subject: la.name,
    avgLevel: la.avg_level_area || 0,
    avgMarks: la.avg_score,
    students: la.total_students,
    ee: la.level_distribution?.['Exceeding Expectations'] || 0,
    me: la.level_distribution?.['Meeting Expectation'] || 0,
    ae: la.level_distribution?.['Approaching Expectation'] || 0,
    be: la.level_distribution?.['Below Expectation'] || 0,
  }));

  const totalEE = subjectPerformance.reduce((s, x) => s + x.ee, 0);
  const totalME = subjectPerformance.reduce((s, x) => s + x.me, 0);
  const totalAE = subjectPerformance.reduce((s, x) => s + x.ae, 0);
  const totalBE = subjectPerformance.reduce((s, x) => s + x.be, 0);
  const totalAssessments = totalEE + totalME + totalAE + totalBE;

  const performanceDistribution = [
    { grade: 'Exceeding (EE)', count: totalEE, percentage: totalAssessments ? Math.round((totalEE/totalAssessments)*100) : 0, color: '#10b981' },
    { grade: 'Meeting (ME)', count: totalME, percentage: totalAssessments ? Math.round((totalME/totalAssessments)*100) : 0, color: '#6366f1' },
    { grade: 'Approaching (AE)', count: totalAE, percentage: totalAssessments ? Math.round((totalAE/totalAssessments)*100) : 0, color: '#d97706' },
    { grade: 'Below (BE)', count: totalBE, percentage: totalAssessments ? Math.round((totalBE/totalAssessments)*100) : 0, color: '#ef4444' },
  ];

  const totalStudentsStat = pieChart.data.reduce((s, v) => s + v, 0) || subjectPerformance.reduce((s, x) => s + (x.students || 0), 0);
  const avgLevelStat = subjectPerformance.length > 0 ? (subjectPerformance.reduce((s, x) => s + (x.avgLevel || 0), 0) / subjectPerformance.length).toFixed(2) : 0;

  const academicStats = [
    { title: 'Total Students', value: totalStudentsStat, icon: '👥', accent: '#6366f1' },
    { title: 'Avg. Level', value: `${avgLevelStat} / 4.0`, icon: '📊', accent: '#10b981' },
    { title: 'Exceeding (EE)', value: totalEE, icon: '⭐', accent: '#d97706' },
    { title: 'Grades', value: pieChart.labels.length, icon: '🏫', accent: '#0891b2' },
  ];

  const fetchGradeStudents = async (grade) => {
    setSelectedModalGrade(grade);
    handleOpenModal('gradeStudents');
    setLoadingGradeStudents(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedTerm) params.append('term', selectedTerm);
      params.append('grade', grade);
      if (selectedStream) params.append('stream', selectedStream);
      const res = await students.get(`academics/cbc/performance/?${params.toString()}`);
      setGradeStudents(res.data || []);
    } catch { setGradeStudents([]); }
    finally { setLoadingGradeStudents(false); }
  };

  const fetchStudentStrands = async (studentData) => {
    setSelectedStudent(studentData);
    setStrandSubjectFilter('');
    handleOpenModal('studentStrands');
    setLoadingStrands(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedTerm) params.append('term', selectedTerm);
      const res = await students.get(`academics/cbc/student/${studentData.registration_no}/strands/?${params.toString()}`);
      setStudentStrands(res.data.marks || []);
    } catch { setStudentStrands([]); }
    finally { setLoadingStrands(false); }
  };

  const fetchStudentCompetencies = async (studentData) => {
    setSelectedStudent(studentData);
    handleOpenModal('studentCompetencies');
    setLoadingCompetencies(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedTerm) params.append('term', selectedTerm);
      const res = await students.get(`academics/cbc/student/${studentData.registration_no}/competencies/?${params.toString()}`);
      setStudentCompetencies(res.data);
    } catch { setStudentCompetencies(null); }
    finally { setLoadingCompetencies(false); }
  };

  const fetchGradeCompetencies = async (grade) => {
    handleOpenModal('gradeCompetencies');
    setLoadingGradeCompetencies(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedTerm) params.append('term', selectedTerm);
      params.append('grade', grade);
      if (selectedStream) params.append('stream', selectedStream);
      const res = await students.get(`academics/cbc/grade-competencies/?${params.toString()}`);
      setGradeCompetencies(res.data.analysis || []);
    } catch { setGradeCompetencies([]); }
    finally { setLoadingGradeCompetencies(false); }
  };

  const handleOpenReview = async (studentData) => {
    setSelectedStudent(studentData);
    setHeadteacherComment('');
    setReviewPerformanceData({ cbc: null, summative: null });
    handleOpenModal('reviewPerformance');
    setIsFetchingReviewData(true);
    try {
      const termToUse = selectedTerm || 'Term 1';
      const yearToUse = selectedYear || new Date().getFullYear();
      
      const [commentRes, cbcRes, summativeRes] = await Promise.allSettled([
        students.get(`teacher-portal/report-comments/?student_id=${studentData.registration_no}&term=${termToUse}&year=${yearToUse}`),
        students.get(`academics/cbc/student/${studentData.registration_no}/strands/?term=${termToUse}&year=${yearToUse}&aggregate=true`),
        students.get(`students/${studentData.registration_no}/academics/?term=${termToUse}&year=${yearToUse}`)
      ]);

      if (commentRes.status === 'fulfilled' && commentRes.value.data) {
        setHeadteacherComment(commentRes.value.data.headteacher_comment || '');
      }

      const cbcRaw = cbcRes.status === 'fulfilled' ? cbcRes.value.data : null;
      const cbcData = Array.isArray(cbcRaw) ? cbcRaw : (cbcRaw?.marks || cbcRaw?.overall_competencies || cbcRaw?.competencies || null);
      
      const summativeRaw = summativeRes.status === 'fulfilled' ? summativeRes.value.data : null;
      const summativeData = summativeRaw?.marks || null;
      
      setReviewPerformanceData({ cbc: cbcData, summative: summativeData });

    } catch (err) {
      console.error('Error fetching comment', err);
    } finally {
      setIsFetchingReviewData(false);
    }
  };

  const handleSaveReview = async () => {
    setIsSavingComment(true);
    try {
      const termToUse = selectedTerm || 'Term 1';
      const yearToUse = selectedYear || new Date().getFullYear();
      await students.post(`teacher-portal/report-comments/`, {
        student_id: selectedStudent.registration_no,
        term: termToUse,

        year: yearToUse,
        headteacher_comment: headteacherComment
      });
      setSuccessMessage('Performance review saved successfully!');
      handleCloseModal();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to save performance review.';
      setError(errorMsg);
      console.error(err);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleOpenModal = (type, data = null) => {
    setModalType(type);
    if (type === 'student' && data) setSelectedStudent(data);
    setShowModal(true);
  };
  const handleCloseModal = () => { 
    setShowModal(false); 
    setModalType(''); 
    setSelectedStudent(null); 
    setResultPaperParams({ grade: '', stream: '', term: '', assessement_type: '' });
    setGradeReportParams({ grade: '', stream: '', term: '', report_type: 'cba' });
  };

  const handleExportReport = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams();
      if (exportParams.report_type) params.append('report_type', exportParams.report_type);
      if (exportParams.grade) params.append('grade', exportParams.grade);
      if (exportParams.stream) params.append('stream', exportParams.stream);
      if (exportParams.term) params.append('term', exportParams.term);
      if (exportParams.year) params.append('year', exportParams.year);
      if (exportParams.subject) params.append('subject', exportParams.subject);
      if (exportParams.format) params.append('export_format', exportParams.format);

      let endpoint = 'academics/generate-academic-report/';
      if (exportParams.report_type === 'Overall Academic Performance') endpoint = 'reports/school-performance/';
      else if (exportParams.report_type === 'Grade-wise Summary') endpoint = 'reports/class-grade-analysis/';
      else if (exportParams.report_type === 'Subject Performance Analysis') endpoint = 'reports/subject-performance/';
      else if (exportParams.report_type === 'Top Performers Report') endpoint = 'reports/student-ranking/';
      else if (exportParams.report_type === 'Competency Heatmap') endpoint = 'reports/competency-heatmap/';

      const r = await students.get(`${endpoint}?${params.toString()}`, { responseType: 'blob' });
      const contentType = (r.headers && (r.headers['content-type'] || r.headers['Content-Type'])) || '';
      if (!contentType.toLowerCase().includes('pdf')) {
        try {
          const dec = new TextDecoder('utf-8');
          const text = dec.decode(r.data);
          console.error('generate academic report: non-pdf response body:\n', text);
          setError('Failed to generate academic report: server returned non-PDF response (see console).');
        } catch (decodeErr) {
          console.error('generate academic report: could not decode non-pdf response', decodeErr, r);
          setError('Failed to generate academic report: invalid server response.');
        }
      } else {
        const blob = new Blob([r.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const safeName = (exportParams.report_type || 'academic_report').replace(/\s+/g, '_');
        const a = Object.assign(document.createElement('a'), { href: url, download: `${safeName}.pdf`, style: 'display:none' });
        document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
        setSuccessMessage('Academic report generated successfully!');
        handleCloseModal();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('generate academic report error', err);
      const resp = err?.response;
      const msg = resp?.data?.detail || resp?.data || err?.message || 'Unknown error';
      setError(`Failed to generate academic report: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally { setIsGenerating(false); }
  };
  const handleAnalyzePerformance = () => { setSuccessMessage('Performance analysis complete!'); handleCloseModal(); setTimeout(() => setSuccessMessage(''), 3000); };

  const handleGenerateResultPaper = async () => {
    if (!resultPaperParams.grade) { setError('Grade is required to generate result papers'); return; }
    setIsGenerating(true);
    try {
      const params = new URLSearchParams();
      if (resultPaperParams.grade) params.append('grade', resultPaperParams.grade);
      if (resultPaperParams.stream) params.append('stream', resultPaperParams.stream);
      if (resultPaperParams.term) params.append('term', resultPaperParams.term);
      if (resultPaperParams.report_type === 'summative') {
        if (resultPaperParams.exam_type) params.append('exam_type', resultPaperParams.exam_type);
      } else {
        if (resultPaperParams.assessement_type) params.append('assessement_type', resultPaperParams.assessement_type);
      }
      if (resultPaperParams.report_type) params.append('report_type', resultPaperParams.report_type);
      
      const r = await students.get(`academics/generate-result-papers/?${params.toString()}`, { responseType: 'blob' });
      const contentType = (r.headers && (r.headers['content-type'] || r.headers['Content-Type'])) || '';
      
      const isZip = contentType.toLowerCase().includes('zip');
      const isPdf = contentType.toLowerCase().includes('pdf');

      if (!isZip && !isPdf) {
        try {
          const text = await r.data.text();
          console.error('generate result papers: unexpected response body:\n', text);
          setError('Failed to generate result papers: server returned unexpected response.');
        } catch (err) {
          setError('Failed to generate result papers: invalid server response.');
        }
      } else {
        const blob = new Blob([r.data], { type: contentType });
        const url = URL.createObjectURL(blob);
        const safeGrade = (resultPaperParams.grade || 'grade').replace(/\s+/g, '_');
        const ext = isZip ? 'zip' : 'pdf';
        const a = Object.assign(document.createElement('a'), { 
          href: url, 
          download: `result_papers_${resultPaperParams.report_type}_${safeGrade}.${ext}`, 
          style: 'display:none' 
        });
        document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
      }
      setSuccessMessage('Result papers generated successfully!');
      handleCloseModal();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(`Failed to generate papers: ${err.message}`); }
    finally { setIsGenerating(false); }
  };



  const handleGenerateGradeReport = async () => {
    if (!gradeReportParams.grade) { setError('Grade is required to generate report forms'); return; }
    setIsGenerating(true);
    try {
      const params = new URLSearchParams();
      if (gradeReportParams.grade) params.append('grade', gradeReportParams.grade);
      if (gradeReportParams.stream) params.append('stream', gradeReportParams.stream);
      if (gradeReportParams.term) params.append('term', gradeReportParams.term);
      if (gradeReportParams.report_type === 'summative') {
        if (gradeReportParams.exam_type) params.append('exam_type', gradeReportParams.exam_type);
      } else {
        if (gradeReportParams.assessement_type) params.append('assessement_type', gradeReportParams.assessement_type);
      }

      const endpoint = gradeReportParams.report_type === 'summative' 
        ? 'academics/generate-summative-report-forms/' 
        : 'academics/generate-report-forms/';

      const r = await students.get(`${endpoint}?${params.toString()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const safeGrade = (gradeReportParams.grade || 'grade').replace(/\s+/g, '_');
      const a = Object.assign(document.createElement('a'), { href: url, download: `report_forms_${safeGrade}.pdf`, style: 'display:none' });
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);

      setSuccessMessage('Report forms generated successfully!');
      handleCloseModal();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`Failed to generate report forms: ${err.message}`);
    } finally { setIsGenerating(false); }
  };



  const getCbcBadgeColor = (code) => {
    switch(code) {
      case 'EE': return '#10b981';
      case 'ME': return '#6366f1';
      case 'AE': return '#d97706';
      case 'BE': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const generateSubjectReport = async (subject, type = 'pdf') => {
    if (!selectedGrade) {
        setError('Please select a Grade and Stream first to generate subject reports.');
        return;
    }
    
    setIsGenerating(true);
    try {
      const endpoint = type === 'summative' ? 'teacher-portal/reports/learning-area-marks/' : 'teacher-portal/reports/subject-aggregated/';
      const url = `${endpoint}?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(selectedGrade)}&stream=${encodeURIComponent(selectedStream)}&term=${encodeURIComponent(selectedTerm || 'Term 1')}&year=${selectedYear}&format=pdf`;
      
      const response = await students.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${type === 'summative' ? 'Summative' : 'CBA'}_Report_${subject}_${selectedGrade}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setSuccessMessage('Report generated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please ensure data exists for the selected period.');
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'grades', icon: '🏫', label: 'Grade Performance' },
    { key: 'subjects', icon: '📚', label: 'Subject Analysis' },
    { key: 'grading', icon: '📋', label: 'CBC Grading' },
    { key: 'more', icon: '⋯', label: 'More' },
  ];

  const moreActions = [
    { icon: '📊', title: 'Generate Report', desc: 'Export academic reports', action: () => handleOpenModal('export') },
    { icon: '📄', title: 'Result Papers', desc: 'Generate result papers per grade', action: () => handleOpenModal('resultPapers') },
    { icon: '📈', title: 'Performance Analysis', desc: 'Analyze student performance', action: () => handleOpenModal('analyze') },
    { icon: '👤', title: 'Individual Performance', desc: 'View student details', action: () => handleOpenModal('individual') },
    { icon: '📋', title: 'Grade Reports', desc: 'Grade and stream reports', action: () => handleOpenModal('gradeReport') },
    { icon: '⚙️', title: 'Settings', desc: 'Configure academic settings', action: () => handleOpenModal('settings') },
  ];




  return (
    <div className={`ad-root ${animate ? 'ad-ready' : ''}`}>
      <div className="ad-blob ad-blob-1" />
      <div className="ad-blob ad-blob-2" />

      {/* ── ALERTS ── */}
      {successMessage && (
        <div className="ad-alert ad-alert-success">
          <span>✅ {successMessage}</span>
          <button className="ad-alert-close" onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}
      {error && (
        <div className="ad-alert ad-alert-error">
          <span>⚠️ {error}</span>
          <button className="ad-alert-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="ad-header">
        <div className="ad-header-left">
          <div className="ad-header-icon">📚</div>
          <div>
            <h1 className="ad-title">Academic Performance</h1>
            <p className="ad-subtitle">CBC Curriculum — Monitor and analyze student academic performance</p>
          </div>
        </div>
        <div className="ad-header-actions">
          <button className="ad-btn-outline" onClick={() => handleOpenModal('export')}>
            <span>📥</span> Export Report
          </button>
          <button className="ad-btn-primary" onClick={() => handleOpenModal('resultPapers')}>
            <span>📄</span> Result Papers
          </button>
        </div>
      </header>

      {/* ── FILTERS ── */}
      <div className="ad-filters">
        <div className="ad-filter-group">
          <label className="ad-filter-label">Year</label>
          <input className="ad-input" type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} placeholder="e.g. 2024" />
        </div>
        <div className="ad-filter-group">
          <label className="ad-filter-label">Term</label>
          <select className="ad-input" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            <option value="">All Terms</option>
            <option>Term 1</option><option>Term 2</option><option>Term 3</option>
          </select>
        </div>
        <div className="ad-filter-group">
          <label className="ad-filter-label">Grade</label>
          <select className="ad-input" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
            <option value="">All Grades</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="ad-filter-group">
          <label className="ad-filter-label">Assessment Type</label>
          <select className="ad-input" value={assessmentType} onChange={e => setAssessmentType(e.target.value)}>
            <option value="cba">CBA (Competency Based)</option>
            <option value="summative">Summative</option>
          </select>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="ad-stats-grid">
        {academicStats.map((s, i) => (
          <div key={i} className="ad-stat" style={{ '--acc': s.accent, '--delay': `${i * 0.1}s` }}>
            <div className="ad-stat-top">
              <span className="ad-stat-label">{s.title}</span>
            </div>
            <div className="ad-stat-bottom">
              <span className="ad-stat-value">{loading ? '—' : s.value}</span>
              <span className="ad-stat-icon">{s.icon}</span>
            </div>
            <div className="ad-stat-bar"><div className="ad-stat-bar-fill" /></div>
          </div>
        ))}
      </div>

      {/* ── TOP PERFORMERS ── */}
      <section className="ad-section">
        <div className="ad-section-label">
          <span className="ad-section-pill">🏆 Top Performers by Grade</span>
          <div className="ad-section-line" />
        </div>
        {Object.keys(topStudentsByGrade).length === 0 ? (
          <p className="ad-empty-text">No top performer data available for the selected filters.</p>
        ) : (
          <div className="ad-performers-scroll">
            {Object.entries(topStudentsByGrade).map(([grade, studs]) => (
              <div key={grade} className="ad-performers-card">
                <div className="ad-performers-header">
                  <span className="ad-grade-chip">{grade}</span>
                  <span className="ad-performers-count">{(studs||[]).length} students</span>
                </div>
                <div className="ad-performers-list">
                  {(studs || []).slice(0, 3).map((student, idx) => (
                    <div key={idx} className="ad-performer-row">
                      <div className="ad-performer-rank">{idx + 1}</div>
                      <div className="ad-performer-info">
                        <span className="ad-performer-name">{student.name}</span>
                        <span className="ad-performer-stream">{student.stream}</span>
                      </div>
                      <div className="ad-performer-score">
                        <span className="ad-score-label">Avg</span>
                        <span className="ad-score-value">{student.avg_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── TABS ── */}
      <div className="ad-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`ad-tab ${activeTab === t.key ? 'ad-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="ad-two-col">
          {/* Performance Distribution */}
          <div className="ad-card">
            <div className="ad-card-header">
              <div><span className="ad-card-title">Performance Distribution</span><span className="ad-card-sub">CBC level breakdown</span></div>
              <span className="ad-card-badge">📈</span>
            </div>
            <div className="ad-card-body">
              <div className="ad-dist-list">
                {performanceDistribution.map((item, i) => (
                  <div key={i} className="ad-dist-item" style={{ '--delay': `${i * 0.1}s` }}>
                    <div className="ad-dist-meta">
                      <span className="ad-dist-label">{item.grade}</span>
                      <span className="ad-dist-count">{item.count} marks</span>
                    </div>
                    <div className="ad-dist-track">
                      <div className="ad-dist-fill" style={{ width: `${Math.min(item.percentage * 3, 100)}%`, background: item.color, '--delay': `${i * 0.12}s` }} />
                    </div>
                    <span className="ad-dist-pct" style={{ color: item.color }}>{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Learning Areas */}
          <div className="ad-card">
            <div className="ad-card-header">
              <div><span className="ad-card-title">Learning Areas</span><span className="ad-card-sub">Average performance level</span></div>
              <span className="ad-card-badge">📚</span>
            </div>
            <div className="ad-card-body">
              <div className="ad-subject-list">
                {subjectPerformance.length === 0 ? (
                  <p className="ad-empty-text">No learning area data available.</p>
                ) : subjectPerformance.map((s, i) => (
                  <div key={i} className="ad-subject-item">
                    <div className="ad-subject-meta">
                      <span className="ad-subject-name">{s.subject}</span>
                      <span className="ad-subject-level">Level {s.avgLevel.toFixed(1)}</span>
                    </div>
                    <div className="ad-subject-track">
                      <div className="ad-subject-fill" style={{ width: `${(s.avgLevel / 4.0) * 100}%`, '--delay': `${i * 0.08}s` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GRADES TAB ── */}
      {activeTab === 'grades' && (
        <div className="ad-card">
          <div className="ad-card-header">
            <div><span className="ad-card-title">Grade-wise Performance Summary</span><span className="ad-card-sub">All grades</span></div>
            <span className="ad-card-badge">🏫</span>
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Grade</th><th>Students</th>
                  <th><span style={{color:'#10b981'}}>EE</span></th>
                  <th><span style={{color:'#6366f1'}}>ME</span></th>
                  <th><span style={{color:'#d97706'}}>AE</span></th>
                  <th><span style={{color:'#ef4444'}}>BE</span></th>
                  <th>Avg Score</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pieChart.labels.length === 0 ? (
                  <tr><td colSpan="8" className="ad-empty-cell">No grade data available.</td></tr>
                ) : pieChart.labels.map((g, i) => (
                  <tr key={g} className="ad-tr" style={{ '--ri': i }}>
                    <td><span className="ad-grade-chip">{g}</span></td>
                    <td className="ad-num">{pieChart.data[i]}</td>
                    <td><span className="ad-level-badge" style={{background:'rgba(16,185,129,0.15)',color:'#6ee7b7',borderColor:'rgba(16,185,129,0.2)'}}>{gradeDistributions[i]?.EE || 0}</span></td>
                    <td><span className="ad-level-badge" style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',borderColor:'rgba(99,102,241,0.2)'}}>{gradeDistributions[i]?.ME || 0}</span></td>
                    <td><span className="ad-level-badge" style={{background:'rgba(217,119,6,0.15)',color:'#fcd34d',borderColor:'rgba(217,119,6,0.2)'}}>{gradeDistributions[i]?.AE || 0}</span></td>
                    <td><span className="ad-level-badge" style={{background:'rgba(239,68,68,0.15)',color:'#fca5a5',borderColor:'rgba(239,68,68,0.2)'}}>{gradeDistributions[i]?.BE || 0}</span></td>
                    <td className="ad-num ad-bold">{lineChart.data[i]}</td>
                    <td><button className="ad-view-btn" onClick={() => fetchGradeStudents(g)}>View Students</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUBJECTS TAB ── */}
      {activeTab === 'subjects' && (
        <div className="ad-subjects-grid">
          {subjectPerformance.length === 0 ? (
            <p className="ad-empty-text">No subject data available.</p>
          ) : subjectPerformance.map((s, i) => (
            <div key={i} className="ad-subject-card" style={{ '--delay': `${i * 0.08}s` }}>
              <div className="ad-subject-card-header">
                <span className="ad-subject-card-title">{s.subject}</span>
                <span className="ad-subject-level-badge">Level {s.avgLevel.toFixed(2)}</span>
              </div>
              <div className="ad-subject-card-stats">
                <div className="ad-subject-stat"><span>Students</span><strong>{s.students}</strong></div>
              </div>
              <div className="ad-subject-breakdown">
                {[
                  { label: 'Exceeding (EE)', val: s.ee, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)' },
                  { label: 'Meeting (ME)', val: s.me, color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.2)' },
                  { label: 'Approaching (AE)', val: s.ae, color: '#fcd34d', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.2)' },
                  { label: 'Below (BE)', val: s.be, color: '#fca5a5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)' },
                ].map((bd, j) => (
                  <div key={j} className="ad-breakdown-row">
                    <span className="ad-breakdown-label">{bd.label}</span>
                    <span className="ad-breakdown-val" style={{ background: bd.bg, color: bd.color, borderColor: bd.border }}>{bd.val}</span>
                  </div>
                ))}
              </div>
              <div className="ad-subject-actions">
                <button className="ad-btn-report" onClick={() => generateSubjectReport(s.subject, 'pdf')}>
                  <span>📄</span> CBA Report
                </button>
                <button className="ad-btn-summative" onClick={() => generateSubjectReport(s.subject, 'summative')}>
                  <span>📊</span> Summative
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── GRADING TAB ── */}
      {activeTab === 'grading' && (
        <div className="ad-card">
          <div className="ad-card-header">
            <div><span className="ad-card-title">CBC Grading Scale</span><span className="ad-card-sub">Competency levels explained</span></div>
            <span className="ad-card-badge">📋</span>
          </div>
          <div className="ad-card-body">
            <div className="ad-grading-list">
              {cbcGradingScale.map((item, i) => (
                <div key={i} className="ad-grading-item" style={{ '--acc': item.color, '--delay': `${i * 0.1}s` }}>
                  <div className="ad-grading-code" style={{ background: `${item.color}20`, color: item.color, border: `1px solid ${item.color}40` }}>
                    {item.code}
                  </div>
                  <div className="ad-grading-info">
                    <span className="ad-grading-name">{item.name}</span>
                    <span className="ad-grading-desc">{item.description}</span>
                  </div>
                  <div className="ad-grading-range">
                    <span>Level {item.level}</span>
                    <span className="ad-range-val">{item.range}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MORE TAB ── */}
      {activeTab === 'more' && (
        <div className="ad-more-grid">
          {moreActions.map((a, i) => (
            <button key={i} className="ad-action-card" style={{ '--delay': `${i * 0.07}s` }} onClick={a.action}>
              <span className="ad-action-icon">{a.icon}</span>
              <span className="ad-action-title">{a.title}</span>
              <span className="ad-action-desc">{a.desc}</span>
              <span className="ad-action-arrow">→</span>
              <div className="ad-action-shine" />
            </button>
          ))}
        </div>
      )}

      {/* ══════════════ MODALS ══════════════ */}
      {showModal && (
        <div className="ad-overlay" onClick={handleCloseModal}>
          <div className={`ad-modal ${['gradeStudents','studentStrands', 'studentCompetencies', 'subjectCompetencies', 'gradeCompetencies'].includes(modalType) ? 'ad-modal-xl' : ''}`} onClick={e => e.stopPropagation()}>

            {/* ── GRADE STUDENTS ── */}
            {modalType === 'gradeStudents' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>🏫</span> Students — {selectedModalGrade}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="ad-btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => fetchGradeCompetencies(selectedModalGrade)}>📊 Grade Competencies</button>
                    <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                  </div>
                </div>
                <div className="ad-modal-body">
                  {loadingGradeStudents ? (
                    <div className="ad-loading"><div className="ad-spinner" /><span>Loading students…</span></div>
                  ) : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead><tr><th>Reg No</th><th>Name</th><th>Stream</th><th>Avg Score</th><th>Avg Level</th><th>CBC Level</th><th>Action</th></tr></thead>
                        <tbody>
                          {gradeStudents.length === 0
                            ? <tr><td colSpan="7" className="ad-empty-cell">No students found.</td></tr>
                            : gradeStudents.map((stud, i) => (
                              <tr key={stud.registration_no} className="ad-tr" style={{ '--ri': i }}>
                                <td className="ad-mono">{stud.registration_no}</td>
                                <td className="ad-bold">{stud.name}</td>
                                <td className="ad-muted">{stud.stream}</td>
                                <td className="ad-num">{stud.avg_score}</td>
                                <td><span className="ad-level-badge" style={{background:'rgba(16,185,129,0.15)',color:'#6ee7b7',borderColor:'rgba(16,185,129,0.2)'}}>{stud.avg_level}</span></td>
                                <td><span className="ad-level-badge" style={{background:`${getCbcBadgeColor(stud.cbc_level)}20`,color:getCbcBadgeColor(stud.cbc_level),borderColor:`${getCbcBadgeColor(stud.cbc_level)}40`}}>{stud.cbc_level}</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="ad-view-btn" onClick={() => fetchStudentStrands(stud)}>Strands</button>
                                    <button className="ad-view-btn" style={{background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)'}} onClick={() => fetchStudentCompetencies(stud)}>Competencies</button>
                                    <button className="ad-view-btn" style={{background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)'}} onClick={() => handleOpenReview(stud)}>Review</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* ── STUDENT STRANDS ── */}
            {modalType === 'studentStrands' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>👤</span> {selectedStudent?.name} — Sub-strand Performance</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  <div className="ad-strand-meta">
                    <span className="ad-chip">{selectedStudent?.registration_no}</span>
                    <span className="ad-chip">{selectedStudent?.grade} {selectedStudent?.stream}</span>
                    <span className="ad-chip" style={{background:`${getCbcBadgeColor(selectedStudent?.cbc_level)}20`,color:getCbcBadgeColor(selectedStudent?.cbc_level),borderColor:`${getCbcBadgeColor(selectedStudent?.cbc_level)}40`}}>
                      {selectedStudent?.cbc_level} ({selectedStudent?.avg_level})
                    </span>
                    <select className="ad-input ad-input-sm" value={strandSubjectFilter} onChange={e => setStrandSubjectFilter(e.target.value)}>
                      <option value="">All Learning Areas</option>
                      {Array.from(new Set(studentStrands.map(s => s.subject))).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                  {loadingStrands ? (
                    <div className="ad-loading"><div className="ad-spinner" /><span>Loading strands…</span></div>
                  ) : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead><tr><th>Learning Area</th><th>Strand</th><th>Sub-strand</th><th>Score</th><th>Level</th><th>Remark</th></tr></thead>
                        <tbody>
                          {studentStrands.filter(s => strandSubjectFilter ? s.subject === strandSubjectFilter : true).length === 0
                            ? <tr><td colSpan="6" className="ad-empty-cell">No sub-strand assessments recorded.</td></tr>
                            : studentStrands.filter(s => strandSubjectFilter ? s.subject === strandSubjectFilter : true).map(strand => {
                              const c = [,'#10b981','#d97706','#6366f1','#10b981'][strand.level] || '#6b7280';
                              return (
                                <tr key={strand.id} className="ad-tr">
                                  <td className="ad-bold" style={{color:'#a5b4fc'}}>{strand.subject}</td>
                                  <td>{strand.strand}</td>
                                  <td>{strand.sub_strand}</td>
                                  <td className="ad-num ad-bold">{strand.score}</td>
                                  <td><span className="ad-level-badge" style={{background:`${c}20`,color:c,borderColor:`${c}40`}}>L{strand.level} ({strand.level_name?.substring(0,2)})</span></td>
                                  <td className="ad-muted">{strand.remark}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={() => handleOpenModal('gradeStudents')}>← Back</button>
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* ── STUDENT COMPETENCIES ── */}
            {modalType === 'studentCompetencies' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>🌟</span> {selectedStudent?.name} — Overall Competencies</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  {loadingCompetencies ? (
                    <div className="ad-loading"><div className="ad-spinner" /><span>Loading competencies…</span></div>
                  ) : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead><tr><th>Competency</th><th>Avg Score</th><th>Level</th><th>Action</th></tr></thead>
                        <tbody>
                          {!studentCompetencies?.overall_competencies || studentCompetencies.overall_competencies.length === 0
                            ? <tr><td colSpan="4" className="ad-empty-cell">No competencies recorded.</td></tr>
                            : studentCompetencies.overall_competencies.map((comp, i) => {
                              const c = [,'#ef4444','#d97706','#6366f1','#10b981'][Math.round(comp.avg_level)] || '#6b7280';
                              return (
                                <tr key={i} className="ad-tr">
                                  <td className="ad-bold">{comp.competency}</td>
                                  <td className="ad-num">{comp.avg_level}</td>
                                  <td><span className="ad-level-badge" style={{background:`${c}20`,color:c,borderColor:`${c}40`}}>{comp.level_name}</span></td>
                                  <td>
                                    <button className="ad-view-btn" onClick={() => {
                                      setSelectedCompetency(comp.competency);
                                      setModalType('subjectCompetencies');
                                    }}>View by Subject</button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={() => setModalType('gradeStudents')}>← Back</button>
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* ── SUBJECT COMPETENCIES ── */}
            {modalType === 'subjectCompetencies' && (() => {
              const subjectDataForComp = [];
              if (studentCompetencies?.subject_competencies) {
                Object.entries(studentCompetencies.subject_competencies).forEach(([subject, comps]) => {
                  const comp = comps.find(c => c.competency === selectedCompetency);
                  if (comp) subjectDataForComp.push({ subject, ...comp });
                });
              }
              return (
                <>
                  <div className="ad-modal-header">
                    <div className="ad-modal-title"><span>📘</span> {selectedStudent?.name} — {selectedCompetency} by Subject</div>
                    <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                  </div>
                  <div className="ad-modal-body">
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead><tr><th>Subject</th><th>Avg Score</th><th>Level</th></tr></thead>
                        <tbody>
                          {subjectDataForComp.length === 0
                            ? <tr><td colSpan="3" className="ad-empty-cell">No subject data found for this competency.</td></tr>
                            : subjectDataForComp.map((item, i) => {
                              const c = [,'#ef4444','#d97706','#6366f1','#10b981'][Math.round(item.avg_level)] || '#6b7280';
                              return (
                                <tr key={i} className="ad-tr">
                                  <td className="ad-bold" style={{color:'#a5b4fc'}}>{item.subject}</td>
                                  <td className="ad-num">{item.avg_level}</td>
                                  <td><span className="ad-level-badge" style={{background:`${c}20`,color:c,borderColor:`${c}40`}}>{item.level_name}</span></td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="ad-modal-footer">
                    <button className="ad-btn-cancel" onClick={() => setModalType('studentCompetencies')}>← Back</button>
                    <button className="ad-btn-cancel" onClick={handleCloseModal}>Close</button>
                  </div>
                </>
              );
            })()}

            {/* ── GRADE COMPETENCIES ── */}
            {modalType === 'gradeCompetencies' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>📊</span> {selectedModalGrade} — Grade Competency Analysis</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  {loadingGradeCompetencies ? (
                    <div className="ad-loading"><div className="ad-spinner" /><span>Loading analysis…</span></div>
                  ) : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>Competency</th>
                            <th><span style={{color:'#10b981'}}>EE</span></th>
                            <th><span style={{color:'#6366f1'}}>ME</span></th>
                            <th><span style={{color:'#d97706'}}>AE</span></th>
                            <th><span style={{color:'#ef4444'}}>BE</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradeCompetencies.length === 0
                            ? <tr><td colSpan="5" className="ad-empty-cell">No competency analysis available.</td></tr>
                            : gradeCompetencies.map((comp, i) => (
                              <tr key={i} className="ad-tr">
                                <td className="ad-bold">{comp.competency}</td>
                                <td><span className="ad-level-badge" style={{background:'rgba(16,185,129,0.15)',color:'#6ee7b7',borderColor:'rgba(16,185,129,0.2)'}}>{comp.distributions['Exceeding Expectations'] || 0}</span></td>
                                <td><span className="ad-level-badge" style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',borderColor:'rgba(99,102,241,0.2)'}}>{comp.distributions['Meeting Expectation'] || 0}</span></td>
                                <td><span className="ad-level-badge" style={{background:'rgba(217,119,6,0.15)',color:'#fcd34d',borderColor:'rgba(217,119,6,0.2)'}}>{comp.distributions['Approaching Expectation'] || 0}</span></td>
                                <td><span className="ad-level-badge" style={{background:'rgba(239,68,68,0.15)',color:'#fca5a5',borderColor:'rgba(239,68,68,0.2)'}}>{comp.distributions['Below Expectation'] || 0}</span></td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={() => setModalType('gradeStudents')}>← Back</button>
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* ── EXPORT ── */}
            {modalType === 'export' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>📊</span> Generate Academic Report</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  <div className="ad-form-grid">
                    <div className="ad-form-group ad-span-2">
                      <label className="ad-label">Report Type</label>
                      <select className="ad-input" value={exportParams.report_type} onChange={e => setExportParams({...exportParams, report_type: e.target.value})}>
                        <option>Overall Academic Performance</option>
                        <option>Grade-wise Summary</option>
                        <option>Subject Performance Analysis</option>
                        <option>Top Performers Report</option>
                        <option>Competency Heatmap</option>
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Select Grade</label>
                      <select className="ad-input" value={exportParams.grade} onChange={e => setExportParams({...exportParams, grade: e.target.value})}>
                        <option value="">All Grades</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Format</label>
                      <select className="ad-input" value={exportParams.format} onChange={e => setExportParams({...exportParams, format: e.target.value})}>
                        <option>PDF</option>
                        <option>Excel</option>
                        <option>CSV</option>
                      </select>
                    </div>
                    {exportParams.report_type === 'Subject Performance Analysis' && (
                      <div className="ad-form-group">
                        <label className="ad-label">Subject</label>
                        <select className="ad-input" value={exportParams.subject} onChange={e => setExportParams({...exportParams, subject: e.target.value})}>
                          <option value="">All Subjects</option>
                          {learningAreas.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="ad-form-group">
                      <label className="ad-label">Select Stream</label>
                      <select className="ad-input" value={exportParams.stream} onChange={e => setExportParams({...exportParams, stream: e.target.value})}>
                        <option value="">All Streams</option>
                        {streams.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Select Term</label>
                      <select className="ad-input" value={exportParams.term} onChange={e => setExportParams({...exportParams, term: e.target.value})}>
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Select Year</label>
                      <input type="number" className="ad-input" value={exportParams.year} onChange={e => setExportParams({...exportParams, year: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ad-btn-save" onClick={handleExportReport}>Generate & Download</button>
                </div>
              </>
            )}

            {/* ── RESULTS ── */}
            {modalType === 'resultPapers' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>📄</span> Generate Result Papers</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  <div className="ad-form-grid">
                    <div className="ad-form-group">
                      <label className="ad-label">Report Type <span className="ad-req">*</span></label>
                      <select className="ad-input" value={resultPaperParams.report_type} onChange={e => setResultPaperParams({...resultPaperParams, report_type: e.target.value})}>
                        <option value="cba">CBA (Competency Based)</option>
                        <option value="summative">Summative (Learning Area Marks)</option>
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Grade <span className="ad-req">*</span></label>
                      <select className="ad-input" value={resultPaperParams.grade} onChange={e => setResultPaperParams({...resultPaperParams, grade: e.target.value})}>
                        <option value="">Select Grade...</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Stream</label>
                      <select className="ad-input" value={resultPaperParams.stream} onChange={e => setResultPaperParams({...resultPaperParams, stream: e.target.value})}>
                        <option value="">All Streams</option>
                        {streams.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Term</label>
                      <select className="ad-input" value={resultPaperParams.term} onChange={e => setResultPaperParams({...resultPaperParams, term: e.target.value})}>
                        <option value="">All Terms</option><option value="Term 1">Term 1</option><option value="Term 2">Term 2</option><option value="Term 3">Term 3</option>
                      </select>
                    </div>
                    {resultPaperParams.report_type === 'summative' ? (
                      <div className="ad-form-group">
                        <label className="ad-label">Type of Exam <span className="ad-req">*</span></label>
                        <select className="ad-input" value={resultPaperParams.exam_type} onChange={e => setResultPaperParams({...resultPaperParams, exam_type: e.target.value})}>
                          <option value="Opener">Opener</option>
                          <option value="Mid Term">Mid Term</option>
                          <option value="End Term">End Term</option>
                        </select>
                      </div>
                    ) : (
                      <div className="ad-form-group">
                        <label className="ad-label">Assessment Type</label>
                        <select className="ad-input" value={resultPaperParams.assessement_type} onChange={e => setResultPaperParams({...resultPaperParams, assessement_type: e.target.value})}>
                          <option value="">Select Type...</option>
                          <option value="SBA-Written">SBA-Written (Written)</option>
                          <option value="SBA-Project">SBA-Project (Project)</option>
                          <option value="SBA-Practical">SBA-Practical (Practical)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ad-btn-save" onClick={handleGenerateResultPaper} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate Papers'}
                  </button>
                </div>
              </>
            )}

             {/* ── ANALYZE ── */}
            {modalType === 'analyze' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>📈</span> Performance Analysis</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  <div className="ad-form-grid">
                    <div className="ad-form-group ad-span-2">
                      <label className="ad-label">Analysis Type</label>
                      <select className="ad-input"><option>Overall Performance Trend</option><option>Grade Comparison</option><option>Subject Performance</option><option>Student Progress</option></select>
                    </div>
                    <div className="ad-form-group ad-span-2">
                      <label className="ad-label">Time Period</label>
                      <select className="ad-input"><option>This Term</option><option>Last 3 Months</option><option>Last 6 Months</option><option>This Year</option></select>
                    </div>
                    <div className="ad-form-group ad-span-2">
                      <label className="ad-label">Include</label>
                      <div className="ad-checks">
                        <label className="ad-check"><input type="checkbox" defaultChecked /><span>Grade Comparison</span></label>
                        <label className="ad-check"><input type="checkbox" defaultChecked /><span>Subject Analysis</span></label>
                        <label className="ad-check"><input type="checkbox" defaultChecked /><span>Trend Analysis</span></label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ad-btn-save" onClick={handleAnalyzePerformance}>Analyze</button>
                </div>
              </>
            )}

            {/* ── INDIVIDUAL ── */}
            {modalType === 'individual' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>👤</span> Individual Student Performance</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  <div className="ad-form-grid">
                    <div className="ad-form-group ad-span-2"><label className="ad-label">Search Student</label><input className="ad-input" type="text" placeholder="Search student name..." /></div>
                    <div className="ad-form-group"><label className="ad-label">Grade</label><select className="ad-input" value={selectedModalGrade} onChange={e => setSelectedModalGrade(e.target.value)}><option value="">Select Grade...</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                    <div className="ad-form-group"><label className="ad-label">View Period</label><select className="ad-input"><option>Current Term</option><option>Last Term</option><option>This Year</option></select></div>
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ad-btn-save" onClick={handleCloseModal}>View Performance</button>
                </div>
              </>
            )}

            {/* ── GRADE REPORT ── */}
            {modalType === 'gradeReport' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>📋</span> Grade & Stream Reports</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  <div className="ad-form-grid">
                    <div className="ad-form-group ad-span-2">
                       <label className="ad-label">Report Format</label>
                       <div className="ad-checks">
                         <label className="ad-check">
                           <input 
                             type="radio" 
                             name="reportType" 
                             checked={gradeReportParams.report_type === 'cba'} 
                             onChange={() => setGradeReportParams({...gradeReportParams, report_type: 'cba'})} 
                           />
                           <span>CBA Format (Competency Based)</span>
                         </label>
                         <label className="ad-check">
                           <input 
                             type="radio" 
                             name="reportType" 
                             checked={gradeReportParams.report_type === 'summative'} 
                             onChange={() => setGradeReportParams({...gradeReportParams, report_type: 'summative'})} 
                           />
                           <span>Summative Format (Marks Based)</span>
                         </label>
                       </div>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Grade <span className="ad-req">*</span></label>
                      <select className="ad-input" value={gradeReportParams.grade} onChange={e => setGradeReportParams({...gradeReportParams, grade: e.target.value})}>
                        <option value="">Select Grade...</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Stream</label>
                      <select className="ad-input" value={gradeReportParams.stream} onChange={e => setGradeReportParams({...gradeReportParams, stream: e.target.value})} disabled={!gradeReportParams.grade}>
                        <option value="">All Streams</option>
                        {streams.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label className="ad-label">Term</label>
                      <select className="ad-input" value={gradeReportParams.term} onChange={e => setGradeReportParams({...gradeReportParams, term: e.target.value})}>
                        <option value="">All Terms</option><option value="Term 1">Term 1</option><option value="Term 2">Term 2</option><option value="Term 3">Term 3</option>
                      </select>
                    </div>
                    {gradeReportParams.report_type === 'summative' ? (
                      <div className="ad-form-group">
                        <label className="ad-label">Type of Exam <span className="ad-req">*</span></label>
                        <select className="ad-input" value={gradeReportParams.exam_type} onChange={e => setGradeReportParams({...gradeReportParams, exam_type: e.target.value})}>
                          <option value="Opener">Opener</option>
                          <option value="Mid Term">Mid Term</option>
                          <option value="End Term">End Term</option>
                        </select>
                      </div>
                    ) : (
                      <div className="ad-form-group">
                        <label className="ad-label">Assessment Type</label>
                        <select className="ad-input" value={gradeReportParams.assessement_type} onChange={e => setGradeReportParams({...gradeReportParams, assessement_type: e.target.value})}>
                          <option value="">Select Type...</option>
                          <option value="SBA-Written">SBA-Written (Written)</option>
                          <option value="SBA-Project">SBA-Project (Project)</option>
                          <option value="SBA-Practical">SBA-Practical (Practical)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ad-btn-save" onClick={handleGenerateGradeReport} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </>
            )}

            {/* ── SETTINGS ── */}
            {modalType === 'settings' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>⚙️</span> Academic Settings</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  <div className="ad-form-grid">
                    <div className="ad-form-group ad-span-2"><label className="ad-label">Grading System</label><select className="ad-input"><option>CBC (Competency Based Curriculum)</option><option>8-4-4 System</option></select></div>
                    <div className="ad-form-group"><label className="ad-label">Pass Mark</label><input className="ad-input" type="number" defaultValue="40" /></div>
                    <div className="ad-form-group"><label className="ad-label">Total Marks / Subject</label><input className="ad-input" type="number" defaultValue="100" /></div>
                    <div className="ad-form-group ad-span-2">
                      <div className="ad-checks">
                        <label className="ad-check"><input type="checkbox" defaultChecked /><span>Enable GPA Calculation</span></label>
                        <label className="ad-check"><input type="checkbox" defaultChecked /><span>Show Grade Distribution</span></label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ad-btn-save" onClick={handleCloseModal}>Save Settings</button>
                </div>
              </>
            )}

            {/* ── REVIEW PERFORMANCE ── */}
            {modalType === 'reviewPerformance' && (
              <>
                <div className="ad-modal-header">
                  <div className="ad-modal-title"><span>📝</span> Review Performance — {selectedStudent?.name}</div>
                  <button className="ad-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ad-modal-body">
                  <div className="d-flex justify-content-between align-items-center mb-3" style={{borderBottom: '1px solid #374151', paddingBottom: '10px'}}>
                    <h6 className="fw-bold mb-0" style={{color: '#a5b4fc'}}>Performance for {selectedTerm || 'Term 1'} {selectedYear || new Date().getFullYear()}</h6>
                    <div className="btn-group" role="group" style={{display: 'flex', gap: '5px'}}>
                      <button 
                        type="button" 
                        className={`btn btn-sm ${reviewSystem === 'cba' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                        onClick={() => setReviewSystem('cba')}
                        style={{fontSize: '0.8rem', padding: '4px 10px', borderRadius: '4px'}}
                      >
                        CBA (Strands)
                      </button>
                      <button 
                        type="button" 
                        className={`btn btn-sm ${reviewSystem === 'summative' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                        onClick={() => setReviewSystem('summative')}
                        style={{fontSize: '0.8rem', padding: '4px 10px', borderRadius: '4px'}}
                      >
                        Summative Marks
                      </button>
                    </div>
                  </div>

                  {isFetchingReviewData ? (
                    <div className="text-center py-4"><div className="ad-spinner" style={{margin: '0 auto'}} /></div>
                  ) : (
                    <div className="mb-4">
                      {reviewSystem === 'summative' && (
                        reviewPerformanceData.summative && reviewPerformanceData.summative.length > 0 ? (
                          <div className="mb-3">
                            <span className="badge bg-primary mb-2" style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }}>Summative Marks</span>
                            <div className="d-flex flex-wrap gap-2" style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                              {reviewPerformanceData.summative.map(m => (
                                <span key={m.id} className="badge bg-light text-dark border p-2" style={{ fontSize: '0.85rem', borderRadius: '4px' }}>
                                  {m.subject || m.exam_type || 'Exam'}: <strong className="text-primary">{m.score || m.total_marks}%</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted fst-italic text-center py-3 border rounded bg-light" style={{color: '#9ca3af', background: '#1f2937', padding: '15px', borderRadius: '6px', textAlign: 'center'}}>No summative marks found for this term.</div>
                        )
                      )}

                      {reviewSystem === 'cba' && (
                        reviewPerformanceData.cbc && reviewPerformanceData.cbc.length > 0 ? (
                          <div>
                            <span className="badge bg-success mb-2" style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }}>CBC Levels (Aggregated)</span>
                            <div className="d-flex flex-wrap gap-2" style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                              {reviewPerformanceData.cbc.map((c, idx) => (
                                <span key={c.id || idx} className="badge bg-light text-dark border p-2" style={{ fontSize: '0.85rem', borderRadius: '4px' }}>
                                  {c.subject || c.competency}: <strong className="text-success">{c.level ? `Level ${c.level}` : (c.rating || 'N/A')}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted fst-italic text-center py-3 border rounded bg-light" style={{color: '#9ca3af', background: '#1f2937', padding: '15px', borderRadius: '6px', textAlign: 'center'}}>No CBA strands data found for this term.</div>
                        )
                      )}
                    </div>
                  )}

                  <div className="ad-form-group">
                    <label className="ad-label">Headteacher Comment</label>
                    <textarea 
                      className="ad-input" 
                      rows={5} 
                      placeholder="Enter overall headteacher comment..."
                      value={headteacherComment}
                      onChange={e => setHeadteacherComment(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-cancel" onClick={() => handleOpenModal('gradeStudents')}>← Back</button>
                  <button className="ad-btn-save" onClick={handleSaveReview} disabled={isSavingComment}>
                    {isSavingComment ? 'Saving...' : 'Save Comment'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>

  );
}