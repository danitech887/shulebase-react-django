import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Dashboard.css';

export default function StudentPortalDashboard() {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get(`student-portal/dashboard/?term=${selectedTerm}`);
        setData(res.data);
      } catch {
        showMessage({ type: 'error', text: 'Failed to load dashboard.' });
      } finally { setLoading(false); }
    };
    fetch();
  }, [selectedTerm]);

  if (loading) return (
    <div className="sp-page d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" className="sp-spinner" />
    </div>
  );

  const { summary = {}, term_choices = [], current_year } = data || {};
  const { fees = {}, attendance = {}, leaves = {} } = summary;

  const paidPct = fees.expected > 0 ? Math.min(100, Math.round((fees.paid / fees.expected) * 100)) : 0;
  const attPct  = Math.round(attendance.percentage || 0);

  return (
    <div className="sp-page">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          {data?.profile_image ? (
            <img src={data.profile_image} className="sp-header-avatar" alt="" />
          ) : (
            <div className="sp-header-avatar-placeholder">👤</div>
          )}
          <div>
            <h2 className="sp-title">Welcome, {data?.student_name || 'Student'}</h2>
            <p className="sp-subtitle">Academic Year {current_year} — overview of your progress</p>
            {data?.class_teacher && (
              <p className="sp-subtitle" style={{ color: 'var(--sp-accent)', fontWeight: 600 }}>
                Class Teacher: {data.class_teacher}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="sp-label">Term</label>
          <select className="sp-select" style={{ width: 150 }} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {(term_choices.length ? term_choices : ['Term 1','Term 2','Term 3']).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="dash-summary-grid mb-4">

        {/* Fees card */}
        <div className="sp-stat sp-card-accent" style={{ '--stat-accent': '#22c55e' }}>
          <div className="sp-stat-label">Fee Status</div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="sp-stat-value" style={{ fontSize: '1.5rem' }}>KES {Number(fees.paid || 0).toLocaleString()}</div>
              <div className="sp-stat-sub">of KES {Number(fees.expected || 0).toLocaleString()} expected</div>
            </div>
            <span className="sp-stat-icon">💳</span>
          </div>
          <div className="dash-fee-bar-wrap">
            <div className="dash-fee-bar-track">
              <div className="dash-fee-bar-fill" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="d-flex justify-content-between mt-1">
              <span style={{ fontSize: '0.68rem', color: 'var(--sp-text-muted)' }}>{paidPct}% paid</span>
              <span style={{ fontSize: '0.68rem', color: fees.balance > 0 ? '#f87171' : '#4ade80' }}>
                Balance: KES {Number(fees.balance || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance card */}
        <div className="sp-stat sp-card-accent" style={{ '--stat-accent': '#6366f1' }}>
          <div className="sp-stat-label">Attendance</div>
          <div className="d-flex align-items-center gap-3">
            <div className="dash-donut" style={{ '--pct': attPct }}>
              <span className="dash-donut-label">{attPct}%</span>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="sp-pill sp-pill-green">Present: {attendance.present || 0}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="sp-pill sp-pill-red">Absent: {attendance.absent || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leaves card */}
        <div className="sp-stat sp-card-accent" style={{ '--stat-accent': '#f59e0b' }}>
          <div className="sp-stat-label">Leave Applications</div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="sp-stat-value">{leaves.total || 0}</div>
              <div className="sp-stat-sub">Total applications</div>
            </div>
            <span className="sp-stat-icon">📋</span>
          </div>
          <div className="d-flex gap-2 mt-2 flex-wrap">
            <span className="sp-pill sp-pill-green">✓ {leaves.approved || 0} Approved</span>
            <span className="sp-pill sp-pill-yellow">⏳ {leaves.pending || 0} Pending</span>
          </div>
        </div>

      </div>

      {/* Quick nav cards */}
      <div className="sp-card sp-card-accent">
        <div className="sp-card-header">
          <span className="sp-card-header-title">Quick Navigation</span>
        </div>
        <div className="sp-card-body">
          <div className="d-flex flex-wrap gap-3">
            {[
              { icon: '💳', label: 'Fee Records',  color: '#22c55e', accent: 'var(--sp-green-soft)', path: '/students-portal/fees' },
              { icon: '📅', label: 'Attendance',   color: '#6366f1', accent: 'var(--sp-accent-soft)', path: '/students-portal/attendance' },
              { icon: '📚', label: 'Academics',    color: '#3b82f6', accent: 'var(--sp-blue-soft)', path: '/students-portal/academics' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.7rem 1rem', background: item.accent,
                border: `1px solid ${item.color}33`, borderRadius: 'var(--sp-radius-sm)',
                cursor: 'pointer', minWidth: 140, flex: '1 1 140px',
                transition: 'transform 0.15s',
              }}
                onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform=''}
                onClick={() => navigate(item.path)}
              >
                <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.83rem', fontWeight: 600, color: item.color }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}