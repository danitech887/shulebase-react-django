import React, { useState, useEffect } from 'react';
import './LeaveDashboard.css';
import './LeaveDashboard.css';
import api from '../../../api/api';
import { useGradesAndStreams } from '../../../hooks/useGradesAndStreams';

export default function LeaveDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedLeaves, setSelectedLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [animate, setAnimate] = useState(false);
  const [leaveStats, setLeaveStats] = useState([
    { title: 'Total Leaves', value: 0, icon: '📋', accent: '#6366f1', trend: '+0' },
    { title: 'Pending Approval', value: 0, icon: '⏳', accent: '#d97706', trend: '+0' },
    { title: 'Approved', value: 0, icon: '✅', accent: '#10b981', trend: '+0' },
    { title: 'Rejected', value: 0, icon: '❌', accent: '#ef4444', trend: '0' },
  ]);

  const [leaveData, setLeaveData] = useState({ student: '', reason: 'fees', otherReason: '', startDate: '', endDate: '' });
  const [bulkApprovalData, setBulkApprovalData] = useState({ grade: '', stream: '', reason: 'fees', amount: '', startDate: new Date().toISOString().split('T')[0] });
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectedLeaveStatement, setSelectedLeaveStatement] = useState(null);
  const [leaveFilters, setLeaveFilters] = useState({ grade: '', stream: '', status: '' });
  const [historyFilters, setHistoryFilters] = useState({ grade: '', stream: '', status: '', search: '' });
  const [gradeLeaveData, setGradeLeaveData] = useState([]);
  const [leaveReasons, setLeaveReasons] = useState([]);
  const [exportCriteria, setExportCriteria] = useState({ reportType: 'Leave Analysis Report', startDate: '', endDate: '', format: 'PDF' });
  const [isExporting, setIsExporting] = useState(false);
  const [receiptCriteria, setReceiptCriteria] = useState({ grade: '', stream: '', term: 'Term 1' });

  const { grades, streams } = useGradesAndStreams(api, 
    modalType === 'bulk' ? bulkApprovalData.grade :
    modalType === 'history' ? historyFilters.grade :
    modalType === 'export' ? exportCriteria.grade :
    modalType === 'receipt' ? receiptCriteria.grade :
    leaveFilters.grade
  );

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchLeaveData();
    fetchLeaveRecords();
    fetchGradeLeaveSummary();
    fetchAllStudents();
  }, []);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('dashboard/');
      const count = data.leave_count || 0;
      setLeaveStats([
        { title: 'Total Leaves', value: count, icon: '📋', accent: '#6366f1', trend: '+0' },
        { title: 'Pending Approval', value: Math.floor(count * 0.3), icon: '⏳', accent: '#d97706', trend: '+0' },
        { title: 'Approved', value: Math.floor(count * 0.6), icon: '✅', accent: '#10b981', trend: '+0' },
        { title: 'Rejected', value: Math.floor(count * 0.1), icon: '❌', accent: '#ef4444', trend: '0' },
      ]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await api.get('students/');
      setAllStudents(res.data.students || []);
    } catch { }
  };

  const fetchLeaveRecords = async (filters = leaveFilters) => {
    try {
      const params = new URLSearchParams();
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.stream) params.append('stream', filters.stream);
      if (filters.status) params.append('status', filters.status);
      const res = await api.get(`leaves/?${params}`);
      
      const list = Array.isArray(res.data) ? res.data : (res.data.records || []);
      if (res.data.available_grades) setGradesList(res.data.available_grades);
      if (res.data.available_streams && !filters.grade) {
        setStreamsByGrade(prev => ({ ...prev, 'all': res.data.available_streams }));
      }

      setLeaveRecords(list);
      const counts = list.reduce((acc, r) => {
        const key = r.reason === 'School Fees' ? 'School Fees' : 'Other Reasons';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const total = list.length || 1;
      setLeaveReasons([
        { reason: 'School Fees', count: counts['School Fees'] || 0, pct: (((counts['School Fees'] || 0) / total) * 100).toFixed(1), accent: '#6366f1' },
        { reason: 'Other Reasons', count: counts['Other Reasons'] || 0, pct: (((counts['Other Reasons'] || 0) / total) * 100).toFixed(1), accent: '#0891b2' },
      ]);
    } catch { setLeaveRecords([]); setLeaveReasons([]); }
  };

  const fetchGradeLeaveSummary = async () => {
    try {
      const res = await api.get('leaves/summary/by-grade/');
      setGradeLeaveData(Array.isArray(res.data) ? res.data : []);
    } catch { setGradeLeaveData([]); }
  };

  const fetchEligibleStudents = async () => {
    try {
      setLoadingEligible(true);
      const res = await api.get('leaves/bulk/eligible-students/', {
        params: { grade: bulkApprovalData.grade, stream: bulkApprovalData.stream, reason: bulkApprovalData.reason, amount: bulkApprovalData.amount }
      });
      setEligibleStudents(res.data);
      setSelectedLeaves([]);
    } catch { alert('Failed to fetch eligible students.'); }
    finally { setLoadingEligible(false); }
  };

  const handleOpenModal = (type, data = null) => {
    setModalType(type);
    if ((type === 'statement' || type === 'return_leave') && data) setSelectedLeaveStatement(data);
    setShowModal(true);
  };

  const handleCloseModal = () => { 
    setShowModal(false); 
    setModalType(''); 
    setSelectedLeaveStatement(null); 
    setEligibleStudents([]); 
    setSelectedLeaves([]); 
    setHistoryFilters({ grade: '', stream: '', status: '', search: '' }); 
  };

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000); };

  const handleApplyLeave = async () => {
    if (!leaveData.student || !leaveData.startDate) { alert('Please fill in all required fields'); return; }
    const regNo = leaveData.student.split(' - ')[0].trim();
    try {
      await api.post('leaves/apply/', { registration_no: regNo, reason: leaveData.reason, otherReason: leaveData.otherReason, startDate: leaveData.startDate, endDate: leaveData.endDate || null });
      showSuccess('Leave application submitted and approved successfully!');
      setLeaveData({ student: '', reason: 'fees', otherReason: '', startDate: '', endDate: '' });
      handleCloseModal(); fetchLeaveRecords(); fetchLeaveData(); fetchGradeLeaveSummary();
    } catch { alert('Failed to apply leave.'); }
  };

  const getStudentStream = (leave) => {
    if (leave.stream) return leave.stream;
    if (!leave.student) return '-';
    const match = allStudents.find(s => 
      `${s.first_name} ${s.surname}`.toLowerCase().includes(leave.student.toLowerCase()) ||
      leave.student.toLowerCase().includes(`${s.first_name} ${s.surname}`.toLowerCase())
    );
    return match ? match.stream : '-';
  };

  const handleApproveLeave = async (id) => {
    try { await api.put(`leaves/${id}/status/`, { status: 'approved' }); showSuccess('Leave approved!'); handleCloseModal(); fetchLeaveRecords(); fetchLeaveData(); }
    catch { alert('Failed to approve leave.'); }
  };

  const handleRejectLeave = async (id) => {
    try { await api.put(`leaves/${id}/status/`, { status: 'rejected' }); showSuccess('Leave rejected.'); handleCloseModal(); fetchLeaveRecords(); fetchLeaveData(); }
    catch { alert('Failed to reject leave.'); }
  };

  const handleReturnLeave = async () => {
    if (!leaveData.endDate) { alert('Please specify a return date.'); return; }
    try { await api.put(`leaves/${selectedLeaveStatement.id}/return/`, { return_date: leaveData.endDate }); showSuccess('Return date updated!'); handleCloseModal(); fetchLeaveRecords(); fetchLeaveData(); fetchGradeLeaveSummary(); }
    catch { alert('Failed to update return date.'); }
  };

  const handleBulkApprovalSubmit = async () => {
    if (selectedLeaves.length === 0) { alert('Select at least one student'); return; }
    try {
      await api.post('leaves/bulk/apply/', { students: selectedLeaves, reason: bulkApprovalData.reason, startDate: bulkApprovalData.startDate });
      showSuccess(`${selectedLeaves.length} leaves applied and approved!`);
      setSelectedLeaves([]); setEligibleStudents([]);
      setBulkApprovalData({ grade: '', stream: '', reason: 'fees', amount: '', startDate: new Date().toISOString().split('T')[0] });
      handleCloseModal(); fetchLeaveRecords(); fetchLeaveData(); fetchGradeLeaveSummary();
    } catch { alert('Failed to apply bulk leaves.'); }
  };

  const handlePrintReceipt = async (id) => {
    try {
      const res = await api.get(`leaves/${id}/receipt/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch { alert('Failed to print receipt.'); }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const params = {
        report_type: exportCriteria.reportType,
        start_date: exportCriteria.startDate,
        end_date: exportCriteria.endDate,
        export_format: exportCriteria.format.toLowerCase()
      };
      let endpoint = 'leaves/reports/generate/';
      if (exportCriteria.reportType === 'Leave Analysis Report') endpoint = 'reports/leave-analysis/';

      const res = await api.get(endpoint, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      const a = document.createElement('a');
      a.href = url;
      const ext = exportCriteria.format.toLowerCase() === 'excel' ? 'csv' : exportCriteria.format.toLowerCase();
      a.download = `leave_report_${new Date().toISOString().slice(0,10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Report exported successfully!');
      handleCloseModal();
    } catch (err) { console.error(err); alert('Failed to generate report.'); }
    finally { setIsExporting(false); }
  };

  const handleGenerateAllReceipts = async () => {
    if (!receiptCriteria.grade || !receiptCriteria.stream) {
      alert('Please select grade and stream');
      return;
    }
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        grade: receiptCriteria.grade,
        stream: receiptCriteria.stream,
        term: receiptCriteria.term
      });
      const res = await api.get(`leaves/reports/generate-all-receipts/?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      showSuccess('Receipts generated successfully!');
      handleCloseModal();
    } catch (err) {
      alert('Failed to generate receipts. Check if the endpoint exists.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLeaveCheckbox = (id) => setSelectedLeaves(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleSelectAll = (e) => setSelectedLeaves(e.target.checked ? eligibleStudents.map(s => s.registration_no) : []);

  const getStatusChip = (status) => {
    const map = { approved: 'ld-chip-approved', pending: 'ld-chip-pending', rejected: 'ld-chip-rejected' };
    const label = { approved: '✅ Approved', pending: '⏳ Pending', rejected: '❌ Rejected' };
    return <span className={`ld-status-chip ${map[status] || 'ld-chip-other'}`}>{label[status] || status}</span>;
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'requests', label: 'Leave Requests', icon: '📋' },
    { key: 'grades', label: 'Grade Summary', icon: '🏫' },
    { key: 'more', label: 'More', icon: '⋯' },
  ];

  const moreActions = [
    { icon: '✅', title: 'Bulk Approval', desc: 'Approve multiple leaves at once', action: () => handleOpenModal('bulk') },
    { icon: '🧾', title: 'Bulk Receipts', desc: 'Generate all approved leave receipts', action: () => handleOpenModal('all_receipts') },
    { icon: '📊', title: 'Generate Report', desc: 'Export leave statistics and reports', action: () => handleOpenModal('export') },
    { icon: '📧', title: 'Send Notifications', desc: 'Notify parents about leave status', action: () => handleOpenModal('notify') },
    { icon: '⚙️', title: 'Leave Settings', desc: 'Configure leave policies', action: () => handleOpenModal('settings') },
    { icon: '📋', title: 'Leave History', desc: 'View historical leave records', action: () => handleOpenModal('history') },
    { icon: '📞', title: 'Contact Parents', desc: 'Send messages to parents', action: () => handleOpenModal('contact') },
  ];

  const pendingCount = leaveRecords.filter(l => l.status === 'pending').length;
  const approvedCount = leaveRecords.filter(l => l.status === 'approved').length;
  const rejectedCount = leaveRecords.filter(l => l.status === 'rejected').length;
  const totalRecords = leaveRecords.length || 1;

  const filteredHistoryRecords = leaveRecords.filter(l => {
    const matchGrade = historyFilters.grade ? l.grade === historyFilters.grade : true;
    const matchStream = historyFilters.stream ? getStudentStream(l) === historyFilters.stream : true;
    const matchStatus = historyFilters.status ? l.status === historyFilters.status : true;
    const matchSearch = historyFilters.search ? (l.student || '').toLowerCase().includes(historyFilters.search.toLowerCase()) : true;
    return matchGrade && matchStream && matchStatus && matchSearch;
  });

  return (
    <div className={`ld-root ${animate ? 'ld-ready' : ''}`}>
      <div className="ld-blob ld-blob-1" />
      <div className="ld-blob ld-blob-2" />

      {/* ── ALERT ── */}
      {successMessage && (
        <div className="ld-alert">
          <span>✅ {successMessage}</span>
          <button className="ld-alert-close" onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="ld-header">
        <div className="ld-header-left">
          <div className="ld-header-icon">📋</div>
          <div>
            <h1 className="ld-title">Leave Management</h1>
            <p className="ld-subtitle">Manage student leave applications and approvals</p>
          </div>
        </div>
        <div className="ld-header-actions">
          <button className="ld-btn-outline" onClick={() => handleOpenModal('export')}><span>📥</span> Export Report</button>
          <button className="ld-btn-primary" onClick={() => handleOpenModal('apply')}><span>+</span> Apply Leave</button>
        </div>
      </header>

      {/* ── GLOBAL FILTERS ── */}
      <div className="ld-global-filters" style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        marginBottom: '1.5rem',
        background: 'var(--ld-surface, #131720)',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--ld-radius, 16px)',
        border: '1px solid var(--ld-border, rgba(255,255,255,0.07))',
        position: 'relative',
        zIndex: 5,
        flexWrap: 'wrap'
      }}>
        <span className="ld-label" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ld-text, #e8eaf0)' }}>Global Filters:</span>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="ld-muted" style={{ fontSize: '0.8rem' }}>Grade:</span>
          <select 
            className="ld-input" 
            style={{ width: 'auto', minWidth: '130px', padding: '0.4rem 0.75rem' }} 
            value={leaveFilters.grade} 
            onChange={e => setLeaveFilters({ ...leaveFilters, grade: e.target.value, stream: '' })}
          >
            <option value="">All Grades</option>
            {grades.map((g, i) => <option key={i} value={g}>{g}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="ld-muted" style={{ fontSize: '0.8rem' }}>Stream:</span>
          <select 
            className="ld-input" 
            style={{ width: 'auto', minWidth: '130px', padding: '0.4rem 0.75rem' }} 
            value={leaveFilters.stream} 
            onChange={e => setLeaveFilters({ ...leaveFilters, stream: e.target.value })}
            disabled={!leaveFilters.grade}
          >
            <option value="">All Streams</option>
            {streams.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="ld-stats-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ld-stat ld-skeleton" style={{ '--delay': `${i * 0.08}s` }}>
                <div className="sk-line sk-short" /><div className="sk-line sk-long" />
              </div>
            ))
          : leaveStats.map((s, i) => (
              <div key={i} className="ld-stat" style={{ '--acc': s.accent, '--delay': `${i * 0.1}s` }}>
                <div className="ld-stat-top">
                  <span className="ld-stat-label">{s.title}</span>
                  <span className="ld-trend">{s.trend}</span>
                </div>
                <div className="ld-stat-bottom">
                  <span className="ld-stat-value">{s.value}</span>
                  <span className="ld-stat-icon">{s.icon}</span>
                </div>
                <div className="ld-stat-bar"><div className="ld-stat-bar-fill" /></div>
              </div>
            ))}
      </div>

      {/* ── TABS ── */}
      <div className="ld-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`ld-tab ${activeTab === t.key ? 'ld-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="ld-tab-content">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="ld-overview-grid">
            {/* Reason Distribution */}
            <div className="ld-card">
              <div className="ld-card-header">
                <div>
                  <span className="ld-card-title">Leave Reason Distribution</span>
                  <span className="ld-card-sub">Breakdown by reason type</span>
                </div>
                <span className="ld-card-badge">📊</span>
              </div>
              <div className="ld-reasons-body">
                {leaveReasons.map((r, i) => (
                  <div key={i} className="ld-reason-item" style={{ '--acc': r.accent }}>
                    <div className="ld-reason-icon">{i === 0 ? '💰' : '📝'}</div>
                    <div className="ld-reason-info" style={{ flex: 1 }}>
                      <div className="ld-reason-name">{r.reason}</div>
                      <div className="ld-reason-count">{r.count} leaves</div>
                      <div className="ld-reason-track">
                        <div className="ld-reason-fill" style={{ width: `${r.pct}%`, '--delay': `${i * 0.15}s` }} />
                      </div>
                    </div>
                    <span className="ld-reason-pct">{r.pct}%</span>
                  </div>
                ))}
                <div className="ld-reason-total">
                  <span>Total Leaves</span>
                  <strong>{leaveReasons.reduce((s, r) => s + r.count, 0)}</strong>
                </div>
              </div>
            </div>

            {/* Status Overview */}
            <div className="ld-card">
              <div className="ld-card-header">
                <div>
                  <span className="ld-card-title">Leave Application Trends</span>
                  <span className="ld-card-sub">Approvals & Requests</span>
                </div>
                <span className="ld-card-badge">📈</span>
              </div>
              <div className="ld-chart-area" style={{ padding: '2rem 1.5rem 1rem' }}>
                {(() => {
                  const width = 600;
                  const height = 200;
                  const padding = 40;
                  
                  const trendData = [
                    { label: 'Week 1', value: Math.floor(approvedCount * 0.2) },
                    { label: 'Week 2', value: Math.floor(approvedCount * 0.5) },
                    { label: 'Week 3', value: Math.floor(approvedCount * 0.8) },
                    { label: 'Week 4', value: approvedCount },
                  ];

                  const maxVal = Math.max(...trendData.map(d => d.value), 1);
                  const points = trendData.map((d, i) => {
                    const x = padding + (i * (width - padding * 2) / (trendData.length - 1));
                    const y = height - padding - ((d.value / maxVal) * (height - padding * 2));
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <div style={{ position: 'relative', height: '220px', marginBottom: '1rem' }}>
                      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="leaveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                          const y = padding + pct * (height - padding * 2);
                          return (
                            <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                          );
                        })}

                        <text x={12} y={height / 2} transform={`rotate(-90, 12, ${height / 2})`} style={{ fontSize: '0.65rem', fill: 'var(--ld-text-muted, rgba(255,255,255,0.4))', textAnchor: 'middle', letterSpacing: '1px' }}>APPROVED LEAVES</text>

                        <path
                          d={`M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`}
                          fill="url(#leaveGrad)"
                        />

                        <polyline
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="3.5"
                          points={points}
                        />

                        {trendData.map((d, i) => {
                          const x = padding + (i * (width - padding * 2) / (trendData.length - 1));
                          const y = height - padding - ((d.value / maxVal) * (height - padding * 2));
                          return (
                            <circle key={i} cx={x} cy={y} r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5">
                              <title>{`${d.label}\nApproved: ${d.value}`}</title>
                            </circle>
                          );
                        })}
                      </svg>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, marginTop: '15px' }}>
                        {trendData.map((d, i) => (
                          <span key={i} style={{ fontSize: '0.75rem', color: 'var(--ld-text-muted)', fontWeight: 600 }}>{d.label}</span>
                        ))}
                      </div>
                      
                      <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--ld-text-muted)', letterSpacing: '1px', marginTop: '10px' }}>
                        TIMELINE (WEEKS)
                      </div>
                    </div>
                  );
                })()}
                <div className="ld-legend" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--ld-text-muted)', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: '10px', height: '10px', background: '#6366f1', borderRadius: '50%' }} />Approved Leaves</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REQUESTS */}
        {activeTab === 'requests' && (
          <div className="ld-card">
            <div className="ld-card-header">
              <div>
                <span className="ld-card-title">All Leave Requests</span>
                <span className="ld-card-sub">{leaveRecords.length} total records</span>
              </div>
              <div className="ld-filters">
                <select className="ld-input" style={{ width: 'auto' }} value={leaveFilters.grade} onChange={e => setLeaveFilters({ ...leaveFilters, grade: e.target.value, stream: '' })}>
                  <option value="">All Grades</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="ld-input" style={{ width: 'auto' }} value={leaveFilters.stream} onChange={e => setLeaveFilters({ ...leaveFilters, stream: e.target.value })} disabled={!leaveFilters.grade}>
                  <option value="">All Streams</option>
                  {streams.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="ld-input" style={{ width: 'auto' }} value={leaveFilters.status} onChange={e => setLeaveFilters({ ...leaveFilters, status: e.target.value })}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button className="ld-btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => fetchLeaveRecords(leaveFilters)}>Filter</button>
                <button className="ld-btn-cancel" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => { const c = { grade: '', stream: '', status: '' }; setLeaveFilters(c); fetchLeaveRecords(c); }}>Clear</button>
              </div>
            </div>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Student</th><th>Grade</th><th>Stream</th><th>Reason</th>
                    <th>Start Date</th><th>End Date</th><th>Duration</th>
                    <th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRecords.length === 0
                    ? <tr><td colSpan="9" className="ld-empty-cell">No leave records found.</td></tr>
                    : leaveRecords.map((leave, i) => (
                        <tr key={leave.id} className="ld-tr" style={{ '--ri': i }}>
                          <td className="ld-bold">{leave.student}</td>
                          <td><span className="ld-grade-chip">{leave.grade}</span></td>
                          <td>{getStudentStream(leave)}</td>
                          <td>
                            <span className="ld-reason-chip">
                              {leave.reason === 'School Fees' ? '💰' : '📝'} {leave.reason === 'Other' ? leave.otherReason : leave.reason}
                            </span>
                          </td>
                          <td className="ld-mono">{leave.startDate}</td>
                          <td className="ld-mono">{leave.endDate}</td>
                          <td className="ld-muted ld-num">{leave.duration}d</td>
                          <td>{getStatusChip(leave.status)}</td>
                          <td>
                            <div className="ld-action-btns">
                              <button className="ld-icon-btn" title="View" onClick={() => handleOpenModal('statement', leave)}>👁️</button>
                              {leave.status == 'approved' && (
                                <>
                                  <button className="ld-icon-btn" title="Print Receipt" onClick={() => handlePrintReceipt(leave.id)}>🖨️</button>
                                </>
                              )}
                              {leave.status === 'pending' && (
                                <>
                                  <button className="ld-icon-btn approve" title="Approve" onClick={() => handleOpenModal('approve', leave)}>✅</button>
                                  <button className="ld-icon-btn reject" title="Reject" onClick={() => handleOpenModal('reject', leave)}>❌</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GRADES */}
        {activeTab === 'grades' && (
          <div className="ld-card">
            <div className="ld-card-header">
              <div>
                <span className="ld-card-title">Leave Summary by Grade</span>
                <span className="ld-card-sub">All grades overview</span>
              </div>
              <span className="ld-card-badge">🏫</span>
            </div>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Grade</th><th>Total Students</th><th>On Leave</th>
                    <th>Pending</th><th>Approved</th><th>Rejected</th>
                    <th>Fee Related</th><th>Other</th><th>Leave %</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeLeaveData.length === 0
                    ? <tr><td colSpan="9" className="ld-empty-cell">No grade data available.</td></tr>
                    : gradeLeaveData.map((g, i) => {
                        const pct = ((g.onLeave / g.totalStudents) * 100).toFixed(1);
                        return (
                          <tr key={i} className="ld-tr" style={{ '--ri': i }}>
                            <td><span className="ld-grade-chip">{g.grade}</span></td>
                            <td className="ld-num">{g.totalStudents}</td>
                            <td className="ld-num ld-bold">{g.onLeave}</td>
                            <td><span className="ld-status-chip ld-chip-pending">{g.pending}</span></td>
                            <td><span className="ld-status-chip ld-chip-approved">{g.approved}</span></td>
                            <td><span className="ld-status-chip ld-chip-rejected">{g.rejected}</span></td>
                            <td className="ld-num ld-indigo">{g.feeRelated}</td>
                            <td className="ld-num ld-muted">{g.other}</td>
                            <td>
                              <div className="ld-prog-cell">
                                <div className="ld-prog-track"><div className="ld-prog-fill" style={{ width: `${pct}%`, '--delay': `${i * 0.06}s` }} /></div>
                                <span className="ld-prog-label">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MORE */}
        {activeTab === 'more' && (
          <div className="ld-more-grid">
            {moreActions.map((a, i) => (
              <button key={i} className="ld-action-card" style={{ '--delay': `${i * 0.07}s` }} onClick={a.action}>
                <span className="ld-action-icon">{a.icon}</span>
                <span className="ld-action-title">{a.title}</span>
                <span className="ld-action-desc">{a.desc}</span>
                <span className="ld-action-arrow">→</span>
                <div className="ld-action-shine" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════ MODALS ══════════════ */}
      {showModal && (
        <div className="ld-overlay" onClick={handleCloseModal}>
          <div className={`ld-modal ${['bulk', 'history'].includes(modalType) ? 'ld-modal-lg' : ''}`} onClick={e => e.stopPropagation()}>

            {/* ── APPLY LEAVE ── */}
            {modalType === 'apply' && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>➕</span> Apply Leave</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <div className="ld-form-grid">
                    <div className="ld-form-group ld-span-2">
                      <label className="ld-label">Student <span className="ld-req">*</span></label>
                      <input className="ld-input" list="student-list" placeholder="Search student..." value={leaveData.student} onChange={e => setLeaveData({ ...leaveData, student: e.target.value })} />
                      <datalist id="student-list">
                        {allStudents.map(s => <option key={s.registration_no} value={`${s.registration_no} - ${s.first_name} ${s.surname}`} />)}
                      </datalist>
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Reason <span className="ld-req">*</span></label>
                      <select className="ld-input" value={leaveData.reason} onChange={e => setLeaveData({ ...leaveData, reason: e.target.value })}>
                        <option value="fees">School Fees</option>
                        <option value="other">Other Reason</option>
                      </select>
                    </div>
                    {leaveData.reason === 'other' && (
                      <div className="ld-form-group">
                        <label className="ld-label">Specify Reason <span className="ld-req">*</span></label>
                        <input className="ld-input" placeholder="Enter reason" value={leaveData.otherReason} onChange={e => setLeaveData({ ...leaveData, otherReason: e.target.value })} />
                      </div>
                    )}
                    <div className="ld-form-group">
                      <label className="ld-label">Start Date <span className="ld-req">*</span></label>
                      <input className="ld-input" type="date" value={leaveData.startDate} onChange={e => setLeaveData({ ...leaveData, startDate: e.target.value })} />
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">End Date</label>
                      <input className="ld-input" type="date" value={leaveData.endDate} onChange={e => setLeaveData({ ...leaveData, endDate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-save" onClick={handleApplyLeave}>Approve Leave</button>
                </div>
              </>
            )}

            {/* ── STATEMENT ── */}
            {modalType === 'statement' && selectedLeaveStatement && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>📋</span> Leave Statement</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <div className="ld-statement">
                    <div className="ld-statement-section">
                      <h6>Student Information</h6>
                      <div className="ld-statement-row"><span>Name</span><strong>{selectedLeaveStatement.student}</strong></div>
                      <div className="ld-statement-row"><span>Grade</span><strong>{selectedLeaveStatement.grade}</strong></div>
                    </div>
                    <div className="ld-statement-section">
                      <h6>Leave Details</h6>
                      <div className="ld-statement-row"><span>Reason</span><strong>{selectedLeaveStatement.reason === 'Other' ? selectedLeaveStatement.otherReason : selectedLeaveStatement.reason}</strong></div>
                      <div className="ld-statement-row"><span>Start Date</span><strong>{selectedLeaveStatement.startDate}</strong></div>
                      <div className="ld-statement-row"><span>End Date</span><strong>{selectedLeaveStatement.endDate}</strong></div>
                      <div className="ld-statement-row"><span>Duration</span><strong>{selectedLeaveStatement.duration} days</strong></div>
                    </div>
                    <div className="ld-statement-section">
                      <h6>Status</h6>
                      <div className="ld-statement-row"><span>Current Status</span><strong>{getStatusChip(selectedLeaveStatement.status)}</strong></div>
                      {selectedLeaveStatement.status !== 'pending' && (
                        <>
                          <div className="ld-statement-row"><span>Approved By</span><strong>{selectedLeaveStatement.approvedBy}</strong></div>
                          <div className="ld-statement-row"><span>Approval Date</span><strong>{selectedLeaveStatement.approvalDate}</strong></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ld-modal-footer">
                  {selectedLeaveStatement.status === 'approved' && (
                    <button className="ld-btn-primary" onClick={() => handleOpenModal('return_leave', selectedLeaveStatement)}>Update Return Date</button>
                  )}
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* ── RETURN DATE ── */}
            {modalType === 'return_leave' && (
              <>
                <div className="ld-modal-header success">
                  <div className="ld-modal-title"><span>📅</span> Update Return Date</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <p style={{ color: 'var(--ld-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Mark <strong style={{ color: 'var(--ld-text)' }}>{selectedLeaveStatement?.student}</strong> as returned from leave.
                  </p>
                  <div className="ld-form-group">
                    <label className="ld-label">Return Date <span className="ld-req">*</span></label>
                    <input className="ld-input" type="date" value={leaveData.endDate} onChange={e => setLeaveData({ ...leaveData, endDate: e.target.value })} />
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={() => handleOpenModal('statement', selectedLeaveStatement)}>Back</button>
                  <button className="ld-btn-success" onClick={handleReturnLeave}>Save Return Date</button>
                </div>
              </>
            )}

            {/* ── APPROVE ── */}
            {modalType === 'approve' && (
              <>
                <div className="ld-modal-header success">
                  <div className="ld-modal-title"><span>✅</span> Approve Leave</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <p style={{ color: 'var(--ld-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Are you sure you want to approve this leave request?</p>
                  <div className="ld-form-group">
                    <label className="ld-label">Approval Notes (Optional)</label>
                    <textarea className="ld-input ld-textarea" rows={3} placeholder="Add any notes..." />
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-success" onClick={() => handleApproveLeave(selectedLeaveStatement?.id)}>Approve</button>
                </div>
              </>
            )}

            {/* ── REJECT ── */}
            {modalType === 'reject' && (
              <>
                <div className="ld-modal-header danger">
                  <div className="ld-modal-title"><span>❌</span> Reject Leave</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <p style={{ color: 'var(--ld-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Are you sure you want to reject this leave request?</p>
                  <div className="ld-form-group">
                    <label className="ld-label">Rejection Reason <span className="ld-req">*</span></label>
                    <textarea className="ld-input ld-textarea" rows={3} placeholder="Explain why this leave is being rejected..." />
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-danger" onClick={() => handleRejectLeave(selectedLeaveStatement?.id)}>Reject</button>
                </div>
              </>
            )}

            {/* ── BULK APPROVAL ── */}
            {modalType === 'bulk' && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>✅</span> Bulk Leave Approval</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <div className="ld-form-grid">
                    <div className="ld-form-group">
                      <label className="ld-label">Grade</label>
                      <select className="ld-input" value={bulkApprovalData.grade} onChange={e => setBulkApprovalData({ ...bulkApprovalData, grade: e.target.value, stream: '' })}>
                        <option value="">All Grades</option>
                        {gradesList.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Stream</label>
                      <select className="ld-input" value={bulkApprovalData.stream} onChange={e => setBulkApprovalData({ ...bulkApprovalData, stream: e.target.value })}>
                        <option value="">All Streams</option>
                        {(streamsByGrade[bulkApprovalData.grade] || streamsByGrade['all'] || []).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Reason <span className="ld-req">*</span></label>
                      <select className="ld-input" value={bulkApprovalData.reason} onChange={e => setBulkApprovalData({ ...bulkApprovalData, reason: e.target.value })}>
                        <option value="fees">School Fees</option>
                        <option value="other">Other Reason</option>
                      </select>
                    </div>
                    {bulkApprovalData.reason === 'fees' && (
                      <div className="ld-form-group">
                        <label className="ld-label">Min Fee Balance (Ksh)</label>
                        <input className="ld-input" type="number" placeholder="e.g. 5000" value={bulkApprovalData.amount} onChange={e => setBulkApprovalData({ ...bulkApprovalData, amount: e.target.value })} />
                      </div>
                    )}
                    <div className="ld-form-group">
                      <label className="ld-label">Start Date <span className="ld-req">*</span></label>
                      <input className="ld-input" type="date" value={bulkApprovalData.startDate} onChange={e => setBulkApprovalData({ ...bulkApprovalData, startDate: e.target.value })} />
                    </div>
                    <div className="ld-form-group" style={{ justifyContent: 'flex-end' }}>
                      <label className="ld-label">&nbsp;</label>
                      <button className="ld-btn-primary" onClick={fetchEligibleStudents} disabled={loadingEligible}>
                        {loadingEligible ? '⏳ Fetching...' : '🔍 Fetch Eligible Students'}
                      </button>
                    </div>
                  </div>

                  {eligibleStudents.length > 0 && (
                    <div style={{ marginTop: '1.25rem' }}>
                      <div className="ld-checklist-header">
                        <span className="ld-label">{eligibleStudents.length} eligible students found</span>
                        <label className="ld-check-item" style={{ padding: '0.25rem 0.5rem' }}>
                          <input type="checkbox" checked={selectedLeaves.length === eligibleStudents.length} onChange={handleSelectAll} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--ld-text-muted)' }}>Select All</span>
                        </label>
                      </div>
                      <div className="ld-checklist">
                        {eligibleStudents.map(s => (
                          <label key={s.registration_no} className="ld-check-item">
                            <input type="checkbox" checked={selectedLeaves.includes(s.registration_no)} onChange={() => handleLeaveCheckbox(s.registration_no)} />
                            <span>{s.name} ({s.registration_no}){s.balance !== null ? ` — Balance: Ksh ${s.balance}` : ''}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {eligibleStudents.length === 0 && !loadingEligible && (
                    <div className="ld-info-box" style={{ marginTop: '1.25rem' }}>
                      Click "Fetch Eligible Students" to load students matching your criteria. Students currently on leave are excluded.
                    </div>
                  )}
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-save" onClick={handleBulkApprovalSubmit} disabled={selectedLeaves.length === 0}>
                    Approve Selected ({selectedLeaves.length})
                  </button>
                </div>
              </>
            )}

            {/* ── EXPORT REPORT ── */}
            {modalType === 'export' && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>📊</span> Generate Report</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <div className="ld-form-grid">
                    <div className="ld-form-group ld-span-2">
                      <label className="ld-label">Report Type</label>
                      <select className="ld-input" value={exportCriteria.reportType} onChange={e => setExportCriteria({ ...exportCriteria, reportType: e.target.value })}>
                        <option>Leave Analysis Report</option>
                        <option>Leave Summary Report</option>
                        <option>Grade-wise Leave Analysis</option>
                        <option>Leave Reason Breakdown</option>
                        <option>Pending Approvals Report</option>
                      </select>
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Start Date</label>
                      <input className="ld-input" type="date" value={exportCriteria.startDate} onChange={e => setExportCriteria({ ...exportCriteria, startDate: e.target.value })} />
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">End Date</label>
                      <input className="ld-input" type="date" value={exportCriteria.endDate} onChange={e => setExportCriteria({ ...exportCriteria, endDate: e.target.value })} />
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Format</label>
                      <select className="ld-input" value={exportCriteria.format} onChange={e => setExportCriteria({ ...exportCriteria, format: e.target.value })}><option>PDF</option><option>Excel</option><option>CSV</option></select>
                    </div>
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-save" onClick={handleExportReport} disabled={isExporting}>{isExporting ? 'Generating...' : 'Generate & Download'}</button>
                </div>
              </>
            )}

            {/* ── NOTIFICATIONS ── */}
            {modalType === 'notify' && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>📧</span> Send Notifications</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <div className="ld-form-grid">
                    <div className="ld-form-group">
                      <label className="ld-label">Notification Type</label>
                      <select className="ld-input"><option>Leave Approved</option><option>Leave Rejected</option><option>Leave Pending</option><option>Custom Message</option></select>
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Send To</label>
                      <select className="ld-input"><option>All Parents</option><option>Specific Grade</option><option>Specific Student</option></select>
                    </div>
                    <div className="ld-form-group ld-span-2">
                      <label className="ld-label">Message</label>
                      <textarea className="ld-input ld-textarea" rows={3} placeholder="Enter notification message..." />
                    </div>
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-save" onClick={() => { handleCloseModal(); showSuccess('Notifications sent!'); }}>Send Notifications</button>
                </div>
              </>
            )}

            {/* ── SETTINGS ── */}
            {modalType === 'settings' && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>⚙️</span> Leave Settings</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <div className="ld-form-grid">
                    <div className="ld-form-group">
                      <label className="ld-label">Max Leave Days per Term</label>
                      <input className="ld-input" type="number" defaultValue="30" />
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Require Approval Over (days)</label>
                      <input className="ld-input" type="number" defaultValue="3" />
                    </div>
                    <div className="ld-form-group ld-span-2" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                      <input type="checkbox" defaultChecked style={{ accentColor: 'var(--ld-accent)', width: 16, height: 16 }} />
                      <label className="ld-label" style={{ margin: 0 }}>Allow Fee-Related Leaves</label>
                    </div>
                    <div className="ld-form-group ld-span-2" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                      <input type="checkbox" defaultChecked style={{ accentColor: 'var(--ld-accent)', width: 16, height: 16 }} />
                      <label className="ld-label" style={{ margin: 0 }}>Require Parent Notification</label>
                    </div>
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-save" onClick={() => { handleCloseModal(); showSuccess('Settings saved!'); }}>Save Settings</button>
                </div>
              </>
            )}

            {/* ── HISTORY ── */}
            {modalType === 'history' && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>📋</span> Leave History</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body" style={{ padding: '1rem' }}>
                  <div className="ld-filters" style={{ marginBottom: '1rem' }}>
                    <input className="ld-input" style={{ width: 'auto', flex: 1 }} placeholder="Search student..." value={historyFilters.search} onChange={e => setHistoryFilters({ ...historyFilters, search: e.target.value })} />
                    <select className="ld-input" style={{ width: 'auto' }} value={historyFilters.grade} onChange={e => setHistoryFilters({ ...historyFilters, grade: e.target.value, stream: '' })}>
                      <option value="">All Grades</option>
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select className="ld-input" style={{ width: 'auto' }} value={historyFilters.stream} onChange={e => setHistoryFilters({ ...historyFilters, stream: e.target.value })} disabled={!historyFilters.grade}>
                      <option value="">All Streams</option>
                      {streams.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="ld-input" style={{ width: 'auto' }} value={historyFilters.status} onChange={e => setHistoryFilters({ ...historyFilters, status: e.target.value })}>
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button className="ld-btn-cancel" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => setHistoryFilters({ grade: '', stream: '', status: '', search: '' })}>Clear</button>
                  </div>
                  <div className="ld-table-wrap ld-table-modal">
                    <table className="ld-table">
                      <thead><tr><th>Date</th><th>Student</th><th>Grade</th><th>Stream</th><th>Reason</th><th>Duration</th><th>Status</th></tr></thead>
                      <tbody>
                        {filteredHistoryRecords.length === 0 ? (
                          <tr><td colSpan="7" className="ld-empty-cell">No history records found.</td></tr>
                        ) : (
                          filteredHistoryRecords.slice(0, 50).map((l, i) => (
                            <tr key={l.id} className="ld-tr" style={{ '--ri': i }}>
                              <td className="ld-mono">{l.startDate}</td>
                              <td className="ld-bold">{l.student}</td>
                              <td><span className="ld-grade-chip">{l.grade}</span></td>
                              <td>{getStudentStream(l)}</td>
                              <td className="ld-muted">{l.reason === 'Other' ? l.otherReason : l.reason}</td>
                              <td className="ld-num">{l.duration}d</td>
                              <td>{getStatusChip(l.status)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* ── CONTACT PARENTS ── */}
            {modalType === 'contact' && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>📞</span> Contact Parents</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <div className="ld-form-grid">
                    <div className="ld-form-group ld-span-2">
                      <label className="ld-label">Select Student / Grade</label>
                      <select className="ld-input">
                        <option>All Students</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="ld-form-group ld-span-2">
                      <label className="ld-label">Message</label>
                      <textarea className="ld-input ld-textarea" rows={4} placeholder="Enter message for parents..." />
                    </div>
                    <div className="ld-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                      <input type="checkbox" defaultChecked style={{ accentColor: 'var(--ld-accent)', width: 16, height: 16 }} />
                      <label className="ld-label" style={{ margin: 0 }}>Send via Email</label>
                    </div>
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-save" onClick={() => { handleCloseModal(); showSuccess('Message sent to parents!'); }}>Send Message</button>
                </div>
              </>
            )}

            {/* ── ALL RECEIPTS MODAL ── */}
            {modalType === 'all_receipts' && (
              <>
                <div className="ld-modal-header">
                  <div className="ld-modal-title"><span>🧾</span> Bulk Leave Receipts</div>
                  <button className="ld-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ld-modal-body">
                  <div className="ld-form-grid">
                    <div className="ld-form-group ld-span-2">
                      <label className="ld-label">Grade <span className="ld-req">*</span></label>
                      <select 
                        className="ld-input" 
                        value={receiptCriteria.grade} 
                        onChange={e => setReceiptCriteria({ ...receiptCriteria, grade: e.target.value, stream: '' })}
                      >
                        <option value="">Select Grade</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Stream <span className="ld-req">*</span></label>
                      <select 
                        className="ld-input" 
                        value={receiptCriteria.stream} 
                        onChange={e => setReceiptCriteria({ ...receiptCriteria, stream: e.target.value })}
                        disabled={!receiptCriteria.grade}
                      >
                        <option value="">Select Stream</option>
                        {streams.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ld-form-group">
                      <label className="ld-label">Term <span className="ld-req">*</span></label>
                      <select 
                        className="ld-input" 
                        value={receiptCriteria.term} 
                        onChange={e => setReceiptCriteria({ ...receiptCriteria, term: e.target.value })}
                      >
                        <option>Term 1</option>
                        <option>Term 2</option>
                        <option>Term 3</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="ld-modal-footer">
                  <button className="ld-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ld-btn-save" onClick={handleGenerateAllReceipts} disabled={isExporting}>
                    {isExporting ? 'Generating...' : 'Generate Receipts'}
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