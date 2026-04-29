import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../../api/api';
import './ImportStudents.css';

const STEPS = ['Upload Excel', 'Configure & Preview', 'Confirm Import'];

export default function ImportStudents() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const rootRef = useRef(null);

  // Parse result
  const [parsed, setParsed] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');

  // Config
  const [regFormat, setRegFormat] = useState('');
  const [priority, setPriority] = useState('senior_first');
  const [startNumber, setStartNumber] = useState(1);

  // Results
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (rootRef.current) rootRef.current.classList.add('im-ready');
  }, []);

  // Fetch existing reg config on mount
  useEffect(() => {
    api.get('/students/config-reg-no/')
      .then(r => { if (r.data.current_format) setRegFormat(r.data.current_format); })
      .catch(() => {});
  }, []);

  /* ────────── Step 1: Upload ────────── */
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) {
      setAlert({ type: 'error', msg: 'Only .xlsx / .xls files are supported.' });
      return;
    }
    setLoading(true);
    setAlert(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/students/import/parse/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParsed(data);
      setStudents(data.students || []);
      if (data.reg_format) setRegFormat(data.reg_format);
      setStep(1);
      if (data.missing_required?.length) {
        setAlert({ type: 'warning', msg: `Missing columns (will need manual fill): ${data.missing_required.join(', ')}` });
      }
    } catch (e) {
      setAlert({ type: 'error', msg: e.response?.data?.error || 'Failed to parse file.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  /* ────────── Step 2: Edit row ────────── */
  const updateCell = (idx, field, value) => {
    setStudents(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const removeRow = idx => setStudents(prev => prev.filter((_, i) => i !== idx));

  /* ────────── Step 3: Confirm ────────── */
  const handleImport = async () => {
    if (!regFormat.trim()) {
      setAlert({ type: 'error', msg: 'Please configure a registration number format before importing.' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const { data } = await api.post('/students/import/confirm/', {
        students,
        reg_format: regFormat,
        priority,
        start_number: startNumber,
      });
      setResult(data);
      setStep(3);
    } catch (e) {
      setAlert({ type: 'error', msg: e.response?.data?.error || 'Import failed.' });
    } finally {
      setLoading(false);
    }
  };

  const regPreview = `${regFormat}${String(startNumber).padStart(3, '0')}`;
  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.first_name || '').toLowerCase().includes(q) ||
      (s.surname || '').toLowerCase().includes(q) ||
      (s.grade || '').toLowerCase().includes(q) ||
      (s.registration_no || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="im-root" ref={rootRef}>
      <div className="im-blob im-blob-1" />
      <div className="im-blob im-blob-2" />

      {/* Header */}
      <div className="im-header">
        <div className="im-header-left">
          <div className="im-header-icon">📥</div>
          <div>
            <h1 className="im-title">Import Students</h1>
            <p className="im-subtitle">Bulk import student data from an Excel spreadsheet</p>
          </div>
        </div>
        {step > 0 && step < 3 && (
          <button className="im-btn im-btn-outline" onClick={() => { setStep(0); setParsed(null); setStudents([]); setResult(null); setAlert(null); }}>
            ↩ Start Over
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="im-stepper">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className={`im-step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`}>
              <span className="im-step-num">{step > i ? '✓' : i + 1}</span>
              {label}
            </div>
            {i < STEPS.length - 1 && <div className="im-step-line" />}
          </React.Fragment>
        ))}
      </div>

      {/* Alert */}
      {alert && (
        <div className={`im-alert im-alert-${alert.type}`}>
          <span>{alert.msg}</span>
          <button className="im-alert-close" onClick={() => setAlert(null)}>✕</button>
        </div>
      )}

      {loading && (
        <div className="im-loading"><div className="im-spinner" /><span>Processing…</span></div>
      )}

      {/* ═══════ STEP 0 ═══════ */}
      {!loading && step === 0 && (
        <div className="im-card" style={{ animationDelay: '0.15s' }}>
          <div className="im-card-header">
            <span className="im-card-title">📄 Upload Spreadsheet</span>
            <span className="im-card-sub">Supports .xlsx and .xls</span>
          </div>
          <div className="im-card-body">
            <div
              className={`im-upload-zone ${dragOver ? 'im-drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="im-upload-icon">📁</div>
              <div className="im-upload-title">Drag & drop your Excel file here</div>
              <div className="im-upload-hint">or click to browse — max recommended 500 rows</div>
              <button className="im-upload-btn" type="button">Select File</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="im-upload-input" onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ STEP 1 ═══════ */}
      {!loading && step === 1 && parsed && (
        <>
          {/* Column Detection */}
          <div className="im-card" style={{ animationDelay: '0.1s' }}>
            <div className="im-card-header">
              <span className="im-card-title">🔍 Column Detection</span>
              <span className="im-card-sub">{parsed.file_name}</span>
            </div>
            <div className="im-card-body">
              <div className="im-col-badges">
                {parsed.detected_columns.map(c => (
                  <span key={c} className="im-col-badge im-col-detected">✓ {c.replace(/_/g, ' ')}</span>
                ))}
                {parsed.missing_required?.map(c => (
                  <span key={c} className="im-col-badge im-col-missing">⚠ {c.replace(/_/g, ' ')}</span>
                ))}
                {!parsed.detected_columns.includes('registration_no') && (
                  <span className="im-col-badge im-col-auto">⚙ registration no (auto-generated)</span>
                )}
              </div>
            </div>
          </div>

          {/* Registration Config */}
          <div className="im-card" style={{ animationDelay: '0.2s' }}>
            <div className="im-card-header">
              <span className="im-card-title">⚙️ Registration Number Configuration</span>
            </div>
            <div className="im-card-body">
              <div className="im-config-grid">
                <div className="im-form-group">
                  <label className="im-label">Registration Format / Prefix</label>
                  <input className="im-input" value={regFormat} onChange={e => setRegFormat(e.target.value)} placeholder="e.g. SCH-2026-" />
                  <span className="im-help">This prefix is prepended to each sequential number</span>
                </div>
                <div className="im-form-group">
                  <label className="im-label">Assignment Priority</label>
                  <select className="im-select" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="senior_first">Senior Grade First (Grade 9 → PP1)</option>
                    <option value="as_is">As-Is (Excel order)</option>
                  </select>
                  <span className="im-help">Senior grades get lower (earlier) registration numbers</span>
                </div>
                <div className="im-form-group">
                  <label className="im-label">Start Number</label>
                  <input className="im-input" type="number" min="1" value={startNumber} onChange={e => setStartNumber(parseInt(e.target.value) || 1)} />
                  <span className="im-help">Sequence starts from this number</span>
                </div>
                <div className="im-form-group">
                  <label className="im-label">Preview</label>
                  <div className="im-preview-tag">{regPreview || 'Set format above'}</div>
                  <span className="im-help">First registration number will look like this</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="im-stats">
            <div className="im-stat" style={{ '--acc': 'var(--im-accent)' }}>
              <div className="im-stat-icon">👥</div>
              <div><div className="im-stat-label">Total Rows</div><div className="im-stat-value">{students.length}</div></div>
            </div>
            <div className="im-stat" style={{ '--acc': 'var(--im-green)' }}>
              <div className="im-stat-icon">📋</div>
              <div><div className="im-stat-label">Detected Columns</div><div className="im-stat-value">{parsed.detected_columns.length}</div></div>
            </div>
            <div className="im-stat" style={{ '--acc': 'var(--im-amber)' }}>
              <div className="im-stat-icon">⚠️</div>
              <div><div className="im-stat-label">Missing Columns</div><div className="im-stat-value">{parsed.missing_required?.length || 0}</div></div>
            </div>
            <div className="im-stat" style={{ '--acc': 'var(--im-cyan)' }}>
              <div className="im-stat-icon">🏫</div>
              <div><div className="im-stat-label">Unique Grades</div><div className="im-stat-value">{new Set(students.map(s => s.grade).filter(Boolean)).size}</div></div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="im-card" style={{ animationDelay: '0.3s' }}>
            <div className="im-filter-bar">
              <input className="im-search" placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} />
              <span style={{ fontSize: '0.78rem', color: 'var(--im-text-muted)' }}>
                Showing {filtered.length} of {students.length} • Click cells to edit
              </span>
            </div>
            <div className="im-table-wrap">
              <table className="im-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Reg No</th>
                    <th>First Name</th>
                    <th>Second Name</th>
                    <th>Surname</th>
                    <th>Gender</th>
                    <th>DOB</th>
                    <th>Grade</th>
                    <th>Stream</th>
                    <th>Phone</th>
                    <th>Parent</th>
                    <th>Address</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => {
                    const realIdx = students.indexOf(s);
                    return (
                      <tr key={i}>
                        <td className="im-row-num">{s._row || i + 1}</td>
                        <td>
                          {s.registration_no
                            ? <span className="im-reg-badge">{s.registration_no}</span>
                            : <span style={{ color: 'var(--im-text-dim)', fontSize: '0.72rem' }}>auto</span>}
                        </td>
                        <td><input className="im-cell-edit" value={s.first_name || ''} onChange={e => updateCell(realIdx, 'first_name', e.target.value)} /></td>
                        <td><input className="im-cell-edit" value={s.second_name || ''} onChange={e => updateCell(realIdx, 'second_name', e.target.value)} /></td>
                        <td><input className="im-cell-edit" value={s.surname || ''} onChange={e => updateCell(realIdx, 'surname', e.target.value)} /></td>
                        <td>
                          <select className="im-cell-edit" value={s.gender || ''} onChange={e => updateCell(realIdx, 'gender', e.target.value)}>
                            <option value="">-</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </td>
                        <td><input className="im-cell-edit" type="date" value={s.date_of_birth || ''} onChange={e => updateCell(realIdx, 'date_of_birth', e.target.value)} /></td>
                        <td><input className="im-cell-edit" value={s.grade || ''} onChange={e => updateCell(realIdx, 'grade', e.target.value)} style={{ width: 60 }} /></td>
                        <td><input className="im-cell-edit" value={s.stream || ''} onChange={e => updateCell(realIdx, 'stream', e.target.value)} style={{ width: 50 }} /></td>
                        <td><input className="im-cell-edit" value={s.phone || ''} onChange={e => updateCell(realIdx, 'phone', e.target.value)} style={{ width: 110 }} /></td>
                        <td><input className="im-cell-edit" value={s.parent_name || ''} onChange={e => updateCell(realIdx, 'parent_name', e.target.value)} /></td>
                        <td><input className="im-cell-edit" value={s.address || ''} onChange={e => updateCell(realIdx, 'address', e.target.value)} /></td>
                        <td><button className="im-row-del" title="Remove row" onClick={() => removeRow(realIdx)}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action bar */}
          <div className="im-action-bar">
            <div className="im-action-left">
              <button className="im-btn im-btn-outline" onClick={() => { setStep(0); setParsed(null); setStudents([]); setAlert(null); }}>
                ← Back
              </button>
            </div>
            <button className="im-btn im-btn-success" disabled={!students.length || !regFormat.trim()} onClick={() => setStep(2)}>
              Review & Confirm →
            </button>
          </div>
        </>
      )}

      {/* ═══════ STEP 2: Confirm ═══════ */}
      {!loading && step === 2 && (
        <>
          <div className="im-card" style={{ animationDelay: '0.1s' }}>
            <div className="im-card-header">
              <span className="im-card-title">✅ Confirm Import</span>
            </div>
            <div className="im-card-body">
              <div className="im-config-grid">
                <div className="im-form-group">
                  <span className="im-label">Students to import</span>
                  <span className="im-stat-value">{students.length}</span>
                </div>
                <div className="im-form-group">
                  <span className="im-label">Registration Format</span>
                  <span className="im-preview-tag">{regFormat}</span>
                </div>
                <div className="im-form-group">
                  <span className="im-label">Priority</span>
                  <span style={{ color: 'var(--im-text)' }}>{priority === 'senior_first' ? 'Senior Grade First' : 'As-Is (Excel order)'}</span>
                </div>
                <div className="im-form-group">
                  <span className="im-label">Starting Number</span>
                  <span className="im-preview-tag">{regPreview}</span>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--im-amber-soft)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.85rem', color: '#fcd34d' }}>
                ⚠️ This action will create <strong>{students.length}</strong> student records and their corresponding student & parent user accounts. This cannot be easily undone.
              </div>
            </div>
          </div>
          <div className="im-action-bar">
            <button className="im-btn im-btn-outline" onClick={() => setStep(1)}>← Back to Edit</button>
            <button className="im-btn im-btn-success" onClick={handleImport}>
              🚀 Import {students.length} Students
            </button>
          </div>
        </>
      )}

      {/* ═══════ STEP 3: Results ═══════ */}
      {!loading && step === 3 && result && (
        <>
          <div className="im-card" style={{ animationDelay: '0.1s' }}>
            <div className="im-card-header">
              <span className="im-card-title">📊 Import Results</span>
            </div>
            <div className="im-card-body">
              <div className="im-results-grid">
                <div className="im-result-box im-result-success" style={{ textAlign: 'center' }}>
                  <div className="im-result-icon">✅</div>
                  <div className="im-result-num" style={{ color: 'var(--im-green)' }}>{result.created}</div>
                  <div className="im-result-label">Students Imported Successfully</div>
                </div>
                <div className="im-result-box im-result-error" style={{ textAlign: 'center' }}>
                  <div className="im-result-icon">⚠️</div>
                  <div className="im-result-num" style={{ color: 'var(--im-red)' }}>{result.errors_count}</div>
                  <div className="im-result-label">Rows Skipped (Errors)</div>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="im-error-list">
                  <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Error Details</h4>
                  {result.errors.map((err, i) => (
                    <div className="im-error-item" key={i}>
                      <span className="im-error-row">Row {err.row}</span>
                      <span>{err.name}</span>
                      <span style={{ color: '#f87171' }}>{err.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.students?.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Created Students</h4>
                  <div className="im-table-wrap" style={{ maxHeight: 250 }}>
                    <table className="im-table">
                      <thead>
                        <tr><th>Reg No</th><th>Name</th><th>Grade</th><th>Stream</th></tr>
                      </thead>
                      <tbody>
                        {result.students.map((s, i) => (
                          <tr key={i}>
                            <td><span className="im-reg-badge">{s.registration_no}</span></td>
                            <td>{s.name}</td>
                            <td><span className="im-grade-tag">{s.grade}</span></td>
                            <td><span className="im-stream-tag">{s.stream}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="im-action-bar">
            <button className="im-btn im-btn-outline" onClick={() => { setStep(0); setParsed(null); setStudents([]); setResult(null); setAlert(null); }}>
              📥 Import More
            </button>
            <button className="im-btn im-btn-primary" onClick={() => window.location.href = '/students/register'}>
              → View Students
            </button>
          </div>
        </>
      )}
    </div>
  );
}
