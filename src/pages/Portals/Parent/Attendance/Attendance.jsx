import React, { useState, useEffect } from 'react';
import '../Portal/Portal.css';

import { ChildSwitcher } from '../Dashboard/Dashboard';
import api from '../../../../api/api';

export default function ParentPortalAttendance() {
  const [animate, setAnimate]               = useState(false);
  const [loading, setLoading]               = useState(true);
  const [children, setChildren]             = useState([]);
  const [selected, setSelected]             = useState(null);
  const [records, setRecords]               = useState([]);
  const [filterMonth, setFilterMonth]       = useState('');
  const [filterStatus, setFilterStatus]     = useState('');

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchAll();
  }, []);

  const fetchAll = async (studentId = null) => {
    try {
      setLoading(true);
      const params = studentId ? { student_id: studentId } : {};
      const dash = await api.get('parent-portal/dashboard/', { params });
      setChildren(dash.data.children || []);
      const studentRef = dash.data.selected_child;
      setSelected(studentRef || null);

      const regNo = studentId || studentRef?.registration_no;
      if (!regNo) { setLoading(false); return; }

      const res = await api.get('parent-portal/attendance/', { params: { registration_no: regNo } });
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setRecords(list);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectChild = (child) => { setSelected(child); fetchAll(child.registration_no); };

  // Derived stats
  const total   = records.length;
  const present = records.filter(r => r.status === 'Present').length;
  const absent  = records.filter(r => r.status === 'Absent').length;
  const late    = records.filter(r => r.status === 'Late').length;
  const rate    = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

  // Filtered
  const filtered = records.filter(r => {
    const matchMonth  = filterMonth  ? r.date?.slice(0, 7) === filterMonth  : true;
    const matchStatus = filterStatus ? r.status === filterStatus              : true;
    return matchMonth && matchStatus;
  });

  const attCards = [
    { label: 'Attendance Rate', value: `${rate}%`,  icon: '📊', accent: rate >= 80 ? '#10b981' : rate >= 60 ? '#d97706' : '#ef4444', trend: rate >= 80 ? 'good' : rate >= 60 ? 'warn' : 'bad', pct: rate },
    { label: 'Days Present',    value: present,      icon: '✅', accent: '#10b981', trend: 'good',  pct: total > 0 ? (present/total)*100 : 0 },
    { label: 'Days Absent',     value: absent,       icon: '❌', accent: '#ef4444', trend: absent > 5 ? 'bad' : 'good', pct: total > 0 ? (absent/total)*100 : 0 },
    { label: 'Late Arrivals',   value: late,         icon: '⏰', accent: '#d97706', trend: late > 3 ? 'warn' : 'good',  pct: total > 0 ? (late/total)*100 : 0 },
  ];

  const getStatusChip = (status) => {
    const map = {
      Present: { cls: 'pp-chip-green', label: '✅ Present' },
      Absent:  { cls: 'pp-chip-red',   label: '❌ Absent'  },
      Late:    { cls: 'pp-chip-amber', label: '⏰ Late'    },
    };
    const s = map[status] || { cls: 'pp-chip-surface', label: status };
    return <span className={`pp-chip ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className={`pp-root ${animate ? 'pp-ready' : ''}`}>
      <div className="pp-blob pp-blob-1" />
      <div className="pp-blob pp-blob-2" />

      {/* Header */}
      <header className="pp-header">
        <div className="pp-header-left">
          <div className="pp-header-icon">📅</div>
          <div>
            <h1 className="pp-title">Attendance</h1>
            <p className="pp-subtitle">Daily attendance records and summary statistics</p>
          </div>
        </div>
        <div className="pp-header-actions">
          <ChildSwitcher children={children} selected={selected} onSelect={handleSelectChild} />
        </div>
      </header>

      {/* Attendance summary cards */}
      <div className="pp-att-summary" style={{ position: 'relative', zIndex: 1 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pp-att-card pp-skeleton" style={{ '--delay': `${i * 0.08}s` }}>
                <div className="sk-line sk-short" style={{ margin: '0 auto 0.75rem' }} />
                <div className="sk-line sk-long"  style={{ margin: '0 auto' }} />
              </div>
            ))
          : attCards.map((c, i) => (
              <div key={i} className="pp-att-card" style={{ '--acc': c.accent, '--delay': `${i * 0.1}s` }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{c.icon}</div>
                <div className="pp-att-card-value">{c.value}</div>
                <div className="pp-att-card-label">{c.label}</div>
                <div className="pp-att-card-bar">
                  <div className="pp-att-card-fill" style={{ width: `${c.pct}%`, '--delay': `${i * 0.12}s` }} />
                </div>
              </div>
            ))}
      </div>

      {/* Rate progress card */}
      {!loading && total > 0 && (
        <div className="pp-card" style={{ position: 'relative', zIndex: 1, marginBottom: '1rem' }}>
          <div className="pp-card-header">
            <div>
              <span className="pp-card-title">Attendance Rate</span>
              <span className="pp-card-sub">{present} present out of {total} school days</span>
            </div>
            <span className={`pp-chip ${rate >= 80 ? 'pp-chip-green' : rate >= 60 ? 'pp-chip-amber' : 'pp-chip-red'}`}>
              {rate >= 80 ? '✅ Good' : rate >= 60 ? '⚠️ Fair' : '❌ Poor'}
            </span>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span className="pp-muted" style={{ fontSize: '0.78rem' }}>Overall attendance</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.9rem', fontWeight: 700, color: 'var(--pp-text)' }}>{rate}%</span>
            </div>
            <div className="pp-prog-track" style={{ height: '10px' }}>
              <div
                className="pp-prog-fill"
                style={{
                  width: `${rate}%`,
                  background: rate >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : rate >= 60 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)',
                  '--delay': '0.3s',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div className="pp-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="pp-card-header">
          <div>
            <span className="pp-card-title">Daily Records</span>
            <span className="pp-card-sub">{filtered.length} records shown</span>
          </div>
          <div className="pp-filters">
            <input
              className="pp-input pp-select"
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              title="Filter by month"
            />
            <select className="pp-input pp-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
            {(filterMonth || filterStatus) && (
              <button className="pp-btn-cancel" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }} onClick={() => { setFilterMonth(''); setFilterStatus(''); }}>
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="pp-table-wrap">
          {loading ? (
            <div className="pp-loading"><div className="pp-spinner" /><span>Loading attendance…</span></div>
          ) : (
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Date</th><th>Day</th><th>Status</th><th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan="4" className="pp-empty-cell">No attendance records found.</td></tr>
                  : filtered.map((r, i) => {
                      const d = r.date ? new Date(r.date) : null;
                      const dayName = d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : '—';
                      return (
                        <tr key={r.id || i} className="pp-tr" style={{ '--ri': i }}>
                          <td className="pp-mono">{r.date}</td>
                          <td className="pp-muted" style={{ fontSize: '0.78rem' }}>{dayName}</td>
                          <td>{getStatusChip(r.status)}</td>
                          <td className="pp-muted">{r.remarks || '—'}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}