import React, { useState, useEffect } from 'react';
import './AttendanceDashboard.css';
import students from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import { useGradesAndStreams } from '../../../hooks/useGradesAndStreams';

export default function AttendanceDashboard() {
  const { showMessage } = useMessage();
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);

  const [attendanceStats, setAttendanceStats] = useState([
    { title: 'Total Students', value: 0, icon: '👥', accent: '#6366f1' },
    { title: 'Present Today', value: 0, icon: '✅', accent: '#10b981' },
    { title: 'Absent Today', value: 0, icon: '❌', accent: '#ef4444' },
    { title: 'Attendance Rate', value: '0%', icon: '📊', accent: '#0891b2' },
  ]);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [gradeAttendanceData, setGradeAttendanceData] = useState([]);
  const [filters, setFilters] = useState({ grade: '', stream: '', term: '', status: '', date_from: '', date_to: '', search: '' });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printGrade, setPrintGrade] = useState('');
  const [printStream, setPrintStream] = useState('');
  const [printTerm, setPrintTerm] = useState('');

  const { grades, streams } = useGradesAndStreams(students, 
    modalType === 'export' ? exportGrade : 
    showPrintModal ? printGrade : 
    filters.grade
  );

  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState([
    { month: 'Jan', rate: 92.5 }, { month: 'Feb', rate: 93.2 },
    { month: 'Mar', rate: 91.8 }, { month: 'Apr', rate: 94.1 },
    { month: 'May', rate: 92.9 }, { month: 'Jun', rate: 93.5 },
  ]);

  const [attendanceStatus, setAttendanceStatus] = useState([
    { status: 'Present', count: 0, percentage: 0, color: '#10b981' },
    { status: 'Absent', count: 0, percentage: 0, color: '#ef4444' },
    { status: 'Late', count: 0, percentage: 0, color: '#d97706' },
  ]);

  // Export modal state
  const [exportType, setExportType] = useState('Attendance Summary Report');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportFormat, setExportFormat] = useState('PDF');
  const [exportGrade, setExportGrade] = useState('');

  // Notification modal state
  const [notificationTarget, setNotificationTarget] = useState('All Parents');
  const [notificationType, setNotificationType] = useState('Daily Attendance Summary');
  const [notificationMessage, setNotificationMessage] = useState('');

  // Settings modal state
  const [setting_start_time, set_setting_start_time] = useState('08:00');
  const [setting_late_threshold, set_setting_late_threshold] = useState(15);
  const [setting_min_attendance, set_setting_min_attendance] = useState(75);
  const [setting_auto_mark_absent, set_setting_auto_mark_absent] = useState(true);
  const [setting_daily_summary, set_setting_daily_summary] = useState(true);
  const [setting_alert_low_attendance, set_setting_alert_low_attendance] = useState(true);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const [statsRes, gradeRes, monthlyRes] = await Promise.all([
        students.get('students/stats/'),
        students.get('attendance/by-grade/'),
        students.get('students/attendance/monthly/'),
      ]);
      const overallStats = statsRes.data || {};
      const gradeData = Array.isArray(gradeRes.data) ? gradeRes.data : [];
      const monthlyData = Array.isArray(monthlyRes.data) ? monthlyRes.data : [];
      setGradeAttendanceData(gradeData);
      if (monthlyData.length > 0) setMonthlyAttendanceData(monthlyData);
      const totalStudents = overallStats.total_students || gradeData.reduce((s, g) => s + (g.totalStudents || 0), 0);
      const totalPresent = gradeData.reduce((s, g) => s + (g.present || 0), 0);
      const totalAbsent = gradeData.reduce((s, g) => s + (g.absent || 0), 0);
      const rate = totalStudents > 0 ? (totalPresent / totalStudents * 100) : 0;
      setAttendanceStats([
        { title: 'Total Students', value: totalStudents, icon: '👥', accent: '#6366f1' },
        { title: 'Present Today', value: totalPresent, icon: '✅', accent: '#10b981' },
        { title: 'Absent Today', value: totalAbsent, icon: '❌', accent: '#ef4444' },
        { title: 'Attendance Rate', value: `${rate.toFixed(1)}%`, icon: '📊', accent: '#0891b2' },
      ]);
      setAttendanceStatus([
        { status: 'Present', count: totalPresent, percentage: totalStudents ? Math.round((totalPresent / totalStudents) * 100) : 0, color: '#10b981' },
        { status: 'Absent', count: totalAbsent, percentage: totalStudents ? Math.round((totalAbsent / totalStudents) * 100) : 0, color: '#ef4444' },
        { status: 'Late', count: 0, percentage: 0, color: '#d97706' },
      ]);
      await fetchRecords({});
      setLoading(false);
    } catch (err) {
      setLoading(false);
      try { showMessage({ type: 'error', text: 'Failed to load attendance data.' }); } catch {}
    }
  };

  const fetchRecords = async (appliedFilters = {}) => {
    try {
      setLoading(true);
      const res = await students.get('attendance/all/', { params: appliedFilters });
      
      // Automatically extract records and available filters
      const allData = Array.isArray(res.data) ? res.data : (res.data.records || []);

      setAttendanceRecords(allData.slice(0, 12).map((r, i) => ({
        id: `${r.registration_no}_${r.date}_${i}`,
        student: r.student_name || r.registration_no,
        grade: r.grade, date: r.date,
        status: (r.status || '').toLowerCase() || 'unknown',
        remarks: r.remarks || ''
      })));
      setLoading(false);
    } catch {
      setAttendanceRecords([]); setLoading(false);
    }
  };

  const handleOpenModal = (type, data = null) => {
    setModalType(type);
    if (type === 'statement' && data) setSelectedAttendance(data);
    setShowModal(true);
    if (type === 'settings') {
      (async () => {
        try {
          const res = await students.get('attendance/settings/');
          const s = res.data?.settings || {};
          set_setting_start_time(s.start_time || '08:00');
          set_setting_late_threshold(s.late_threshold || 15);
          set_setting_min_attendance(s.min_attendance || 75);
          set_setting_auto_mark_absent(s.auto_mark_absent ?? true);
          set_setting_daily_summary(s.daily_summary ?? true);
          set_setting_alert_low_attendance(s.alert_low_attendance ?? true);
        } catch {}
      })();
    }
  };
  const handleCloseModal = () => { setShowModal(false); setModalType(''); setSelectedAttendance(null); };

  const handleExportReport = async () => {
    try {
      if (exportType.includes('Grade') && exportFormat === 'PDF' && exportGrade) {
        const params = { grade: exportGrade };
        if (exportFrom) params.date_from = exportFrom;
        if (exportTo) params.date_to = exportTo;
        const res = await students.get('reports/print_attendance_sheet/', { params, responseType: 'blob' });
        window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
        handleCloseModal(); return;
      }
      let endpoint = 'reports/generate_attendance_report/';
      if (exportType === 'Attendance Summary Report') endpoint = 'reports/attendance-summary/';

      const params = { report_type: exportType, export_format: exportFormat, date_from: exportFrom, date_to: exportTo, grade: exportGrade };
      const res = await students.get(endpoint, { params, responseType: exportFormat === 'PDF' ? 'blob' : 'json' });
      if (exportFormat === 'PDF') window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
      else try { showMessage({ type: 'success', text: res.data?.message || 'Report generated' }); } catch {}
      handleCloseModal();
    } catch { try { showMessage({ type: 'error', text: 'Failed to generate report' }); } catch {} }
  };

  const handleSendNotification = async () => {
    try {
      const res = await students.post('notifications/send/', { target: notificationTarget, type: notificationType, message: notificationMessage });
      try { showMessage({ type: 'success', text: res.data?.message || 'Notifications queued' }); } catch {}
      handleCloseModal();
    } catch { try { showMessage({ type: 'error', text: 'Failed to send notifications' }); } catch {} }
  };

  const handleAnalyzePatterns = async () => {
    try {
      const res = await students.get('attendance/analyze/');
      const m = Array.isArray(res.data.monthly) ? res.data.monthly.length : 0;
      const g = Array.isArray(res.data.by_grade) ? res.data.by_grade.length : 0;
      try { showMessage({ type: 'success', text: `Analysis ready — ${m} months, ${g} grades.` }); } catch {}
      handleCloseModal();
    } catch { try { showMessage({ type: 'error', text: 'Failed to analyze attendance' }); } catch {} }
  };

  const handlePrintGradeAttendance = (grade) => {
    setPrintGrade(grade); setPrintStream(''); setPrintTerm('');
    (async () => {
      try {
        const res = await students.get('streams/', { params: { grade } });
        setPrintStreams(res.data?.streams || []);
      } catch { setPrintStreams([]); }
    })();
    setShowPrintModal(true);
  };

  const confirmPrintGradeAttendance = async () => {
    try {
      setShowPrintModal(false); setLoading(true);
      const params = { grade: printGrade };
      if (printStream) params.stream = printStream;
      if (printTerm) params.term = printTerm;
      const res = await students.get('reports/print_attendance_sheet/', { params, responseType: 'blob' });
      window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
      setLoading(false);
    } catch { setLoading(false); try { showMessage({ type: 'error', text: 'Could not generate PDF.' }); } catch {} }
  };

  const handlePrintStatement = () => {
    if (!selectedAttendance) return;
    const html = `<html><head><title>Attendance Statement</title><style>body{font-family:Arial;padding:20px}</style></head><body><h3>Attendance Statement</h3><p><strong>Student:</strong> ${selectedAttendance.student}</p><p><strong>Grade:</strong> ${selectedAttendance.grade}</p><p><strong>Date:</strong> ${selectedAttendance.date}</p><p><strong>Status:</strong> ${selectedAttendance.status}</p><p><strong>Remarks:</strong> ${selectedAttendance.remarks || 'None'}</p><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),200);};<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handleConfigureSettings = async () => {
    try {
      const res = await students.post('attendance/settings/', {
        start_time: setting_start_time, late_threshold: setting_late_threshold,
        min_attendance: setting_min_attendance, auto_mark_absent: setting_auto_mark_absent,
        daily_summary: setting_daily_summary, alert_low_attendance: setting_alert_low_attendance,
      });
      try { showMessage({ type: 'success', text: res.data?.message || 'Settings saved' }); } catch {}
      handleCloseModal();
    } catch { try { showMessage({ type: 'error', text: 'Failed to save settings' }); } catch {} }
  };

  const getStatusChip = (status) => {
    const map = { present: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)', label: 'Present' }, absent: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)', label: 'Absent' }, late: { color: '#d97706', bg: 'rgba(217,119,6,0.15)', border: 'rgba(217,119,6,0.25)', label: 'Late' } };
    const s = map[status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.25)', label: 'Unknown' };
    return <span className="att-status-chip" style={{ color: s.color, background: s.bg, borderColor: s.border }}>{s.label}</span>;
  };

  const maxRate = Math.max(...monthlyAttendanceData.map(d => Number(d?.rate) || 0), 1);

  const tabs = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'records', icon: '📋', label: 'Records' },
    { key: 'grades', icon: '🏫', label: 'Grade Summary' },
    { key: 'more', icon: '⋯', label: 'More' },
  ];

  const moreActions = [
    { icon: '📊', title: 'Generate Report', desc: 'Export attendance statistics', action: () => handleOpenModal('export') },
    { icon: '📧', title: 'Send Notifications', desc: 'Notify parents about attendance', action: () => handleOpenModal('notify') },
    { icon: '📈', title: 'Analyze Patterns', desc: 'Identify attendance trends', action: () => handleOpenModal('analyze') },
    { icon: '⚙️', title: 'Settings', desc: 'Configure attendance policies', action: () => handleOpenModal('settings') },
    { icon: '📋', title: 'History', desc: 'View historical attendance data', action: () => handleOpenModal('history') },
    { icon: '📞', title: 'Contact Parents', desc: 'Send messages to parents', action: () => handleOpenModal('contact') },
  ];

  return (
    <div className={`att-root ${animate ? 'att-ready' : ''}`}>
      <div className="att-blob att-blob-1" />
      <div className="att-blob att-blob-2" />

      {/* ── HEADER ── */}
      <header className="att-header">
        <div className="att-header-left">
          <div className="att-header-icon">📅</div>
          <div>
            <h1 className="att-title">Attendance Management</h1>
            <p className="att-subtitle">Monitor and analyze student attendance patterns</p>
          </div>
        </div>
        <div className="att-header-actions">
          <button className="att-btn-outline" onClick={() => handleOpenModal('export')}><span>📥</span> Export Report</button>
          <button className="att-btn-primary" onClick={() => handleOpenModal('notify')}><span>📧</span> Send Notification</button>
        </div>
      </header>

      {/* ── STATS ── */}
      <div className="att-stats-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="att-stat att-skeleton" style={{ '--delay': `${i * 0.08}s` }}>
                <div className="sk-line sk-short" /><div className="sk-line sk-long" />
              </div>
            ))
          : attendanceStats.map((s, i) => (
              <div key={i} className="att-stat" style={{ '--acc': s.accent, '--delay': `${i * 0.1}s` }}>
                <div className="att-stat-top"><span className="att-stat-label">{s.title}</span></div>
                <div className="att-stat-bottom">
                  <span className="att-stat-value">{s.value}</span>
                  <span className="att-stat-icon">{s.icon}</span>
                </div>
                <div className="att-stat-bar"><div className="att-stat-bar-fill" /></div>
              </div>
            ))}
      </div>

      {/* ── TABS ── */}
      <div className="att-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`att-tab ${activeTab === t.key ? 'att-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="att-overview-grid">
          {/* Bar chart */}
          <div className="att-card">
            <div className="att-card-header">
              <div><span className="att-card-title">Monthly Attendance Trend</span><span className="att-card-sub">Attendance rate %</span></div>
              <span className="att-card-badge">📈</span>
            </div>
            <div className="att-chart-area">
              <div className="att-bars">
                {monthlyAttendanceData.map((d, i) => {
                  const raw = Number(d?.rate);
                  const h = Number.isFinite(raw) ? Math.max(4, Math.min(100, (raw / maxRate) * 100)) : 4;
                  return (
                    <div key={i} className="att-bar-group" style={{ '--bi': i }}>
                      <div className="att-bar-track">
                        <div className="att-bar" style={{ height: `${h}%`, '--delay': `${i * 0.08}s` }} title={`${d?.rate ?? '-'}%`} />
                      </div>
                      <span className="att-bar-label">{d.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="att-legend">
                <div className="att-legend-item"><span className="att-legend-dot" />Attendance Rate %</div>
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="att-card">
            <div className="att-card-header">
              <div><span className="att-card-title">Today's Status</span><span className="att-card-sub">Attendance breakdown</span></div>
              <span className="att-card-badge">📊</span>
            </div>
            <div className="att-status-body">
              {attendanceStatus.map((item, i) => (
                <div key={i} className="att-status-item" style={{ '--acc': item.color }}>
                  <div className="att-status-left">
                    <div className="att-status-dot" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                    <div className="att-status-info">
                      <span className="att-status-name">{item.status}</span>
                      <span className="att-status-count">{item.count} students</span>
                    </div>
                  </div>
                  <div className="att-status-pct" style={{ color: item.color }}>{item.percentage}%</div>
                </div>
              ))}
              <div className="att-status-track-wrap">
                {attendanceStatus.map((item, i) => (
                  item.percentage > 0 && (
                    <div key={i} className="att-status-seg" style={{ width: `${item.percentage}%`, background: item.color }} title={`${item.status}: ${item.percentage}%`} />
                  )
                ))}
              </div>
              <div className="att-status-total">
                <span>Total Recorded</span>
                <strong>{attendanceStatus.reduce((s, x) => s + x.count, 0)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDS ── */}
      {activeTab === 'records' && (
        <div className="att-card">
          <div className="att-card-header">
            <div><span className="att-card-title">Attendance Records</span><span className="att-card-sub">Recent entries</span></div>
            <span className="att-card-badge">📋</span>
          </div>
          {/* Filters */}
          <div className="att-filter-bar">
            <div className="att-filters-left">
              <div className="att-search-wrap">
                <span>🔍</span>
                <input className="att-input att-search" type="text" placeholder="Name or Reg No" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
              </div>
              <select className="att-input" value={filters.grade} onChange={e => setFilters(f => ({ ...f, grade: e.target.value, stream: '' }))}>
                <option value="">All Grades</option>
                {grades.map((g, i) => <option key={i} value={g}>{g}</option>)}
              </select>
              <select className="att-input" value={filters.stream} onChange={e => setFilters(f => ({ ...f, stream: e.target.value }))}>
                <option value="">All Streams</option>
                {streams.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </select>
              <select className="att-input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">Any Status</option>
                <option value="Present">Present</option><option value="Absent">Absent</option><option value="Late">Late</option>
              </select>
              <input className="att-input" type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
              <input className="att-input" type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
            </div>
            <div className="att-filters-right">
              <button className="att-btn-primary" onClick={() => fetchRecords(filters)}>Apply</button>
              <button className="att-btn-outline" onClick={() => { setFilters({ grade: '', stream: '', term: '', status: '', date_from: '', date_to: '', search: '' }); fetchRecords({}); }}>Reset</button>
            </div>
          </div>
          <div className="att-table-wrap">
            <table className="att-table">
              <thead><tr><th>Student</th><th>Grade</th><th>Date</th><th>Status</th><th>Remarks</th><th>Actions</th></tr></thead>
              <tbody>
                {attendanceRecords.length === 0
                  ? <tr><td colSpan="6" className="att-empty-cell">No attendance records found.</td></tr>
                  : attendanceRecords.map((record, i) => (
                    <tr key={record.id} className="att-tr" style={{ '--ri': i }}>
                      <td className="att-bold">{record.student}</td>
                      <td><span className="att-grade-chip">{record.grade}</span></td>
                      <td className="att-mono">{record.date}</td>
                      <td>{getStatusChip(record.status)}</td>
                      <td className="att-muted">{record.remarks || '—'}</td>
                      <td><button className="att-view-btn" onClick={() => handleOpenModal('statement', record)}>👁 View</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GRADES ── */}
      {activeTab === 'grades' && (
        <div className="att-card">
          <div className="att-card-header">
            <div><span className="att-card-title">Attendance by Grade</span><span className="att-card-sub">Today's summary</span></div>
            <span className="att-card-badge">🏫</span>
          </div>
          <div className="att-table-wrap">
            <table className="att-table">
              <thead><tr><th>Grade</th><th>Students</th><th>Present</th><th>Absent</th><th>Late</th><th>Rate</th><th>Actions</th></tr></thead>
              <tbody>
                {gradeAttendanceData.length === 0
                  ? <tr><td colSpan="7" className="att-empty-cell">No grade data available.</td></tr>
                  : gradeAttendanceData.map((g, i) => {
                    const rate = g.presentRate ?? g.rate ?? 0;
                    return (
                      <tr key={i} className="att-tr" style={{ '--ri': i }}>
                        <td><span className="att-grade-chip">{g.grade}</span></td>
                        <td className="att-num">{g.totalStudents}</td>
                        <td className="att-num att-green att-bold">{g.present}</td>
                        <td className="att-num att-red att-bold">{g.absent}</td>
                        <td className="att-num att-amber">{g.late || 0}</td>
                        <td>
                          <div className="att-prog-cell">
                            <div className="att-prog-track"><div className="att-prog-fill" style={{ width: `${rate}%`, '--delay': `${i * 0.06}s` }} /></div>
                            <span className="att-prog-label">{rate}%</span>
                          </div>
                        </td>
                        <td><button className="att-print-btn" onClick={() => handlePrintGradeAttendance(g.grade)}>🖨️ Print</button></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MORE ── */}
      {activeTab === 'more' && (
        <div className="att-more-grid">
          {moreActions.map((a, i) => (
            <button key={i} className="att-action-card" style={{ '--delay': `${i * 0.07}s` }} onClick={a.action}>
              <span className="att-action-icon">{a.icon}</span>
              <span className="att-action-title">{a.title}</span>
              <span className="att-action-desc">{a.desc}</span>
              <span className="att-action-arrow">→</span>
              <div className="att-action-shine" />
            </button>
          ))}
        </div>
      )}

      {/* ══════════ MODALS ══════════ */}
      {showModal && (
        <div className="att-overlay" onClick={handleCloseModal}>
          <div className="att-modal" onClick={e => e.stopPropagation()}>

            {/* STATEMENT */}
            {modalType === 'statement' && selectedAttendance && (
              <>
                <div className="att-modal-header">
                  <div className="att-modal-title"><span>📋</span> Attendance Statement</div>
                  <button className="att-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="att-modal-body">
                  <div className="att-statement">
                    <div className="att-statement-section">
                      <span className="att-section-label">Student Information</span>
                      {[['Name', selectedAttendance.student], ['Grade', selectedAttendance.grade]].map(([k, v]) => (
                        <div key={k} className="att-stmt-row"><span>{k}</span><strong>{v}</strong></div>
                      ))}
                    </div>
                    <div className="att-statement-section">
                      <span className="att-section-label">Attendance Details</span>
                      <div className="att-stmt-row"><span>Date</span><strong className="att-mono">{selectedAttendance.date}</strong></div>
                      <div className="att-stmt-row"><span>Status</span>{getStatusChip(selectedAttendance.status)}</div>
                      <div className="att-stmt-row"><span>Remarks</span><strong>{selectedAttendance.remarks || 'None'}</strong></div>
                    </div>
                  </div>
                </div>
                <div className="att-modal-footer">
                  <button className="att-btn-cancel" onClick={handleCloseModal}>Close</button>
                  <button className="att-btn-outline" onClick={handlePrintStatement}>🖨️ Print</button>
                </div>
              </>
            )}

            {/* EXPORT */}
            {modalType === 'export' && (
              <>
                <div className="att-modal-header">
                  <div className="att-modal-title"><span>📊</span> Generate Report</div>
                  <button className="att-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="att-modal-body">
                  <div className="att-form-grid">
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Report Type</label>
                      <select className="att-input" value={exportType} onChange={e => setExportType(e.target.value)}>
                        <option>Attendance Summary Report</option>
                        <option>Daily Attendance Report</option><option>Weekly Attendance Report</option>
                        <option>Monthly Attendance Report</option><option>Grade-wise Attendance</option>
                        <option>Student Attendance History</option>
                      </select>
                    </div>
                    <div className="att-form-group">
                      <label className="att-label">Grade</label>
                      <select className="att-input" value={exportGrade} onChange={e => setExportGrade(e.target.value)}>
                        <option value="">All Grades</option>
                        {grades.map((g, i) => <option key={i} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="att-form-group">
                      <label className="att-label">Format</label>
                      <select className="att-input" value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                        <option>PDF</option><option>Excel</option><option>CSV</option>
                      </select>
                    </div>
                    <div className="att-form-group"><label className="att-label">From</label><input className="att-input" type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} /></div>
                    <div className="att-form-group"><label className="att-label">To</label><input className="att-input" type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} /></div>
                  </div>
                </div>
                <div className="att-modal-footer">
                  <button className="att-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="att-btn-save" onClick={handleExportReport}>Generate & Download</button>
                </div>
              </>
            )}

            {/* NOTIFY */}
            {modalType === 'notify' && (
              <>
                <div className="att-modal-header">
                  <div className="att-modal-title"><span>📧</span> Send Notifications</div>
                  <button className="att-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="att-modal-body">
                  <div className="att-form-grid">
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Notification Type</label>
                      <select className="att-input" value={notificationType} onChange={e => setNotificationType(e.target.value)}>
                        <option>Daily Attendance Summary</option><option>Absent Students Alert</option>
                        <option>Low Attendance Warning</option><option>Custom Message</option>
                      </select>
                    </div>
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Send To</label>
                      <select className="att-input" value={notificationTarget} onChange={e => setNotificationTarget(e.target.value)}>
                        <option>All Parents</option><option>Specific Grade</option>
                        <option>Specific Student</option><option>Low Attendance Students</option>
                      </select>
                    </div>
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Message</label>
                      <textarea className="att-input att-textarea" rows={4} placeholder="Enter notification message..." value={notificationMessage} onChange={e => setNotificationMessage(e.target.value)} />
                    </div>
                    <div className="att-form-group att-span-2">
                      <div className="att-checks">
                        <label className="att-check"><input type="checkbox" /><span>Send via SMS</span></label>
                        <label className="att-check"><input type="checkbox" defaultChecked /><span>Send via Email</span></label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="att-modal-footer">
                  <button className="att-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="att-btn-save" onClick={handleSendNotification}>Send Notifications</button>
                </div>
              </>
            )}

            {/* ANALYZE */}
            {modalType === 'analyze' && (
              <>
                <div className="att-modal-header">
                  <div className="att-modal-title"><span>📈</span> Analyze Patterns</div>
                  <button className="att-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="att-modal-body">
                  <div className="att-form-grid">
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Analysis Type</label>
                      <select className="att-input"><option>Overall Attendance Trend</option><option>Grade-wise Comparison</option><option>Student Performance Analysis</option><option>Absence Pattern Detection</option></select>
                    </div>
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Time Period</label>
                      <select className="att-input"><option>Last 7 Days</option><option>Last 30 Days</option><option>Last 3 Months</option><option>This Year</option></select>
                    </div>
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Include</label>
                      <div className="att-checks">
                        <label className="att-check"><input type="checkbox" defaultChecked /><span>Present Students</span></label>
                        <label className="att-check"><input type="checkbox" defaultChecked /><span>Absent Students</span></label>
                        <label className="att-check"><input type="checkbox" defaultChecked /><span>Late Students</span></label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="att-modal-footer">
                  <button className="att-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="att-btn-save" onClick={handleAnalyzePatterns}>Analyze</button>
                </div>
              </>
            )}

            {/* SETTINGS */}
            {modalType === 'settings' && (
              <>
                <div className="att-modal-header">
                  <div className="att-modal-title"><span>⚙️</span> Attendance Settings</div>
                  <button className="att-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="att-modal-body">
                  <div className="att-form-grid">
                    <div className="att-form-group"><label className="att-label">School Start Time</label><input className="att-input" type="time" value={setting_start_time} onChange={e => set_setting_start_time(e.target.value)} /></div>
                    <div className="att-form-group"><label className="att-label">Late Threshold (mins)</label><input className="att-input" type="number" value={setting_late_threshold} onChange={e => set_setting_late_threshold(Number(e.target.value))} /></div>
                    <div className="att-form-group att-span-2"><label className="att-label">Min. Attendance Required (%)</label><input className="att-input" type="number" value={setting_min_attendance} onChange={e => set_setting_min_attendance(Number(e.target.value))} /></div>
                    <div className="att-form-group att-span-2">
                      <div className="att-checks">
                        <label className="att-check"><input type="checkbox" checked={setting_auto_mark_absent} onChange={e => set_setting_auto_mark_absent(e.target.checked)} /><span>Auto-mark absent after 30 mins</span></label>
                        <label className="att-check"><input type="checkbox" checked={setting_daily_summary} onChange={e => set_setting_daily_summary(e.target.checked)} /><span>Send daily attendance summary</span></label>
                        <label className="att-check"><input type="checkbox" checked={setting_alert_low_attendance} onChange={e => set_setting_alert_low_attendance(e.target.checked)} /><span>Alert on low attendance</span></label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="att-modal-footer">
                  <button className="att-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="att-btn-save" onClick={handleConfigureSettings}>Save Settings</button>
                </div>
              </>
            )}

            {/* HISTORY */}
            {modalType === 'history' && (
              <>
                <div className="att-modal-header">
                  <div className="att-modal-title"><span>📋</span> Attendance History</div>
                  <button className="att-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="att-modal-body" style={{ padding: '0' }}>
                  <div className="att-table-wrap" style={{ maxHeight: '50vh' }}>
                    <table className="att-table">
                      <thead><tr><th>Date</th><th>Student</th><th>Grade</th><th>Status</th><th>Remarks</th></tr></thead>
                      <tbody>
                        {attendanceRecords.slice(0, 10).map((r, i) => (
                          <tr key={i} className="att-tr" style={{ '--ri': i }}>
                            <td className="att-mono">{r.date}</td>
                            <td className="att-bold">{r.student}</td>
                            <td><span className="att-grade-chip">{r.grade}</span></td>
                            <td>{getStatusChip(r.status)}</td>
                            <td className="att-muted">{r.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="att-modal-footer">
                  <button className="att-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* CONTACT */}
            {modalType === 'contact' && (
              <>
                <div className="att-modal-header">
                  <div className="att-modal-title"><span>📞</span> Contact Parents</div>
                  <button className="att-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="att-modal-body">
                  <div className="att-form-grid">
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Send To</label>
                      <select className="att-input" value={notificationTarget} onChange={e => setNotificationTarget(e.target.value)}>
                        <option>All Parents</option>{grades.map((g, i) => <option key={i}>{g}</option>)}<option>Low Attendance Students</option>
                      </select>
                    </div>
                    <div className="att-form-group att-span-2">
                      <label className="att-label">Message</label>
                      <textarea className="att-input att-textarea" rows={4} placeholder="Enter message for parents..." value={notificationMessage} onChange={e => setNotificationMessage(e.target.value)} />
                    </div>
                    <div className="att-form-group att-span-2">
                      <div className="att-checks">
                        <label className="att-check"><input type="checkbox" /><span>Send via SMS</span></label>
                        <label className="att-check"><input type="checkbox" defaultChecked /><span>Send via Email</span></label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="att-modal-footer">
                  <button className="att-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="att-btn-save" onClick={handleSendNotification}>Send Message</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* PRINT MODAL */}
      {showPrintModal && (
        <div className="att-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="att-modal" onClick={e => e.stopPropagation()}>
            <div className="att-modal-header">
              <div className="att-modal-title"><span>🖨️</span> Print Attendance Sheet</div>
              <button className="att-modal-close" onClick={() => setShowPrintModal(false)}>✕</button>
            </div>
            <div className="att-modal-body">
              <div className="att-form-grid">
                <div className="att-form-group att-span-2"><label className="att-label">Grade</label><input className="att-input att-input-disabled" type="text" value={printGrade} readOnly /></div>
                <div className="att-form-group">
                  <label className="att-label">Stream (optional)</label>
                  <select className="att-input" value={printStream} onChange={e => setPrintStream(e.target.value)} disabled={!printGrade}>
                    <option value="">All</option>
                    {streams.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="att-form-group"><label className="att-label">Term (optional)</label><input className="att-input" type="text" placeholder="e.g. Term 1" value={printTerm} onChange={e => setPrintTerm(e.target.value)} /></div>
              </div>
            </div>
            <div className="att-modal-footer">
              <button className="att-btn-cancel" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="att-btn-save" onClick={confirmPrintGradeAttendance}>Generate PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}