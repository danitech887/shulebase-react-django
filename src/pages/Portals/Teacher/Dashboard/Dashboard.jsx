import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Spinner } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import { PeopleFill, PersonXFill, CheckCircleFill, ClockHistory } from 'react-bootstrap-icons';
import './Dashboard.css';

const ACCENT = { success:'#22c55e', danger:'#ef4444', primary:'#6366f1', warning:'#f59e0b', info:'#3b82f6' };

export default function TeacherPortalDashboard() {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [filterGrade, setFilterGrade]   = useState('');
  const [filterStream, setFilterStream] = useState('');
  const { showMessage } = useMessage();

  const attendance_trend_safe = data?.attendance_trend || [];
  const chartData = useMemo(() =>
    attendance_trend_safe.map(item => ({
      label: new Date(item.date).toLocaleDateString(),
      rate: item.rate != null ? Math.round(item.rate) : 0,
    }))
  , [attendance_trend_safe]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedTerm) params.append('filter_term', selectedTerm);
        if (filterGrade)  params.append('grade', filterGrade);
        if (filterStream) params.append('stream', filterStream);
        
        const res = await api.get(`teacher-portal/dashboard/?${params.toString()}`);
        if (mounted) { setData(res.data); setError(null); }
      } catch (err) {
        if (mounted) { const msg = err.response?.data?.message || err.message || 'Failed to fetch dashboard'; setError(msg); showMessage({ type:'error', text:msg }); }
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [selectedTerm, filterGrade, filterStream]);

  if (loading) return (
    <div className="t-page d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <Spinner animation="border" className="t-spinner" />
      <span className="ms-3 t-muted">Loading dashboard…</span>
    </div>
  );

  if (error) return <div className="t-page"><div className="alert alert-danger">{error}</div></div>;
  if (!data)  return null;

  const { teacher={}, subjects=[], present_today=0, absent_today=0, completed=0, ongoing=0,
          is_class_teacher=false, attendance_rate=null, total_students=0 } = data;

  const stats = [
    ...(is_class_teacher ? [
      { label:'Present Today',    value:present_today, icon:<PeopleFill />,      color:'success' },
      { label:'Absent Today',     value:absent_today,  icon:<PersonXFill />,     color:'danger'  }
    ] : []),
    { label:'Completed Topics', value:completed,     icon:<CheckCircleFill />, color:'primary' },
    { label:'Ongoing Topics',   value:ongoing,       icon:<ClockHistory />,    color:'warning' },
  ];
  const maxRate = Math.max(...chartData.map(d => d.rate), 1);

  return (
    <div className="t-page">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h1 className="t-title">Welcome, {teacher.first_name || 'Teacher'}!</h1>
          <p className="t-subtitle">
            Registration No: <span className="t-mono">{teacher.registration_no || 'N/A'}</span>
            {is_class_teacher && <span className="badge t-badge-blue ms-2">Class Teacher</span>}
          </p>
        </div>
        <div className="d-flex gap-2">
          <select className="t-input t-select" style={{ width:120 }} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
            <option value="">All Grades</option>
            {data.grades?.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="t-input t-select" style={{ width:120 }} value={filterStream} onChange={e => setFilterStream(e.target.value)}>
            <option value="">All Streams</option>
            {data.streams?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="t-input t-select" style={{ width:140 }} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            <option value="">All Terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <Row className="g-3 mb-4">
        {stats.map((s, i) => (
          <Col xs={12} md={6} lg={3} key={i}>
            <div className="dash-stat-card card" style={{ '--dash-accent': ACCENT[s.color] }}>
              <div className="card-body d-flex align-items-center gap-3">
                <div className="dash-stat-icon" style={{ color: ACCENT[s.color] }}>{s.icon}</div>
                <div>
                  <div className="dash-stat-label">{s.label}</div>
                  <div className="dash-stat-value">{s.value ?? 0}</div>
                </div>
              </div>
            </div>
          </Col>
        ))}
        <Col xs={12} md={6} lg={3}>
          <div className="dash-stat-card card" style={{ '--dash-accent': ACCENT.info }}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="dash-stat-icon" style={{ color: ACCENT.info }}><PeopleFill /></div>
                <div>
                  <div className="dash-stat-label">Attendance Rate</div>
                  <div className="dash-stat-value">{attendance_rate != null ? `${attendance_rate.toFixed(1)}%` : 'N/A'}</div>
                  <div className="t-muted" style={{ fontSize:'0.72rem' }}>Total students: {total_students}</div>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Subjects */}
      {subjects.length > 0 && (
        <div className="t-card card mb-4">
          <div className="card-header"><span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em' }}>Subjects Assigned</span></div>
          <div className="card-body d-flex flex-wrap gap-2">
            {subjects.map((s, i) => <span key={i} className="dash-subject-badge">{s}</span>)}
          </div>
        </div>
      )}

      {/* Chart */}
    {is_class_teacher && (
      <div className="t-card card">
        <div className="card-header"><span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em' }}>Attendance Trend (last 14 days)</span></div>
        <div className="card-body">
          {chartData.length === 0 ? (
            <p className="t-muted">No attendance trend data available.</p>
          ) : (
            <div className="dash-chart-wrap">
              {chartData.map((d, i) => {
                const h = Math.max(4, (d.rate / maxRate) * 100);
                return (
                  <div key={i} className="dash-bar-group">
                    <div className="dash-bar-track">
                      <div className="dash-bar" style={{ height:`${h}%` }} title={`${d.rate}% on ${d.label}`} />
                    </div>
                    <span className="dash-bar-label">{new Date(d.label).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}

    </div>
  );
}
