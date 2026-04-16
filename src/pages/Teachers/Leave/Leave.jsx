import React, { useState, useEffect } from 'react';
import '../../Portals/Parent/Portal/Portal.css'; // reuses the shared dark theme
import api from '../../../api/api';

/* ─────────────────────────────────────────────────────────────
   STATUS CHIP helper
───────────────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const map = {
    Approved:  { cls: 'pp-chip pp-chip-green',   label: '✅ Approved'  },
    Pending:   { cls: 'pp-chip pp-chip-amber',   label: '⏳ Pending'   },
    Rejected:  { cls: 'pp-chip pp-chip-red',     label: '❌ Rejected'  },
    Cancelled: { cls: 'pp-chip pp-chip-surface', label: '🚫 Cancelled' },
  };
  const s = map[status] || { cls: 'pp-chip pp-chip-surface', label: status };
  return <span className={s.cls}>{s.label}</span>;
}

export default function AdminTeacherLeave() {
  const [animate, setAnimate]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [records, setRecords]           = useState([]);
  const [stats,   setStats]             = useState(null);
  const [search,  setSearch]            = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage,   setErrorMessage]   = useState('');

  // Modal state
  const [showModal,   setShowModal]   = useState(false);
  const [modalType,   setModalType]   = useState('');   // 'view' | 'approve' | 'reject'
  const [activeLeave, setActiveLeave] = useState(null);
  const [adminNote,   setAdminNote]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchAll();
  }, []);

  /* ── data fetching ── */
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [leavesRes, statsRes] = await Promise.all([
        api.get('teachers/leave/'),
        api.get('teachers/leave/stats/'),
      ]);
      setRecords(leavesRes.data || []);
      setStats(statsRes.data   || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 4000); };
  const showError   = (msg) => { setErrorMessage(msg);   setTimeout(() => setErrorMessage(''),   5000); };

  /* ── modal helpers ── */
  const openModal = (type, leave) => {
    setModalType(type);
    setActiveLeave(leave);
    setAdminNote(leave?.admin_note || '');
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setModalType(''); setActiveLeave(null); setAdminNote(''); };

  /* ── approve / reject action ── */
  const handleStatusChange = async (newStatus) => {
    if (!activeLeave) return;
    try {
      setSubmitting(true);
      await api.put(`teachers/leave/${activeLeave.id}/`, {
        status:     newStatus,
        admin_note: adminNote,
      });
      showSuccess(`Leave ${newStatus.toLowerCase()} successfully!`);
      closeModal();
      fetchAll();
    } catch (err) {
      showError(err.response?.data?.error || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave record permanently?')) return;
    try {
      await api.delete(`teachers/leave/${id}/`);
      showSuccess('Leave record deleted.');
      fetchAll();
    } catch { showError('Failed to delete record.'); }
  };

  /* ── filtered view ── */
  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      r.teacher_name?.toLowerCase().includes(q) ||
      r.reg_no?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statCards = stats ? [
    { label: 'Total Requests', value: stats.total,     icon: '📋', accent: '#6366f1', trend: 'good', trendLabel: 'All time' },
    { label: 'Pending',        value: stats.pending,   icon: '⏳', accent: '#d97706', trend: stats.pending > 0 ? 'warn' : 'good', trendLabel: stats.pending > 0 ? 'Needs review' : 'Clear' },
    { label: 'Approved',       value: stats.approved,  icon: '✅', accent: '#10b981', trend: 'good', trendLabel: 'Granted' },
    { label: 'Rejected',       value: stats.rejected,  icon: '❌', accent: '#ef4444', trend: stats.rejected > 0 ? 'bad' : 'good', trendLabel: 'Declined' },
  ] : [];

  const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Compassionate', 'Unpaid', 'Other'];

  return (
    <div className={`pp-root ${animate ? 'pp-ready' : ''}`}>
      <div className="pp-blob pp-blob-1" />
      <div className="pp-blob pp-blob-2" />

      {/* Alerts */}
      {successMessage && (
        <div className="pp-alert">
          <span>✅ {successMessage}</span>
          <button className="pp-alert-close" onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}
      {errorMessage && (
        <div className="pp-alert" style={{ background: 'var(--pp-red-soft)', borderColor: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>
          <span>❌ {errorMessage}</span>
          <button className="pp-alert-close" onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {/* Header */}
      <header className="pp-header">
        <div className="pp-header-left">
          <div className="pp-header-icon">📋</div>
          <div>
            <h1 className="pp-title">Teacher Leave Management</h1>
            <p className="pp-subtitle">Review and approve teacher leave applications</p>
          </div>
        </div>
      </header>

      {/* Stat cards */}
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

      {/* Filters + table */}
      <div className="pp-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="pp-card-header">
          <div>
            <span className="pp-card-title">Leave Applications</span>
            <span className="pp-card-sub">{filtered.length} records</span>
          </div>
          <div className="pp-filters">
            <input
              className="pp-input"
              style={{ width: '200px' }}
              placeholder="🔍 Search teacher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="pp-input pp-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            {(search || filterStatus) && (
              <button className="pp-btn-cancel" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
                onClick={() => { setSearch(''); setFilterStatus(''); }}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="pp-table-wrap">
          {loading ? (
            <div className="pp-loading"><div className="pp-spinner" /><span>Loading records…</span></div>
          ) : (
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Teacher</th><th>Reg No</th><th>Leave Type</th>
                  <th>Start</th><th>End</th><th>Days</th>
                  <th>Applied On</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan="9" className="pp-empty-cell">No leave records found.</td></tr>
                  : filtered.map((r, i) => (
                      <tr key={r.id} className="pp-tr" style={{ '--ri': i }}>
                        <td className="pp-bold">{r.teacher_name}</td>
                        <td className="pp-mono pp-muted">{r.reg_no}</td>
                        <td><span className="pp-chip pp-chip-surface">{r.leave_type}</span></td>
                        <td className="pp-mono">{r.start_date}</td>
                        <td className="pp-mono">{r.end_date}</td>
                        <td className="pp-num pp-indigo">{r.duration}d</td>
                        <td className="pp-mono pp-muted">{r.applied_on}</td>
                        <td><StatusChip status={r.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="pp-btn-ghost" onClick={() => openModal('view', r)} title="View">👁️</button>
                            {r.status === 'Pending' && (
                              <>
                                <button className="pp-btn-ghost" style={{ color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.3)' }}
                                  onClick={() => openModal('approve', r)} title="Approve">✅</button>
                                <button className="pp-btn-ghost" style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}
                                  onClick={() => openModal('reject', r)} title="Reject">❌</button>
                              </>
                            )}
                            {r.status === 'Approved' && (
                              <button className="pp-btn-ghost" style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}
                                onClick={() => openModal('reject', r)} title="Revoke">↩️</button>
                            )}
                            <button className="pp-btn-ghost" style={{ color: '#fca5a5' }}
                              onClick={() => handleDelete(r.id)} title="Delete">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ═══════════ MODALS ═══════════ */}
      {showModal && activeLeave && (
        <div className="pp-overlay" onClick={closeModal}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>

            {/* VIEW */}
            {modalType === 'view' && (
              <>
                <div className="pp-modal-header">
                  <div className="pp-modal-title"><span>📋</span> Leave Application Details</div>
                  <button className="pp-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-statement">
                    <div className="pp-statement-section">
                      <h6>Teacher</h6>
                      {[
                        ['Name',           activeLeave.teacher_name],
                        ['Registration',   activeLeave.reg_no],
                        ['Grade Assigned', activeLeave.grade],
                      ].map(([l, v]) => (
                        <div key={l} className="pp-statement-row"><span>{l}</span><strong>{v}</strong></div>
                      ))}
                    </div>
                    <div className="pp-statement-section">
                      <h6>Leave Details</h6>
                      {[
                        ['Type',       activeLeave.leave_type],
                        ['Start Date', activeLeave.start_date],
                        ['End Date',   activeLeave.end_date],
                        ['Duration',   `${activeLeave.duration} day(s)`],
                        ['Applied On', activeLeave.applied_on],
                      ].map(([l, v]) => (
                        <div key={l} className="pp-statement-row"><span>{l}</span><strong>{v}</strong></div>
                      ))}
                    </div>
                    {activeLeave.reason && (
                      <div className="pp-statement-section">
                        <h6>Reason</h6>
                        <p style={{ fontSize: '0.875rem', color: 'var(--pp-text-muted)', margin: 0 }}>{activeLeave.reason}</p>
                      </div>
                    )}
                    <div className="pp-statement-section">
                      <h6>Review</h6>
                      {[
                        ['Status',      <StatusChip key="s" status={activeLeave.status} />],
                        ['Reviewed By', activeLeave.reviewed_by || '—'],
                        ['Reviewed On', activeLeave.reviewed_on || '—'],
                        ['Admin Note',  activeLeave.admin_note  || '—'],
                      ].map(([l, v]) => (
                        <div key={l} className="pp-statement-row"><span>{l}</span><strong>{v}</strong></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pp-modal-footer">
                  {activeLeave.status === 'Pending' && (
                    <>
                      <button className="pp-btn-success" onClick={() => { closeModal(); setTimeout(() => openModal('approve', activeLeave), 50); }}>Approve</button>
                      <button className="pp-btn-danger"  onClick={() => { closeModal(); setTimeout(() => openModal('reject',  activeLeave), 50); }}>Reject</button>
                    </>
                  )}
                  <button className="pp-btn-cancel" onClick={closeModal}>Close</button>
                </div>
              </>
            )}

            {/* APPROVE */}
            {modalType === 'approve' && (
              <>
                <div className="pp-modal-header success">
                  <div className="pp-modal-title"><span>✅</span> Approve Leave</div>
                  <button className="pp-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-info-box" style={{ marginBottom: '1.25rem' }}>
                    Approving leave for <strong>{activeLeave.teacher_name}</strong> —
                    {activeLeave.leave_type} ({activeLeave.duration} day(s)) from{' '}
                    {activeLeave.start_date} to {activeLeave.end_date}.
                  </div>
                  <div className="pp-form-group">
                    <label className="pp-label">Admin Note (optional)</label>
                    <textarea className="pp-input pp-textarea" rows={3} placeholder="Any notes for the teacher…"
                      value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                  </div>
                </div>
                <div className="pp-modal-footer">
                  <button className="pp-btn-cancel" onClick={closeModal}>Cancel</button>
                  <button className="pp-btn-success" onClick={() => handleStatusChange('Approved')} disabled={submitting}>
                    {submitting ? '⏳ Processing…' : '✅ Confirm Approval'}
                  </button>
                </div>
              </>
            )}

            {/* REJECT */}
            {modalType === 'reject' && (
              <>
                <div className="pp-modal-header danger">
                  <div className="pp-modal-title"><span>❌</span> Reject Leave</div>
                  <button className="pp-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-warn-box" style={{ marginBottom: '1.25rem' }}>
                    Rejecting leave for <strong>{activeLeave.teacher_name}</strong> —
                    {activeLeave.leave_type} ({activeLeave.duration} day(s)).
                  </div>
                  <div className="pp-form-group">
                    <label className="pp-label">Reason for Rejection <span className="pp-req">*</span></label>
                    <textarea className="pp-input pp-textarea" rows={3} placeholder="Explain why the leave is being rejected…"
                      value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                  </div>
                </div>
                <div className="pp-modal-footer">
                  <button className="pp-btn-cancel" onClick={closeModal}>Cancel</button>
                  <button className="pp-btn-danger" onClick={() => handleStatusChange('Rejected')} disabled={submitting}>
                    {submitting ? '⏳ Processing…' : '❌ Confirm Rejection'}
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