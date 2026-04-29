import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import '../Portal/Portal.css';
import students from '../../../../api/api';

/* ── Shared child-switcher bar used across all portal pages ── */
export function ChildSwitcher({ children, selected, onSelect }) {
  if (!children || children.length <= 1) return null;
  return (
    <div className="pp-child-switcher">
      {children.map((child) => {
        const initials = `${child.first_name?.[0] || ''}${child.surname?.[0] || ''}`.toUpperCase();
        return (
          <button
            key={child.registration_no}
            className={`pp-child-pill ${selected?.registration_no === child.registration_no ? 'active' : ''}`}
            onClick={() => onSelect(child)}
          >
            <span className="pp-child-avatar">{initials}</span>
            {child.first_name} {child.surname}
          </button>
        );
      })}
    </div>
  );
}

export default function ParentPortalDashboard() {
  const [animate, setAnimate]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [children, setChildren]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [stats, setStats]               = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [schoolName, setSchoolName]     = useState('School');
  const [parentName, setParentName]     = useState('Parent');

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchDashboard();
  }, []);

  const fetchDashboard = async (studentId = null) => {
    try {
      setLoading(true);
      const params = studentId ? { student_id: studentId } : {};
      const { data } = await students.get('parent-portal/dashboard/', { params });
      setChildren(data.children || []);
      setSelected(data.selected_child || null);
      setSchoolName(data.school_name || 'School');
      setParentName(data.parent_name || 'Parent');
      setStats(data.stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  

  const handleSelectChild = (child) => {
    setSelected(child);
    fetchDashboard(child.registration_no);
  };

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000); };

  const statCards = stats ? [
    {
      label: 'Attendance Rate',
      value: `${stats.attendance_rate?.toFixed(1) || 0}%`,
      icon: '📅',
      accent: '#10b981',
      trend: stats.attendance_rate >= 80 ? 'good' : 'warn',
      trendLabel: stats.attendance_rate >= 80 ? 'On Track' : 'Review',
    },
    {
      label: 'Fee Balance',
      value: `Ksh ${stats.fee_balance?.toLocaleString() || 0}`,
      icon: '💰',
      accent: stats.fee_balance > 0 ? '#d97706' : '#10b981',
      trend: stats.fee_balance > 0 ? 'warn' : 'good',
      trendLabel: stats.fee_balance > 0 ? 'Outstanding' : 'Cleared',
    },
    {
      label: 'Pending Leaves',
      value: stats.pending_leaves || 0,
      icon: '📋',
      accent: stats.pending_leaves > 0 ? '#d97706' : '#6366f1',
      trend: stats.pending_leaves > 0 ? 'warn' : 'good',
      trendLabel: stats.pending_leaves > 0 ? 'Awaiting' : 'None',
    },
    {
      label: "Child's Grade",
      value: selected?.grade || '—',
      icon: '🏫',
      accent: '#6366f1',
      trend: 'good',
      trendLabel: selected?.stream || '—',
    },
  ] : [];

  const quickLinks = [
    { icon: '💳', title: 'Pay Fees',       desc: 'Report an M-Pesa payment', to: '../parent-portal/fees'       },
    { icon: '📋', title: 'Apply Leave',    desc: 'Submit a leave request',    to: '../parent-portal/leave'      },
    { icon: '📅', title: 'Attendance',     desc: 'Check daily attendance',    to: '../parent-portal/attendance' },
    { icon: '📊', title: 'Academics',      desc: 'View CBC performance',      to: '../parent-portal/academics'  },
  ];

  return (
    <div className={`pp-root ${animate ? 'pp-ready' : ''}`}>
      <div className="pp-blob pp-blob-1" />
      <div className="pp-blob pp-blob-2" />

      {successMessage && (
        <div className="pp-alert">
          <span>✅ {successMessage}</span>
          <button className="pp-alert-close" onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}

      {/* Header */}
      <header className="pp-header">
        <div className="pp-header-left">
          <div className="pp-header-icon">👨‍👩‍👧‍👦</div>
          <div>
            <h1 className="pp-title">Welcome, {parentName}</h1>
            <p className="pp-subtitle">Parent Portal • Monitor your child's progress</p>
          </div>
        </div>
        <div className="pp-header-actions">
          <ChildSwitcher children={children} selected={selected} onSelect={handleSelectChild} />
        </div>
      </header>

      {/* Stats */}
      <div className="pp-stats-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pp-stat pp-skeleton" style={{ '--delay': `${i * 0.08}s` }}>
                <div className="sk-line sk-short" /><div className="sk-line sk-long" />
              </div>
            ))
          : statCards.map((s, i) => (
              <div key={i} className="pp-stat" style={{ '--acc': s.accent, '--delay': `${i * 0.1}s` }}>
                <div className="pp-stat-top">
                  <span className="pp-stat-label">{s.label}</span>
                  <span className={`pp-trend ${s.trend}`}>{s.trendLabel}</span>
                </div>
                <div className="pp-stat-bottom">
                  <span className="pp-stat-value">{s.value}</span>
                  <span className="pp-stat-icon">{s.icon}</span>
                </div>
                <div className="pp-stat-bar"><div className="pp-stat-bar-fill" /></div>
              </div>
            ))}
      </div>

      {/* Quick links + Child info */}
      {!loading && selected && (
        <div className="pp-two-col" style={{ position: 'relative', zIndex: 1 }}>
          {/* Quick links */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div>
                <span className="pp-card-title">Quick Actions</span>
                <span className="pp-card-sub">Navigate to key sections</span>
              </div>
              <span className="pp-card-badge">⚡</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.5rem' }}>
              {quickLinks.map((a, i) => (
                <Link
                  key={i}
                  to={a.to}
                  className="pp-quick-link"
                >
                  <div
                    className="pp-stat"
                    style={{
                      '--acc': '#6366f1',
                      '--delay': `${i * 0.07}s`,
                      cursor: 'pointer',
                      padding: '1.1rem',
                      marginBottom: 0,
                    }}
                  >
                    <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{a.icon}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--pp-text)' }}>{a.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--pp-text-muted)', marginTop: '0.2rem' }}>{a.desc}</div>
                    <div className="pp-stat-bar"><div className="pp-stat-bar-fill" /></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Child profile card */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div>
                <span className="pp-card-title">Student Profile</span>
                <span className="pp-card-sub">{selected.registration_no}</span>
              </div>
              <span className="pp-card-badge">🎓</span>
            </div>
            <div className="pp-detail-rows">
              {[
                ['Full Name',        `${selected.first_name} ${selected.surname}`],
                ['Reg. Number',      selected.registration_no],
                ['Grade',            selected.grade],
                ['Stream',           selected.stream || '—'],
                ['Year',             selected.year || new Date().getFullYear()],
              ].map(([label, val]) => (
                <div key={label} className="pp-detail-row">
                  <span className="pp-detail-label">{label}</span>
                  <strong className="pp-detail-val">{val}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}