import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Fees.css';

export default function StudentPortalFees() {
  const { showMessage } = useMessage();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const TERMS = ['Term 1', 'Term 2', 'Term 3'];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`student-portal/fees/?term=${selectedTerm}`);
        setData(res.data);
      } catch { showMessage({ type: 'error', text: 'Failed to load fee records.' }); }
      finally { setLoading(false); }
    })();
  }, [selectedTerm]);

  if (loading) return (
    <div className="sp-page d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" className="sp-spinner" />
    </div>
  );

  const { expected_fee = 0, total_paid = 0, balance = 0, history = [] } = data || {};
  const paidPct   = expected_fee > 0 ? Math.min(100, Math.round((total_paid / expected_fee) * 100)) : 0;
  const isCleared = balance <= 0;

  return (
    <div className="sp-page">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h2 className="sp-title">Fee Records</h2>
          <p className="sp-subtitle">Track your school fee payments</p>
        </div>
        <div>
          <label className="sp-label">Term</label>
          <select className="sp-select" style={{ width: 150 }} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Summary row */}
      <div className="d-flex flex-wrap gap-3 mb-4">

        {/* Donut + summary */}
        <div className="sp-card sp-card-accent" style={{ flex: '1 1 300px', padding: '1.5rem' }}>
          <div className="d-flex align-items-center gap-4">
            <div className="fee-donut" style={{ '--pct': paidPct }}>
              <div className="fee-donut-label">
                {paidPct}%
                <span className="fee-donut-sub">Paid</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="mb-3">
                <div className="sp-label">Expected Fee</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--sp-text)' }}>
                  KES {Number(expected_fee).toLocaleString()}
                </div>
              </div>
              <div className="mb-3">
                <div className="sp-label">Total Paid</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4ade80' }}>
                  KES {Number(total_paid).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="sp-label">Balance</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }} className={isCleared ? 'fee-balance-zero' : 'fee-balance-positive'}>
                  {isCleared ? '✓ Cleared' : `KES ${Number(balance).toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="sp-progress-track" style={{ height: 8 }}>
              <div className="sp-progress-fill sp-progress-green" style={{ width: `${paidPct}%` }} />
            </div>
          </div>
        </div>

        {/* 3 mini stat cards */}
        <div style={{ flex: '1 1 200px' }} className="d-flex flex-column gap-3">
          {[
            { label:'Expected',  value:`KES ${Number(expected_fee).toLocaleString()}`, accent:'#6366f1', icon:'📌' },
            { label:'Paid',      value:`KES ${Number(total_paid).toLocaleString()}`,   accent:'#22c55e', icon:'✅' },
            { label:'Balance',   value: isCleared ? 'Cleared' : `KES ${Number(balance).toLocaleString()}`, accent: isCleared ? '#22c55e' : '#ef4444', icon: isCleared ? '🎉' : '⚠️' },
          ].map((s, i) => (
            <div key={i} className="sp-stat" style={{ '--stat-accent': s.accent, '--delay': `${i * 0.07}s` }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="sp-stat-label">{s.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: s.accent }}>{s.value}</div>
                </div>
                <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Payment history */}
      <div className="sp-card">
        <div className="sp-card-header">
          <span className="sp-card-header-title">Payment History</span>
          <span className="sp-mono">{history.length} records</span>
        </div>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Term</th>
                <th className="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4 sp-muted">No payment records for {selectedTerm}.</td></tr>
              ) : history.map((f, i) => (
                <tr key={f.id}>
                  <td className="sp-mono">{i + 1}</td>
                  <td className="sp-mono">{new Date(f.date).toLocaleDateString()}</td>
                  <td><span className="sp-pill sp-pill-accent">{f.term}</span></td>
                  <td className="text-end sp-bold" style={{ color: '#4ade80' }}>KES {Number(f.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}