import React, { useState, useEffect } from 'react';
import '../Portal/Portal.css';
import { ChildSwitcher } from '../Dashboard/Dashboard';
import api from '../../../../api/api';

export default function ParentPortalLeave() {
  const [animate, setAnimate]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [children, setChildren]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [showModal, setShowModal]       = useState(false);
  const [modalType, setModalType]       = useState('');
  const [viewLeave, setViewLeave]       = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting]         = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    reason: 'fees', otherReason: '', startDate: '', endDate: '',
  });

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
      setSelected(dash.data.selected_child || null);

      const res = await api.get('parent-portal/leave/', { params: { registration_no: studentId || dash.data.selected_child?.registration_no } });
      setLeaveRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectChild = (child) => { setSelected(child); fetchAll(child.registration_no); };

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 4000); };

  const handleOpenModal = (type, leave = null) => { setModalType(type); setViewLeave(leave); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setModalType(''); setViewLeave(null); };

  const handleApplyLeave = async () => {
    if (!leaveForm.startDate) { alert('Please provide a start date'); return; }
    try {
      setSubmitting(true);
      
      // Update payload to use field names expected by ParentPortalLeaveAPIView and LeaveManagement model
      const payload = {
        reason: leaveForm.reason === 'fees' ? 'School Fees' : 'Other',
        other_reason: leaveForm.otherReason,
        date_of_leave: leaveForm.startDate,
        return_date: leaveForm.endDate || null,
      };

      await api.post('parent-portal/leave/', payload, {
        params: { student_id: selected?.registration_no }
      });

      showSuccess('Leave application submitted successfully!');
      setLeaveForm({ reason: 'fees', otherReason: '', startDate: '', endDate: '' });
      handleCloseModal();
      fetchAll(selected?.registration_no);
    } catch (err) {
      let msg = 'Failed to apply leave.';
      if (err.response?.data) {
        msg = typeof err.response.data === 'object' 
          ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${v}`).join('\n')
          : err.response.data.error || msg;
      }
      alert(msg);
    } finally { setSubmitting(false); }
  };

  const getStatusChip = (status) => {
    const map = {
      approved: { cls: 'pp-chip-green', label: '✅ Approved' },
      pending:  { cls: 'pp-chip-amber', label: '⏳ Pending'  },
      rejected: { cls: 'pp-chip-red',   label: '❌ Rejected' },
    };
    const s = map[status] || { cls: 'pp-chip-surface', label: status };
    return <span className={`pp-chip ${s.cls}`}>{s.label}</span>;
  };

  const totalLeaves    = leaveRecords.length;
  const approvedLeaves = leaveRecords.filter(l => l.status === 'approved').length;
  const pendingLeaves  = leaveRecords.filter(l => l.status === 'pending').length;

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
          <div className="pp-header-icon">📋</div>
          <div>
            <h1 className="pp-title">Leave Applications</h1>
            <p className="pp-subtitle">Apply and track leave requests for your child</p>
          </div>
        </div>
        <div className="pp-header-actions">
          <ChildSwitcher children={children} selected={selected} onSelect={handleSelectChild} />
          <button className="pp-btn-primary" onClick={() => handleOpenModal('apply')}>
            <span>+</span> Apply Leave
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="pp-stats-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pp-stat pp-skeleton" style={{ '--delay': `${i * 0.08}s` }}>
                <div className="sk-line sk-short" /><div className="sk-line sk-long" />
              </div>
            ))
          : [
              { label: 'Total Leaves',  value: totalLeaves,    icon: '📋', accent: '#6366f1', trend: 'good', trendLabel: 'All time' },
              { label: 'Approved',      value: approvedLeaves, icon: '✅', accent: '#10b981', trend: 'good', trendLabel: `${totalLeaves > 0 ? ((approvedLeaves/totalLeaves)*100).toFixed(0) : 0}% rate` },
              { label: 'Pending',       value: pendingLeaves,  icon: '⏳', accent: '#d97706', trend: pendingLeaves > 0 ? 'warn' : 'good', trendLabel: pendingLeaves > 0 ? 'Awaiting' : 'None' },
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

      {/* Records table */}
      <div className="pp-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="pp-card-header">
          <div>
            <span className="pp-card-title">Leave History</span>
            <span className="pp-card-sub">{selected ? `${selected.first_name} ${selected.surname}` : '—'}</span>
          </div>
          <span className="pp-card-badge">📋</span>
        </div>
        <div className="pp-table-wrap">
          {loading ? (
            <div className="pp-loading"><div className="pp-spinner" /><span>Loading…</span></div>
          ) : (
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Start Date</th><th>End Date</th><th>Reason</th>
                  <th>Duration</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRecords.length === 0
                  ? <tr><td colSpan="6" className="pp-empty-cell">No leave records found for this child.</td></tr>
                  : leaveRecords.map((l, i) => (
                      <tr key={l.id} className="pp-tr" style={{ '--ri': i }}>
                        <td className="pp-mono">{l.startDate}</td>
                        <td className="pp-mono">{l.endDate || '—'}</td>
                        <td>
                          <span className="pp-chip pp-chip-surface">
                            {l.reason === 'School Fees' ? '💰' : '📝'} {l.reason === 'Other' ? l.otherReason : l.reason}
                          </span>
                        </td>
                        <td className="pp-num pp-muted">{l.duration ? `${l.duration}d` : '—'}</td>
                        <td>{getStatusChip(l.status)}</td>
                        <td>
                          <button className="pp-btn-ghost" onClick={() => handleOpenModal('view', l)}>View</button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {showModal && (
        <div className="pp-overlay" onClick={handleCloseModal}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>

            {/* Apply Leave */}
            {modalType === 'apply' && (
              <>
                <div className="pp-modal-header">
                  <div className="pp-modal-title"><span>📋</span> Apply for Leave</div>
                  <button className="pp-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  {selected && (
                    <div className="pp-info-box" style={{ marginBottom: '1.25rem' }}>
                      📌 Applying for <strong>{selected.first_name} {selected.surname}</strong> — {selected.grade}
                    </div>
                  )}
                  <div className="pp-form-grid">
                    <div className="pp-form-group pp-span-2">
                      <label className="pp-label">Reason for Leave <span className="pp-req">*</span></label>
                      <select className="pp-input" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}>
                        <option value="fees">School Fees</option>
                        <option value="other">Other Reason</option>
                      </select>
                    </div>
                    {leaveForm.reason === 'other' && (
                      <div className="pp-form-group pp-span-2">
                        <label className="pp-label">Specify Reason <span className="pp-req">*</span></label>
                        <input className="pp-input" placeholder="Describe the reason..." value={leaveForm.otherReason} onChange={e => setLeaveForm({ ...leaveForm, otherReason: e.target.value })} />
                      </div>
                    )}
                    <div className="pp-form-group">
                      <label className="pp-label">Start Date <span className="pp-req">*</span></label>
                      <input className="pp-input" type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
                    </div>
                    <div className="pp-form-group">
                      <label className="pp-label">Expected Return Date</label>
                      <input className="pp-input" type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="pp-modal-footer">
                  <button className="pp-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="pp-btn-save" onClick={handleApplyLeave} disabled={submitting}>
                    {submitting ? '⏳ Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </>
            )}

            {/* View Leave Statement */}
            {modalType === 'view' && viewLeave && (
              <>
                <div className="pp-modal-header">
                  <div className="pp-modal-title"><span>📋</span> Leave Statement</div>
                  <button className="pp-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-statement">
                    <div className="pp-statement-section">
                      <h6>Leave Details</h6>
                      {[
                        ['Reason',     viewLeave.reason === 'Other' ? viewLeave.otherReason : viewLeave.reason],
                        ['Start Date', viewLeave.startDate],
                        ['End Date',   viewLeave.endDate || 'Not set'],
                        ['Duration',   viewLeave.duration ? `${viewLeave.duration} days` : '—'],
                      ].map(([l, v]) => (
                        <div key={l} className="pp-statement-row"><span>{l}</span><strong>{v}</strong></div>
                      ))}
                    </div>
                    <div className="pp-statement-section">
                      <h6>Status</h6>
                      <div className="pp-statement-row">
                        <span>Current Status</span>
                        <strong>{getStatusChip(viewLeave.status)}</strong>
                      </div>
                      {viewLeave.status !== 'pending' && viewLeave.approvedBy && (
                        <div className="pp-statement-row">
                          <span>Processed By</span>
                          <strong>{viewLeave.approvedBy}</strong>
                        </div>
                      )}
                      {viewLeave.status === 'rejected' && (
                        <div className="pp-statement-row">
                          <span>Reason</span>
                          <strong style={{ color: 'var(--pp-red)' }}>Contact school for details</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pp-modal-footer">
                  <button className="pp-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}