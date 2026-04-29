import React, { useState, useEffect } from 'react';
import '../Portal/Portal.css';
import { ChildSwitcher } from '../Dashboard/Dashboard';
import api from '../../../../api/api';

export default function ParentPortalFees() {
  const [animate, setAnimate]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [children, setChildren]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [confirmed, setConfirmed] = useState([]);
  const [pending, setPending]     = useState([]);
  const [summary, setSummary]     = useState({});
  const [expectedFee, setExpectedFee] = useState(0);
  const [activeTab, setActiveTab] = useState('confirmed');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [viewRecord, setViewRecord]         = useState(null);

  const [payForm, setPayForm] = useState({
    amount: '', mode: 'mpesa', transaction_code: '', term: 'Term 1', date_of_payment: '',
  });

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchAll();
  }, []);

  const fetchAll = async (studentId = null) => {
    try {
      setLoading(true);
      // Fetch children list from dashboard
      const dash = await api.get('parent-portal/dashboard/', { params: studentId ? { student_id: studentId } : {} });
      setChildren(dash.data.children || []);
      setSelected(dash.data.selected_child || null);

      const { data } = await api.get('parent-portal/fees/', { params: studentId ? { student_id: studentId } : {} });
      setConfirmed(data.confirmed || []);
      setPending(data.pending || []);
      setSummary(data.summary || {});
      setExpectedFee(data.expected_fee || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectChild = (child) => {
    setSelected(child);
    fetchAll(child.registration_no);
  };

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 4000); };

  const handleOpenModal = (type, record = null) => {
    setModalType(type);
    setViewRecord(record);
    if (type === 'edit' && record) {
      setPayForm({
        amount: record.amount || '',
        mode: record.mode_of_payment === 'M-Pesa' ? 'mpesa' : 'bank transfer',
        transaction_code: record.transaction_code || '',
        term: record.term || 'Term 1',
        date_of_payment: record.date_of_payment || '',
      });
    } else if (type === 'pay') {
      setPayForm({ amount: '', mode: 'mpesa', transaction_code: '', term: 'Term 1', date_of_payment: '' });
    }
    setShowModal(true);
  };
  const handleCloseModal = () => { setShowModal(false); setModalType(''); setViewRecord(null); };

  const handlePaySubmit = async () => {
    if (!payForm.amount || !payForm.transaction_code) {
      alert('Please fill in all required fields'); return;
    }
    try {
      setSubmitting(true);
      
      const payload = {
        amount: payForm.amount,
        mode_of_payment: payForm.mode === 'mpesa' ? 'M-Pesa' : 'Bank Transfer',
        transaction_code: payForm.transaction_code,
        term: payForm.term,
        date_of_payment: payForm.date_of_payment || new Date().toISOString().split('T')[0],
      };

      if (modalType === 'edit' && viewRecord) {
        payload.id = viewRecord.id;
        await api.put('parent-portal/fees/', payload, {
          params: { student_id: selected?.registration_no }
        });
        showSuccess('Payment updated and submitted for review!');
      } else {
        await api.post('parent-portal/fees/', payload, {
          params: { student_id: selected?.registration_no }
        });
        showSuccess('Payment reported! It will appear once confirmed by the school.');
      }
      setPayForm({ amount: '', mode: 'mpesa', transaction_code: '', term: 'Term 1', date_of_payment: '' });
      handleCloseModal();
      fetchAll(selected?.registration_no);
    } catch (err) {
      let msg = 'Failed to submit payment';
      if (err.response?.data) {
        if (err.response.data.error) {
          msg = err.response.data.error;
        } else {
          // Flatten backend object: {"amount":["Invalid"]} => "amount: Invalid"
          msg = Object.entries(err.response.data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
            .join('\n');
        }
      }
      alert(msg);
    } finally { setSubmitting(false); }
  };

  const handleDownloadReceipt = async (feeId) => {
    try {
      const response = await api.get(`fees/${feeId}/receipt/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${feeId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download receipt');
    }
  };

  const totalPaid    = summary.total_paid || 0;
  const pendingTotal = pending.reduce((s, r) => s + Number(r.amount || 0), 0);

  const tabs = [
    { key: 'confirmed', label: 'Confirmed',  icon: '✅' },
    { key: 'pending',   label: 'Pending',     icon: '⏳' },
  ];

  const records = activeTab === 'confirmed' ? confirmed : pending;

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
          <div className="pp-header-icon">💰</div>
          <div>
            <h1 className="pp-title">Fee Payments</h1>
            <p className="pp-subtitle">View payment history and report new payments</p>
          </div>
        </div>
        <div className="pp-header-actions">
          <ChildSwitcher children={children} selected={selected} onSelect={handleSelectChild} />
          <button className="pp-btn-primary" onClick={() => handleOpenModal('pay')}>
            <span>+</span> Report Payment
          </button>
        </div>
      </header>

      {/* Summary stats */}
      <div className="pp-stats-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pp-stat pp-skeleton" style={{ '--delay': `${i * 0.08}s` }}>
                <div className="sk-line sk-short" /><div className="sk-line sk-long" />
              </div>
            ))
          : [
              { label: 'Total Confirmed', value: `Ksh ${totalPaid.toLocaleString()}`, icon: '✅', accent: '#10b981', trend: 'good', trendLabel: `${confirmed.length} payments` },
              { label: 'Pending Review',  value: `Ksh ${pendingTotal.toLocaleString()}`, icon: '⏳', accent: '#d97706', trend: 'warn', trendLabel: `${pending.length} records` },
              { label: 'Last Payment',    value: confirmed[0]?.date_of_payment || '—',  icon: '📅', accent: '#6366f1', trend: 'good', trendLabel: confirmed[0] ? `Ksh ${Number(confirmed[0].amount).toLocaleString()}` : 'None yet' },
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
      
      {/* Fee Completion Banner */}
      {expectedFee > 0 && totalPaid >= expectedFee && (
        <div className="pp-completion-banner" style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#10b981',
          fontWeight: '600',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🎉</span>
          <div>
            <div style={{ fontSize: '1.1rem' }}>Fee Payment Completed!</div>
            <div style={{ fontWeight: 'normal', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
              The school fees for this child have been fully paid. Keep up the great support!
            </div>
          </div>
        </div>
      )}

      {/* Tabs + table */}
      <div className="pp-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`pp-tab ${activeTab === t.key ? 'pp-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <span>{t.icon}</span> {t.label} ({activeTab === t.key ? records.length : (t.key === 'confirmed' ? confirmed.length : pending.length)})
          </button>
        ))}
      </div>

      <div className="pp-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="pp-card-header">
          <div>
            <span className="pp-card-title">{activeTab === 'confirmed' ? 'Confirmed Payments' : 'Pending Payments'}</span>
            <span className="pp-card-sub">{selected ? `${selected.first_name} ${selected.surname}` : 'All children'}</span>
          </div>
          <span className="pp-card-badge">{activeTab === 'confirmed' ? '✅' : '⏳'}</span>
        </div>
        <div className="pp-table-wrap">
          {loading ? (
            <div className="pp-loading"><div className="pp-spinner" /><span>Loading…</span></div>
          ) : (
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Date</th><th>Amount</th><th>Mode</th>
                  <th>Transaction</th><th>Term</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0
                  ? <tr><td colSpan="7" className="pp-empty-cell">No {activeTab} payments yet.</td></tr>
                  : records.map((r, i) => (
                      <tr key={r.id} className="pp-tr" style={{ '--ri': i }}>
                        <td className="pp-mono">{r.date_of_payment}</td>
                        <td className="pp-bold pp-green pp-num">Ksh {Number(r.amount).toLocaleString()}</td>
                        <td>
                          <span className={`pp-chip ${r.mode_of_payment === 'M-Pesa' ? 'pp-chip-indigo' : 'pp-chip-cyan'}`}>
                            {r.mode_of_payment === 'M-Pesa' ? '📱' : '💵'} {r.mode_of_payment}
                          </span>
                        </td>
                        <td className="pp-mono pp-muted">{r.transaction_code || '—'}</td>
                        <td><span className="pp-chip pp-chip-surface">{r.term || '—'}</span></td>
                        <td>
                          <span className={`pp-chip ${activeTab === 'confirmed' ? 'pp-chip-green' : r.status === 'Rejected' ? 'pp-chip-red' : 'pp-chip-amber'}`}>
                            {activeTab === 'confirmed' ? '✅ Confirmed' : r.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <button className="pp-btn-ghost" onClick={() => handleOpenModal('view', r)}>View</button>
                          {r.status === 'Rejected' && (
                            <button className="pp-btn-ghost pp-blue" style={{ color: '#3b82f6' }} onClick={() => handleOpenModal('edit', r)}>Edit</button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
              {records.length > 0 && (
                <tfoot>
                  <tr className="pp-tr-total">
                    <td className="pp-bold">TOTAL</td>
                    <td className="pp-bold pp-green pp-num">
                      Ksh {records.reduce((s, r) => s + Number(r.amount || 0), 0).toLocaleString()}
                    </td>
                    <td colSpan="5" />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {showModal && (
        <div className="pp-overlay" onClick={handleCloseModal}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>

            {/* Report Payment */}
            {(modalType === 'pay' || modalType === 'edit') && (
              <>
                <div className="pp-modal-header">
                  <div className="pp-modal-title"><span>💳</span> {modalType === 'edit' ? 'Edit Payment' : 'Report a Payment'}</div>
                  <button className="pp-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-warn-box" style={{ marginBottom: '1.25rem' }}>
                    ⚠️ Only report payments you have already made via M-Pesa or bank transfer. The school will verify and confirm.
                  </div>
                  <div className="pp-form-grid">
                    <div className="pp-form-group">
                      <label className="pp-label">Amount (Ksh) <span className="pp-req">*</span></label>
                      <input className="pp-input" type="number" placeholder="e.g. 5000" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                    </div>
                    <div className="pp-form-group">
                      <label className="pp-label">Payment Mode <span className="pp-req">*</span></label>
                      <select className="pp-input" value={payForm.mode} onChange={e => setPayForm({ ...payForm, mode: e.target.value })}>
                        <option value="mpesa">M-Pesa</option>
                        <option value="bank transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="pp-form-group">
                      <label className="pp-label">Transaction Code <span className="pp-req">*</span></label>
                      <input className="pp-input" type="text" placeholder="e.g. QGH3K12ABC" value={payForm.transaction_code} onChange={e => setPayForm({ ...payForm, transaction_code: e.target.value })} />
                    </div>
                    <div className="pp-form-group">
                      <label className="pp-label">Term <span className="pp-req">*</span></label>
                      <select className="pp-input" value={payForm.term} onChange={e => setPayForm({ ...payForm, term: e.target.value })}>
                        <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                      </select>
                    </div>
                    <div className="pp-form-group pp-span-2">
                      <label className="pp-label">Date of Payment</label>
                      <input className="pp-input" type="date" value={payForm.date_of_payment} onChange={e => setPayForm({ ...payForm, date_of_payment: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="pp-modal-footer">
                  <button className="pp-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="pp-btn-save" onClick={handlePaySubmit} disabled={submitting}>
                    {submitting ? '⏳ Submitting…' : 'Submit Payment'}
                  </button>
                </div>
              </>
            )}

            {/* View Receipt */}
            {modalType === 'view' && viewRecord && (
              <>
                <div className="pp-modal-header success">
                  <div className="pp-modal-title"><span>🧾</span> Payment Receipt</div>
                  <button className="pp-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-statement">
                    <div className="pp-statement-section">
                      <h6>Payment Details</h6>
                      {[
                        ['Amount',           `Ksh ${Number(viewRecord.amount).toLocaleString()}`],
                        ['Payment Mode',     viewRecord.mode_of_payment],
                        ['Transaction Code', viewRecord.transaction_code || '—'],
                        ['Date',             viewRecord.date_of_payment],
                        ['Term',             viewRecord.term || '—'],
                        ['Status',           viewRecord.status],
                      ].map(([label, val]) => (
                        <div key={label} className="pp-statement-row">
                          <span>{label}</span><strong>{val}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pp-modal-footer">
                  <button className="pp-btn-cancel" onClick={handleCloseModal}>Close</button>
                  {activeTab === 'confirmed' && (
                    <button className="pp-btn-primary" onClick={() => handleDownloadReceipt(viewRecord.id)}>
                      📥 Download Receipt
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}