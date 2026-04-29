import React, { useState, useEffect } from 'react';
import { Spinner, Card } from 'react-bootstrap';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import './Attendance.css';

export default function TeacherAttendance() {
  const { showMessage } = useMessage();
  const [ready, setReady]           = useState(false);
  const [activeTab, setActiveTab]   = useState('overview');
  const [showModal, setShowModal]   = useState(false);
  const [modalType, setModalType]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const [stats, setStats]                   = useState({ total_teachers: 0, present_today: 0, absent_today: 0 });
  const [monthlyData, setMonthlyData]       = useState([]);
  const [records, setRecords]               = useState([]);
  const [teachers, setTeachers]             = useState([]);
  const [hoveredPoint, setHoveredPoint]     = useState(null);

  const [attDate, setAttDate]               = useState(new Date().toISOString().slice(0, 10));
  const [attTerm, setAttTerm]               = useState('Term 1');
  const [attendanceForm, setAttendanceForm] = useState({});
  const [timeInForm, setTimeInForm]         = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [filters, setFilters] = useState({ search: '', status: '', date_from: '', date_to: '' });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, monthlyRes, recordsRes, teachersRes] = await Promise.all([
        api.get('teachers/stats/'),
        api.get('teachers/attendance/monthly/'),
        api.get('teachers/attendance/records/'),
        api.get('teachers/'),
      ]);
      setStats(statsRes.data || { total_teachers: 0, present_today: 0, absent_today: 0 });
      setMonthlyData(Array.isArray(monthlyRes.data) ? monthlyRes.data : []);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setTeachers(Array.isArray(teachersRes.data) ? teachersRes.data : []);
    } catch (err) {
      console.error('fetchData error', err);
      showMessage({ type: 'error', text: 'Failed to load attendance data.' });
    } finally { setLoading(false); }
  }

  const handleOpenModal = (type, record = null) => {
    setModalType(type);
    setSelectedRecord(record);
    if (type === 'mark') {
      const init = {};
      const initTime = {};
      teachers.forEach(t => { 
        init[t.registration_no] = 'Present'; 
        initTime[t.registration_no] = '08:00'; 
      });
      setAttendanceForm(init);
      setTimeInForm(initTime);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); setModalType(''); setSelectedRecord(null); };

  const handleMarkAllPresent = () => {
    const f = {};
    const tF = {};
    teachers.forEach(t => { 
      f[t.registration_no] = 'Present'; 
      tF[t.registration_no] = timeInForm[t.registration_no] || '08:00';
    });
    setAttendanceForm(f);
    setTimeInForm(tF);
  };

  const handleSaveAttendance = async () => {
    const payload = Object.entries(attendanceForm).map(([registration_no, status]) => ({
      registration_no, status, time_in: status === 'Present' ? (timeInForm[registration_no] || '08:00') : null,
    }));
    if (payload.length === 0) return showMessage({ type: 'warning', text: 'No attendance marked.' });
    setSaving(true);
    try {
      await api.post('teachers/attendance/records/', { date: attDate, term: attTerm, attendance: payload });
      showMessage({ type: 'success', text: 'Attendance saved.' });
      await fetchData();
      handleCloseModal();
    } catch (err) {
      console.error('save attendance', err);
      showMessage({ type: 'error', text: 'Failed to save attendance.' });
    } finally { setSaving(false); }
  };

  const attendanceRate = stats.total_teachers > 0
    ? Math.round((stats.present_today / stats.total_teachers) * 100) : 0;
  const maxRate = Math.max(...monthlyData.map(d => Number(d?.rate) || 0), 1);

  const statCards = [
    { title: 'Total Teachers',  value: stats.total_teachers, icon: '👨‍🏫', accent: '#6366f1' },
    { title: 'Present Today',   value: stats.present_today,  icon: '✅',   accent: '#22c55e' },
    { title: 'Absent Today',    value: stats.absent_today,   icon: '❌',   accent: '#ef4444' },
    { title: 'Attendance Rate', value: `${attendanceRate}%`, icon: '📊',   accent: '#3b82f6' },
  ];

  const attendanceStatus = [
    { status: 'Present', count: stats.present_today, percentage: attendanceRate, color: '#22c55e' },
    {
      status: 'Absent',
      count: stats.absent_today,
      percentage: stats.total_teachers ? Math.round((stats.absent_today / stats.total_teachers) * 100) : 0,
      color: '#ef4444',
    },
  ];

  const getStatusChip = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'present') return <span className="ta-status-chip ta-present">Present</span>;
    if (s === 'absent')  return <span className="ta-status-chip ta-absent">Absent</span>;
    return <span className="ta-status-chip ta-late">Late</span>;
  };

  const filteredRecords = records.filter(r => {
    const q = (filters.search || '').toLowerCase();
    return (
      (!q || (r.teacher_name || '').toLowerCase().includes(q) || (r.registration_no || '').toLowerCase().includes(q)) &&
      (!filters.status    || r.status >= filters.status) &&
      (!filters.date_from || r.date >= filters.date_from) &&
      (!filters.date_to   || r.date <= filters.date_to)
    );
  });

  // fix status filter (was >= by mistake in original — keep simple equality)
  const filteredRecordsFinal = records.filter(r => {
    const q = (filters.search || '').toLowerCase();
    return (
      (!q || (r.teacher_name || '').toLowerCase().includes(q) || (r.registration_no || '').toLowerCase().includes(q)) &&
      (!filters.status    || r.status === filters.status) &&
      (!filters.date_from || r.date >= filters.date_from) &&
      (!filters.date_to   || r.date <= filters.date_to)
    );
  });

  return (
    <div className={`ta-root${ready ? ' ta-ready' : ''}`}>

      {/* ── Header Card ── */}
      <Card className="ta-header-card">
        <Card.Body>
          <header className="ta-header">
            <div className="ta-header-left">
              <div className="ta-header-icon">📅</div>
              <div>
                <h1 className="ta-title">Teacher Attendance</h1>
                <p className="ta-subtitle">Monitor and record teacher daily attendance</p>
              </div>
            </div>
            <div className="ta-header-actions">
              <button className="ta-btn-primary" onClick={() => handleOpenModal('mark')} disabled={loading}>
                <span>📝</span> Record Attendance
              </button>
            </div>
          </header>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ta-text-muted)' }}>
              <Spinner animation="border" size="sm" className="me-2" /> Loading…
            </div>
          ) : (
            <div className="ta-stats-row">
              {statCards.map((s, i) => (
                <div key={i} className="ta-stat" style={{ '--acc': s.accent, '--delay': `${i * 0.08}s` }}>
                  <div className="ta-stat-top"><span className="ta-stat-label">{s.title}</span></div>
                  <div className="ta-stat-bottom">
                    <span className="ta-stat-value">{s.value}</span>
                    <span className="ta-stat-icon">{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Tabs ── */}
      <div className="ta-tabs">
        {[{ key: 'overview', icon: '📊', label: 'Overview' }, { key: 'records', icon: '📋', label: 'Records' }].map(t => (
          <button
            key={t.key}
            className={`ta-tab${activeTab === t.key ? ' ta-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="ta-overview-grid">
          {/* Chart */}
          <div className="ta-card">
            <div className="ta-card-header">
              <div>
                <span className="ta-card-title">Monthly Attendance Trend</span>
                <span className="ta-card-sub">Attendance rate %</span>
              </div>
              <span className="ta-card-badge">📈</span>
            </div>
            <div className="ta-chart-area">
              {monthlyData.length === 0 ? (
                <p className="ta-muted">No monthly data available.</p>
              ) : (
                (() => {
                  const svgWidth = 600;
                  const svgHeight = 220;
                  const paddingX = 50;
                  const paddingY = 30;

                  const points = monthlyData.map((d, idx) => {
                    const x = monthlyData.length > 1 
                      ? paddingX + (idx / (monthlyData.length - 1)) * (svgWidth - 2 * paddingX)
                      : svgWidth / 2;
                    const rate = Number(d?.rate) || 0;
                    const y = svgHeight - paddingY - (rate / 100) * (svgHeight - 2 * paddingY);
                    return { x, y, month: d.month, rate };
                  });

                  const pathD = points.length > 0 
                    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` 
                    : '';

                  return (
                    <div style={{ position: 'relative', width: '100%', height: svgHeight }}>
                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Y Axis Labels */}
                        {[0, 25, 50, 75, 100].map((val) => {
                          const y = svgHeight - paddingY - (val / 100) * (svgHeight - 2 * paddingY);
                          return (
                            <g key={val}>
                              <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
                              <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--ta-text-muted, #6b7280)">{val}%</text>
                            </g>
                          );
                        })}

                        {/* X Axis Labels */}
                        {points.map((p, i) => (
                          <text key={i} x={p.x} y={svgHeight - paddingY + 18} textAnchor="middle" fontSize="11" fill="var(--ta-text-muted, #6b7280)">{p.month}</text>
                        ))}

                        {/* Line */}
                        {pathD && (
                          <path d={pathD} fill="none" stroke="var(--ta-accent, #3b82f6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        )}

                        {/* Points & Interactive Hover */}
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle 
                              cx={p.x} cy={p.y} r={hoveredPoint && hoveredPoint.index === i ? 6 : 4} 
                              fill="var(--ta-accent, #3b82f6)" stroke="#ffffff" strokeWidth="2" 
                              style={{ cursor: 'pointer', transition: 'r 0.2s' }} 
                              onMouseEnter={() => setHoveredPoint({ ...p, index: i })}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                            
                            {hoveredPoint && hoveredPoint.index === i && (
                              <g>
                                <rect 
                                  x={p.x - 40} y={p.y - 35} width="80" height="25" rx="4" 
                                  fill="#1f2535" stroke="var(--ta-accent, #3b82f6)" strokeWidth="1" 
                                />
                                <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#e8eaf0">{p.rate}%</text>
                              </g>
                            )}
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Status */}
          <div className="ta-card">
            <div className="ta-card-header">
              <div>
                <span className="ta-card-title">Today's Status</span>
                <span className="ta-card-sub">Attendance breakdown</span>
              </div>
              <span className="ta-card-badge">📊</span>
            </div>
            <div className="ta-status-body">
              {attendanceStatus.map((item, i) => (
                <div key={i} className="ta-status-item" style={{ '--acc': item.color }}>
                  <div className="ta-status-left">
                    <div className="ta-status-dot" style={{ background: item.color }} />
                    <div className="ta-status-info">
                      <span className="ta-status-name">{item.status}</span>
                      <span className="ta-status-count">{item.count} teachers</span>
                    </div>
                  </div>
                  <div className="ta-status-pct" style={{ color: item.color }}>{item.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Records ── */}
      {activeTab === 'records' && (
        <div className="ta-card">
          <div className="ta-card-header">
            <div>
              <span className="ta-card-title">Attendance Records</span>
              <span className="ta-card-sub">Recent entries</span>
            </div>
            <span className="ta-card-badge">📋</span>
          </div>

          <div className="ta-filter-bar">
            <div className="ta-search-wrap">
              <span>🔍</span>
              <input
                className="ta-input ta-search"
                placeholder="Search teacher…"
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select className="ta-input" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Any Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
            <input className="ta-input" type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
            <input className="ta-input" type="date" value={filters.date_to}   onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
          </div>

          <div className="ta-table-wrap">
            <table className="ta-table">
              <thead>
                <tr><th>Date</th><th>Teacher</th><th>Reg No</th><th>Term</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredRecordsFinal.length === 0 ? (
                  <tr><td colSpan={6} className="ta-muted" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>No records found.</td></tr>
                ) : filteredRecordsFinal.map((r, i) => (
                  <tr key={r.id || i} className="ta-tr">
                    <td className="ta-mono">{r.date}</td>
                    <td className="ta-bold">{r.teacher_name}</td>
                    <td><span className="ta-grade-chip">{r.registration_no}</span></td>
                    <td className="ta-muted">{r.term}</td>
                    <td>{getStatusChip(r.status)}</td>
                    <td><button className="ta-view-btn" onClick={() => handleOpenModal('statement', r)}>👁 View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════ Modals ════════ */}
      {showModal && (
        <div className="ta-overlay" onClick={handleCloseModal}>
          <div className={`ta-modal${modalType === 'mark' ? ' ta-modal-lg' : ''}`} onClick={e => e.stopPropagation()}>

            {/* Mark Attendance */}
            {modalType === 'mark' && (
              <>
                <div className="ta-modal-header">
                  <div className="ta-modal-title">📝 Record Attendance</div>
                  <button className="ta-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ta-modal-body">
                  <div className="ta-form-grid">
                    <div className="ta-form-group">
                      <label className="ta-label">Date</label>
                      <input className="ta-input" type="date" value={attDate} onChange={e => setAttDate(e.target.value)} />
                    </div>
                    <div className="ta-form-group">
                      <label className="ta-label">Term</label>
                      <select className="ta-input" value={attTerm} onChange={e => setAttTerm(e.target.value)}>
                        <option>Term 1</option>
                        <option>Term 2</option>
                        <option>Term 3</option>
                      </select>
                    </div>
                  </div>
                  <div className="ta-roster-header">
                    <h4>Teacher Roster</h4>
                    <button className="ta-btn-outline" onClick={handleMarkAllPresent}>✅ Mark All Present</button>
                  </div>
                  <div className="ta-table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
                    <table className="ta-table">
                      <thead><tr><th>Teacher</th><th>Reg No</th><th>Status</th><th>Time In</th></tr></thead>
                      <tbody>
                        {teachers.length === 0 ? (
                          <tr><td colSpan={4} className="ta-muted">No teachers found.</td></tr>
                        ) : teachers.map(t => (
                          <tr key={t.registration_no}>
                            <td className="ta-bold">{t.first_name} {t.surname}</td>
                            <td className="ta-mono">{t.registration_no}</td>
                            <td>
                              <select
                                className="ta-input"
                                style={{ minWidth: 110 }}
                                value={attendanceForm[t.registration_no] || ''}
                                onChange={e => setAttendanceForm({ ...attendanceForm, [t.registration_no]: e.target.value })}
                              >
                                <option value="">— Select —</option>
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                              </select>
                            </td>
                            <td>
                               {attendanceForm[t.registration_no] === 'Present' ? (
                                  <input 
                                     type="time" 
                                     className="ta-input" 
                                     style={{ minWidth: 110 }}
                                     value={timeInForm[t.registration_no] || '08:00'} 
                                     onChange={e => setTimeInForm({ ...timeInForm, [t.registration_no]: e.target.value })} 
                                  />
                               ) : (
                                  <span className="ta-muted">—</span>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="ta-modal-footer">
                  <button className="ta-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="ta-btn-save" onClick={handleSaveAttendance} disabled={saving}>
                    {saving ? <Spinner size="sm" animation="border" /> : 'Save Attendance'}
                  </button>
                </div>
              </>
            )}

            {/* Statement view */}
            {modalType === 'statement' && selectedRecord && (
              <>
                <div className="ta-modal-header">
                  <div className="ta-modal-title">📋 Attendance Record</div>
                  <button className="ta-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="ta-modal-body">
                  <div className="ta-statement">
                    <div className="ta-statement-section">
                      <span className="ta-section-label">Teacher Information</span>
                      <div className="ta-stmt-row"><span>Name</span><strong>{selectedRecord.teacher_name}</strong></div>
                      <div className="ta-stmt-row"><span>Reg No</span><strong className="ta-mono">{selectedRecord.registration_no}</strong></div>
                    </div>
                    <div className="ta-statement-section">
                      <span className="ta-section-label">Attendance Details</span>
                      <div className="ta-stmt-row"><span>Date</span><strong className="ta-mono">{selectedRecord.date}</strong></div>
                      <div className="ta-stmt-row"><span>Term</span><strong>{selectedRecord.term}</strong></div>
                      <div className="ta-stmt-row"><span>Status</span>{getStatusChip(selectedRecord.status)}</div>
                      {selectedRecord.time_in && (
                        <div className="ta-stmt-row"><span>Time In</span><strong>{selectedRecord.time_in}</strong></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ta-modal-footer">
                  <button className="ta-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}