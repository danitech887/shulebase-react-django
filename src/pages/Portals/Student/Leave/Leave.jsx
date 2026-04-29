import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Leave.css';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export default function StudentPortalLeave() {
  const { showMessage } = useMessage();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [form, setForm] = useState({ date_of_leave: '', reason: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`student-portal/leave/?term=${selectedTerm}`);
      setData(res.data);
    } catch { showMessage({ type: 'error', text: 'Failed to load leave records.' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date_of_leave || !form.reason) return showMessage({ type: 'warning', text: 'Please fill all fields.' });
    try {
      setSaving(true);
      await api.post('student-portal/leave/', form);
      showMessage({ type: 'success', text: 'Leave application submitted successfully.' });
      setForm({ date_of_leave: '', reason: '' });
      setShowForm(false);
      fetchData();
    } catch { showMessage({ type: 'error', text: 'Failed to submit leave application.' }); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="sp-page d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" className="sp-spinner" />
    </div>
  );

  const { history = [], stats = {} } = data || {};

  const pillClass = (s) => {
    if (s === 'Approved') return 'sp-pill-green';
    if (s === 'Rejected') return 'sp-pill-red';
    return 'sp-pill-yellow';
  };

  return (
    <div className="sp-page">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h2 className="sp-title">Leave Management</h2>
          <p className="sp-subtitle">Track your leave applications and history</p>
        </div>
        <div className="d-flex gap-2 align-items-end flex-wrap">
          <div>
            <label className="sp-label">Term</label>
            <select className="sp-select" style={{ width: 150 }} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
              {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="d-flex flex-wrap gap-3 mb-4">
        {[
          { label: 'Approved', value: stats.approved || 0, accent: '#22c55e', icon: '✅', pill: 'sp-pill-green' },
          { label: 'Pending',  value: stats.pending  || 0, accent: '#f59e0b', icon: '⏳', pill: 'sp-pill-yellow' },
          { label: 'Rejected', value: stats.rejected || 0, accent: '#ef4444', icon: '❌', pill: 'sp-pill-red' },
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

      {/* History table */}
      <div className="sp-card">
        <div className="sp-card-header">
          <span className="sp-card-header-title">Leave History</span>
          <span className="sp-mono">{history.length} applications</span>
        </div>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr><th>#</th><th>Date</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4 sp-muted">No leave applications for {selectedTerm}.</td></tr>
              ) : history.map((r, i) => (
                <tr key={r.id}>
                  <td className="sp-mono">{i + 1}</td>
                  <td className="sp-mono">{r.date}</td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={r.reason}>{r.reason || '—'}</td>
                  <td><span className={`sp-pill ${pillClass(r.status)}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}