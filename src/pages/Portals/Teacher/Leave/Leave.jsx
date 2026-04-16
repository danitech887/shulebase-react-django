import React, { useState, useEffect } from 'react';
import '../../../Portals/Parent/Portal/Portal.css';
import api from '../../../../api/api';

/* ─────────────────────────────────────────────────────────────
   STATUS CHIP
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

const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Compassionate', 'Unpaid', 'Other'];

export default function TeacherLeavePortal() {
  const [animate, setAnimate]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [records, setRecords]           = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage,   setErrorMessage]   = useState('');

  // Modal
  const [showModal,  setShowModal]  = useState(false);
  const [modalType,  setModalType]  = useState('');    // 'apply' | 'view' | 'cancel'
  const [activeLeave, setActiveLeave] = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  // Apply form
  const [form, setForm] = useState({
    leave_type: 'Annual',
    reason:     '',
    start_date: '',
    end_date:   '',
  });

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('teachers/leave/');
      setRecords(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 4000); };
  const showError   = (msg) => { setErrorMessage(msg);   setTimeout(() => setErrorMessage(''),   5000); };

  const openModal  = (type, leave = null) => { setModalType(type); setActiveLeave(leave); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setModalType(''); setActiveLeave(null); };

  /* ── compute duration preview ── */
  const previewDays = (() => {
    if (!form.start_date || !form.end_date) return 0;
    const diff = (new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24) + 1;
    return diff > 0 ? diff : 0;
  })();

  /* ── submit leave application ── */
  const handleApply = async () => {
    if (!form.start_date || !form.end_date) {
      showError('Please provide both start and end dates.'); return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      showError('End date cannot be before start date.'); return;
    }
    try {
      setSubmitting(true);
      await api.post('teachers/leave/', form);
      showSuccess('Leave application submitted successfully!');
      setForm({ leave_type: 'Annual', reason: '', start_date: '', end_date: '' });
      closeModal();
      fetchLeaves();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── cancel own leave ── */
  const handleCancel = async () => {
    if (!activeLeave) return;
    try {
      setSubmitting(true);
      await api.put(`teachers/leave/${activeLeave.id}/`, { status: 'Cancelled' });
      showSuccess('Leave cancelled.');
      closeModal();
      fetchLeaves();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to cancel leave.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── stats from records ── */
  const total     = records.length;
  const pending   = records.filter(r => r.status === 'Pending').length;
  const approved  = records.filter(r => r.status === 'Approved').length;
  const totalDays = records.filter(r => r.status === 'Approved').reduce((s, r) => s + (r.duration || 0), 0);

  const statCards = [
    { label: 'Total Requests', value: total,     icon: '📋', accent: '#6366f1', trend: 'good', trendLabel: 'All time'   },
    { label: 'Pending',        value: pending,   icon: '⏳', accent: '#d97706', trend: pending > 0 ? 'warn' : 'good', trendLabel: pending > 0 ? 'Awaiting' : 'Clear' },
    { label: 'Approved',       value: approved,  icon: '✅', accent: '#10b981', trend: 'good', trendLabel: 'Granted'    },
    { label: 'Days Approved',  value: totalDays, icon: '📅', accent: '#0891b2', trend: 'good', trendLabel: 'Total days' },
  ];

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
          <div className="pp-header-icon">🏖️</div>
          <div>
            <h1 className="pp-title">My Leave Applications</h1>
            <p className="pp-subtitle">Apply for leave and track your application status</p>
          </div>
        </div>
        <div className="pp-header-actions">
          <button className="pp-btn-primary" onClick={() => openModal('apply')}>
            <span>+</span> Apply for Leave
          </button>
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

      {/* Records table */}
      <div className="pp-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="pp-card-header">
          <div>
            <span className="pp-card-title">Leave History</span>
            <span className="pp-card-sub">{records.length} applications</span>
          </div>
          <span className="pp-card-badge">🏖️</span>
        </div>

        <div className="pp-table-wrap">
          {loading ? (
            <div className="pp-loading"><div className="pp-spinner" /><span>Loading…</span></div>
          ) : (
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Leave Type</th><th>Start Date</th><th>End Date</th>
                  <th>Days</th><th>Applied On</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0
                  ? <tr><td colSpan="7" className="pp-empty-cell">No leave applications yet. Click "Apply for Leave" to get started.</td></tr>
                  : records.map((r, i) => (
                      <tr key={r.id} className="pp-tr" style={{ '--ri': i }}>
                        <td><span className="pp-chip pp-chip-surface">{r.leave_type}</span></td>
                        <td className="pp-mono">{r.start_date}</td>
                        <td className="pp-mono">{r.end_date}</td>
                        <td className="pp-num pp-indigo">{r.duration}d</td>
                        <td className="pp-mono pp-muted">{r.applied_on}</td>
                        <td><StatusChip status={r.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="pp-btn-ghost" onClick={() => openModal('view', r)} title="View details">👁️</button>
                            {r.status === 'Pending' && (
                              <button className="pp-btn-ghost" style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}
                                onClick={() => openModal('cancel', r)} title="Cancel">🚫</button>
                            )}
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
      {showModal && (
        <div className="pp-overlay" onClick={closeModal}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>

            {/* APPLY */}
            {modalType === 'apply' && (
              <>
                <div className="pp-modal-header">
                  <div className="pp-modal-title"><span>🏖️</span> Apply for Leave</div>
                  <button className="pp-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-form-grid">
                    <div className="pp-form-group pp-span-2">
                      <label className="pp-label">Leave Type <span className="pp-req">*</span></label>
                      <select className="pp-input" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                        {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="pp-form-group">
                      <label className="pp-label">Start Date <span className="pp-req">*</span></label>
                      <input className="pp-input" type="date" value={form.start_date}
                        onChange={e => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div className="pp-form-group">
                      <label className="pp-label">End Date <span className="pp-req">*</span></label>
                      <input className="pp-input" type="date" value={form.end_date}
                        onChange={e => setForm({ ...form, end_date: e.target.value })} />
                    </div>
                    {previewDays > 0 && (
                      <div className="pp-span-2">
                        <div className="pp-info-box">
                          📅 Duration: <strong>{previewDays} day(s)</strong>
                        </div>
                      </div>
                    )}
                    <div className="pp-form-group pp-span-2">
                      <label className="pp-label">Reason / Notes</label>
                      <textarea className="pp-input pp-textarea" rows={3}
                        placeholder="Briefly describe the reason for leave…"
                        value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="pp-modal-footer">
                  <button className="pp-btn-cancel" onClick={closeModal}>Cancel</button>
                  <button className="pp-btn-save" onClick={handleApply} disabled={submitting}>
                    {submitting ? '⏳ Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </>
            )}

            {/* VIEW */}
            {modalType === 'view' && activeLeave && (
              <>
                <div className="pp-modal-header">
                  <div className="pp-modal-title"><span>📋</span> Leave Details</div>
                  <button className="pp-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-statement">
                    <div className="pp-statement-section">
                      <h6>Application</h6>
                      {[
                        ['Leave Type',  activeLeave.leave_type],
                        ['Start Date',  activeLeave.start_date],
                        ['End Date',    activeLeave.end_date],
                        ['Duration',    `${activeLeave.duration} day(s)`],
                        ['Applied On',  activeLeave.applied_on],
                      ].map(([l, v]) => (
                        <div key={l} className="pp-statement-row"><span>{l}</span><strong>{v}</strong></div>
                      ))}
                    </div>
                    {activeLeave.reason && (
                      <div className="pp-statement-section">
                        <h6>Your Reason</h6>
                        <p style={{ fontSize: '0.875rem', color: 'var(--pp-text-muted)', margin: 0 }}>{activeLeave.reason}</p>
                      </div>
                    )}
                    <div className="pp-statement-section">
                      <h6>Review</h6>
                      <div className="pp-statement-row">
                        <span>Status</span>
                        <strong><StatusChip status={activeLeave.status} /></strong>
                      </div>
                      {activeLeave.reviewed_by && (
                        <div className="pp-statement-row"><span>Reviewed By</span><strong>{activeLeave.reviewed_by}</strong></div>
                      )}
                      {activeLeave.reviewed_on && (
                        <div className="pp-statement-row"><span>Reviewed On</span><strong>{activeLeave.reviewed_on}</strong></div>
                      )}
                      {activeLeave.admin_note && (
                        <div className="pp-statement-row"><span>Admin Note</span><strong>{activeLeave.admin_note}</strong></div>
                      )}
                    </div>
                  </div>

                  {activeLeave.status === 'Rejected' && activeLeave.admin_note && (
                    <div style={{ marginTop: '1rem' }}
                      className="pp-warn-box">
                      ⚠️ Rejection reason: {activeLeave.admin_note}
                    </div>
                  )}
                </div>
                <div className="pp-modal-footer">
                  {activeLeave.status === 'Pending' && (
                    <button className="pp-btn-danger"
                      onClick={() => { closeModal(); setTimeout(() => openModal('cancel', activeLeave), 50); }}>
                      Cancel Leave
                    </button>
                  )}
                  <button className="pp-btn-cancel" onClick={closeModal}>Close</button>
                </div>
              </>
            )}

            {/* CANCEL CONFIRM */}
            {modalType === 'cancel' && activeLeave && (
              <>
                <div className="pp-modal-header danger">
                  <div className="pp-modal-title"><span>🚫</span> Cancel Leave Application</div>
                  <button className="pp-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-warn-box">
                    Are you sure you want to cancel your <strong>{activeLeave.leave_type}</strong> leave
                    request ({activeLeave.start_date} → {activeLeave.end_date})?
                    This action cannot be undone.
                  </div>
                </div>
                <div className="pp-modal-footer">
                  <button className="pp-btn-cancel" onClick={closeModal}>Go Back</button>
                  <button className="pp-btn-danger" onClick={handleCancel} disabled={submitting}>
                    {submitting ? '⏳ Cancelling…' : '🚫 Confirm Cancel'}
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