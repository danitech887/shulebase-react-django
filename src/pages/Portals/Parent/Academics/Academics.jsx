import React, { useState, useEffect } from 'react';
import '../Portal/Portal.css';
import { ChildSwitcher } from '../Dashboard/Dashboard';
import api from '../../../../api/api';

const CBC_COLORS = {
  EE: { accent: '#10b981', chip: 'pp-chip-green',  label: 'Exceeding Expectations' },
  ME: { accent: '#6366f1', chip: 'pp-chip-indigo',  label: 'Meeting Expectations'   },
  AE: { accent: '#d97706', chip: 'pp-chip-amber',   label: 'Approaching Expectations'},
  BE: { accent: '#ef4444', chip: 'pp-chip-red',     label: 'Below Expectations'      },
};

export default function ParentPortalAcademics() {
  const [animate, setAnimate]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [children, setChildren]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [performance, setPerformance]   = useState([]);
  const [term, setTerm]                 = useState('Term 1');
  const [year, setYear]                 = useState(new Date().getFullYear());
  const [selectedSystem, setSelectedSystem] = useState('CBA');
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [viewSubject, setViewSubject] = useState(null);
  const [classTeacherComment, setClassTeacherComment] = useState('');
  const [viewSubject, setViewSubject] = useState(null);
  const [classTeacherComment, setClassTeacherComment] = useState('');
  const [headteacherComment, setHeadteacherComment] = useState('');

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchAll();
  }, []);

  const fetchAll = async (studentId = null, t = term, y = year, sys = selectedSystem) => {
    try {
      setLoading(true);
      const params = { ...(studentId ? { student_id: studentId } : {}), term: t, year: y, system: sys };
      const dash = await api.get('parent-portal/dashboard/', { params: studentId ? { student_id: studentId } : {} });
      setChildren(dash.data.children || []);
      setSelected(dash.data.selected_child || null);

      const res = await api.get('parent-portal/academics/', { params });
      setPerformance(res.data.performance || []);
      setClassTeacherComment(res.data.class_teacher_comment || '');
      setHeadteacherComment(res.data.headteacher_comment || '');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectChild = (child) => { setSelected(child); fetchAll(child.registration_no, term, year, selectedSystem); };

  const handleFilter = () => fetchAll(selected?.registration_no, term, year, selectedSystem);

  async function handleDownloadReport(type = 'cba') {
    if (!selected) return;
    setDownloadingReport(true);
    setShowReportModal(false);
    try {
      const endpoint = type === 'summative' 
        ? `academics/summative-individual-report/`
        : `student-portal/academics/report-form/`;
        
      const response = await api.get(
        `${endpoint}?registration_no=${encodeURIComponent(selected.registration_no)}&term=${encodeURIComponent(term)}&year=${encodeURIComponent(year)}`,
        { responseType: 'blob' }
      );
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `${type === 'summative' ? 'Summative' : 'CBA'}-Report-${selected.first_name}-${term.replace(' ','-')}-${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error('Report download error:', err); }
    finally { setDownloadingReport(false); }
  }

  const avgScore = performance.length > 0
    ? (performance.reduce((s, p) => s + (p.score || 0), 0) / performance.length).toFixed(1)
    : 0;

  const topRating = performance.length > 0
    ? performance.sort((a, b) => (b.score || 0) - (a.score || 0))[0]
    : null;

  const overallLevel = (() => {
    if (!performance.length) return null;
    const avgScore_ = performance.reduce((s, p) => s + (p.score || 0), 0) / performance.length;
    if (avgScore_ >= 80) return 'EE';
    if (avgScore_ >= 60) return 'ME';
    if (avgScore_ >= 40) return 'AE';
    return 'BE';
  })();

  return (
    <div className={`pp-root ${animate ? 'pp-ready' : ''}`}>
      <div className="pp-blob pp-blob-1" />
      <div className="pp-blob pp-blob-2" />

      {/* Header */}
      <header className="pp-header">
        <div className="pp-header-left">
          <div className="pp-header-icon">📊</div>
          <div>
            <h1 className="pp-title">Academic Performance</h1>
            <p className="pp-subtitle">CBC competency-based assessment results</p>
          </div>
        </div>
        <div className="pp-header-actions">
          <ChildSwitcher children={children} selected={selected} onSelect={handleSelectChild} />
        </div>
      </header>

      {/* Term / Year filter */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select className="pp-input" style={{ width: 'auto' }} value={term} onChange={e => setTerm(e.target.value)}>
          <option>Term 1</option><option>Term 2</option><option>Term 3</option>
        </select>
        <select className="pp-input" style={{ width: 'auto' }} value={year} onChange={e => setYear(e.target.value)}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="pp-input" style={{ width: 'auto' }} value={selectedSystem} onChange={e => setSelectedSystem(e.target.value)}>
          <option value="CBA">CBC (CBA)</option>
          <option value="Summative">Summative</option>
        </select>
        <button className="pp-btn-primary" style={{ padding: '0.55rem 1.1rem' }} onClick={handleFilter}>
          🔍 Load Results
        </button>
        <button className="pp-btn-primary" style={{ padding: '0.55rem 1.1rem', background: '#a5b4fc', color: '#1e1b4b' }} disabled={downloadingReport} onClick={() => setShowReportModal(true)}>
          {downloadingReport ? '⏳ Generating...' : '📄 Report Form'}
        </button>
      </div>

      {/* Summary stats */}
      <div className="pp-stats-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pp-stat pp-skeleton" style={{ '--delay': `${i * 0.08}s` }}>
                <div className="sk-line sk-short" /><div className="sk-line sk-long" />
              </div>
            ))
          : [
              {
                label: 'Average Score',
                value: `${avgScore}`,
                icon: '📊',
                accent: '#6366f1',
                trend: avgScore >= 70 ? 'good' : avgScore >= 50 ? 'warn' : 'bad',
                trendLabel: `${term} ${year}`,
              },
              {
                label: 'Overall Level',
                value: overallLevel || '—',
                icon: '🏆',
                accent: overallLevel ? CBC_COLORS[overallLevel].accent : '#6b7280',
                trend: overallLevel === 'EE' || overallLevel === 'ME' ? 'good' : 'warn',
                trendLabel: overallLevel ? CBC_COLORS[overallLevel].label : 'No data',
              },
              {
                label: 'Best Subject',
                value: topRating?.subject?.split(' ')[0] || '—',
                icon: '⭐',
                accent: '#10b981',
                trend: 'good',
                trendLabel: topRating ? `${topRating.score} pts` : '—',
              },
            ].map((s, i) => (
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

      {/* Subject cards */}
      <div className="pp-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="pp-card-header">
          <div>
            <span className="pp-card-title">Subject Performance</span>
            <span className="pp-card-sub">{term} {year} — {performance.length} subjects</span>
          </div>
          <span className="pp-card-badge">📚</span>
        </div>

        {loading ? (
          <div className="pp-loading"><div className="pp-spinner" /><span>Loading results…</span></div>
        ) : performance.length === 0 ? (
          <div className="pp-empty-cell" style={{ padding: '3rem' }}>
            No performance data available for {term} {year}. Please check back after assessments are completed.
          </div>
        ) : (
          <div className="pp-subject-grid">
            {performance.map((p, i) => {
              const lvl = p.rating && CBC_COLORS[p.rating] ? CBC_COLORS[p.rating] : CBC_COLORS['BE'];
              const scorePct = Math.min((p.score / 100) * 100, 100);
              return (
                <div
                  key={i}
                  className="pp-subject-card"
                  style={{ '--delay': `${i * 0.07}s`, cursor: 'pointer' }}
                  onClick={() => { setViewSubject(p); setShowSubjectModal(true); }}
                >
                  <div className="pp-subject-name">{p.subject}</div>
                  <div className="pp-subject-score">{p.score}</div>
                  <div className="pp-subject-rating-row">
                    <span className="pp-cbc-level" style={{ color: selectedSystem === 'Summative' ? '#a5b4fc' : undefined }}>{p.rating || 'N/A'}</span>
                    <span className="pp-cbc-remark">{p.remark}</span>
                  </div>
                  <div className="pp-subject-bar">
                    <div
                      className="pp-subject-bar-fill"
                      style={{
                        width: `${scorePct}%`,
                        background: `linear-gradient(90deg, ${lvl.accent}, ${lvl.accent}aa)`,
                        boxShadow: `0 0 8px ${lvl.accent}55`,
                        '--delay': `${i * 0.08}s`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Overall CBC legend */}
        {!loading && performance.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', padding: '0 1.5rem 1.5rem', flexWrap: 'wrap' }}>
            {Object.entries(CBC_COLORS).map(([key, val]) => (
              <span key={key} className={`pp-chip ${val.chip}`}>{key} — {val.label}</span>
            ))}
          </div>
        )}
      </div>

      {/* Teacher Remarks */}
      {(classTeacherComment || headteacherComment) && (
        <div className="pp-card" style={{ position: 'relative', zIndex: 1, marginTop: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div className="pp-card-header">
            <div>
              <span className="pp-card-title">Teacher Remarks</span>
            </div>
            <span className="pp-card-badge">📝</span>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {classTeacherComment && (
              <div>
                <h6 style={{ fontSize: '0.8rem', color: 'var(--pp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Class Teacher</h6>
                <p style={{ fontSize: '0.95rem', color: 'var(--pp-text)', margin: 0, fontStyle: 'italic' }}>"{classTeacherComment}"</p>
              </div>
            )}
            {headteacherComment && (
              <div>
                <h6 style={{ fontSize: '0.8rem', color: 'var(--pp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Headteacher</h6>
                <p style={{ fontSize: '0.95rem', color: 'var(--pp-text)', margin: 0, fontStyle: 'italic' }}>"{headteacherComment}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subject detail modal */}
      {showSubjectModal && viewSubject && (
        <div className="pp-overlay" onClick={() => setShowSubjectModal(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>
            <div className="pp-modal-header">
              <div className="pp-modal-title"><span>📚</span> {viewSubject.subject}</div>
              <button className="pp-modal-close" onClick={() => setShowSubjectModal(false)}>✕</button>
            </div>
            <div className="pp-modal-body">
              <div className="pp-statement">
                <div className="pp-statement-section">
                  <h6>Assessment Summary</h6>
                  {[
                    ['Subject',    viewSubject.subject],
                    ['Score',      `${viewSubject.score} / 100`],
                    ['CBC Level',  viewSubject.rating || 'N/A'],
                    ['Remark',     viewSubject.remark],
                    ['Term',       term],
                    ['Year',       year],
                  ].map(([l, v]) => (
                    <div key={l} className="pp-statement-row"><span>{l}</span><strong>{v}</strong></div>
                  ))}
                </div>

                {viewSubject.rating && CBC_COLORS[viewSubject.rating] && (
                  <div className="pp-info-box">
                    <strong>{viewSubject.rating}</strong> — {CBC_COLORS[viewSubject.rating].label}.{' '}
                    {viewSubject.rating === 'EE' && 'Excellent work! Your child is excelling beyond the expected standard.'}
                    {viewSubject.rating === 'ME' && 'Good work! Your child has achieved the expected competency level.'}
                    {viewSubject.rating === 'AE' && 'Your child is making progress but needs additional support.'}
                    {viewSubject.rating === 'BE' && 'Your child requires significant support to reach the expected level.'}
                  </div>
                )}
              </div>
            </div>
            <div className="pp-modal-footer">
              <button className="pp-btn-cancel" onClick={() => setShowSubjectModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Form type selection modal */}
      {showReportModal && (
        <div className="pp-overlay" onClick={() => setShowReportModal(false)}>
          <div className="pp-modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="pp-modal-header">
              <div className="pp-modal-title"><span>📄</span> Download Report Form</div>
              <button className="pp-modal-close" onClick={() => setShowReportModal(false)}>✕</button>
            </div>
            <div className="pp-modal-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <p style={{ color: 'var(--pp-text-dim)', fontSize: '0.95rem' }}>Which report form would you like to generate for <strong>{selected?.first_name}</strong>?</p>
              <button className="pp-btn-primary" style={{ padding: '0.75rem' }} onClick={() => handleDownloadReport('cba')}>
                📋 Download CBC (CBA) Report
              </button>
              <button className="pp-btn-primary" style={{ padding: '0.75rem', background: '#818cf8' }} onClick={() => handleDownloadReport('summative')}>
                📊 Download Summative Report
              </button>
            </div>
            <div className="pp-modal-footer">
              <button className="pp-btn-cancel" onClick={() => setShowReportModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
