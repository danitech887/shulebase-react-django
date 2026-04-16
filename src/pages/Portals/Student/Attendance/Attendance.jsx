import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Attendance.css';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export default function StudentPortalAttendance() {
  const { showMessage } = useMessage();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`student-portal/attendance/?term=${selectedTerm}`);
        setData(res.data);
      } catch { showMessage({ type: 'error', text: 'Failed to load attendance.' }); }
      finally { setLoading(false); }
    })();
  }, [selectedTerm]);

  if (loading) return (
    <div className="sp-page d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" className="sp-spinner" />
    </div>
  );

  const { records = [], stats = {}, class_teacher = 'N/A' } = data || {};
  const pct = Math.round(stats.percentage || 0);
  const pctColor = pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="sp-page">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h2 className="sp-title">Attendance Record</h2>
          <p className="sp-subtitle">Class Teacher: <strong style={{ color: 'var(--sp-text)' }}>{class_teacher}</strong></p>
        </div>
        <div>
          <label className="sp-label">Term</label>
          <select className="sp-select" style={{ width: 150 }} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="d-flex flex-wrap gap-3 mb-4">

        {/* Ring + summary */}
        <div className="sp-card sp-card-accent" style={{ flex: '1 1 260px', padding: '1.5rem' }}>
          <div className="d-flex align-items-center gap-4">
            <div className="att-ring" style={{ '--pct': pct }}>
              <div className="att-ring-label">
                <span style={{ color: pctColor }}>{pct}%</span>
                <span className="att-ring-sub">Attendance</span>
              </div>
            </div>
            <div>
              <div className="mb-2">
                <div className="sp-label">Present Days</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>{stats.present || 0}</div>
              </div>
              <div>
                <div className="sp-label">Absent Days</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{stats.absent || 0}</div>
              </div>
            </div>
          </div>
          <div className="sp-progress-track mt-3" style={{ height: 6 }}>
            <div className="sp-progress-fill" style={{ width: `${pct}%`, background: pctColor }} />
          </div>
        </div>

        {/* Status mini cards */}
        {[
          { label: 'Total Days',   value: (stats.present||0) + (stats.absent||0), accent: '#6366f1', icon: '📅' },
          { label: 'Present',      value: stats.present || 0,                      accent: '#22c55e', icon: '✅' },
          { label: 'Absent',       value: stats.absent  || 0,                      accent: '#ef4444', icon: '❌' },
        ].map((s, i) => (
          <div key={i} className="sp-stat" style={{ '--stat-accent': s.accent, '--delay': `${i * 0.07}s`, flex: '1 1 140px' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="sp-stat-label">{s.label}</div>
                <div className="sp-stat-value">{s.value}</div>
              </div>
              <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Day grid */}
      {records.length > 0 && (
        <div className="sp-card mb-4">
          <div className="sp-card-header">
            <span className="sp-card-header-title">Attendance Overview</span>
            <div className="d-flex gap-2">
              <span className="sp-pill sp-pill-green" style={{ fontSize: '0.65rem' }}>■ Present</span>
              <span className="sp-pill sp-pill-red"   style={{ fontSize: '0.65rem' }}>■ Absent</span>
            </div>
          </div>
          <div className="sp-card-body">
            <div className="att-calendar">
              {records.map((r, i) => (
                <div
                  key={i}
                  className={`att-day ${r.status === 'Present' ? 'att-day-present' : 'att-day-absent'}`}
                  title={`${r.date} — ${r.status}`}
                >
                  {new Date(r.date).getDate()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed table */}
      <div className="sp-card">
        <div className="sp-card-header">
          <span className="sp-card-header-title">Detailed Records</span>
          <span className="sp-mono">{records.length} entries</span>
        </div>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr><th>#</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-4 sp-muted">No records for {selectedTerm}.</td></tr>
              ) : records.map((r, i) => (
                <tr key={i}>
                  <td className="sp-mono">{i + 1}</td>
                  <td className="sp-mono">{r.date}</td>
                  <td>
                    <span className={`sp-pill ${r.status === 'Present' ? 'sp-pill-green' : 'sp-pill-red'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}