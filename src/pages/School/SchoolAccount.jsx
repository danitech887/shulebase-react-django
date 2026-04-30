import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SchoolAccount.css';

/* ─── Authenticated API instance ────────────────────────────── */
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const authApi = axios.create({ baseURL: BASE });
authApi.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

/* ── Reusable row (defined outside to prevent focus loss) ── */
const InfoRow = ({ label, name, value, as = 'input', icon, editMode, form, handleChange, errors, logoRef, logoFile }) => {
  const isLogo = name === 'logo_path';

  return (
    <div className={`sa-field ${errors[name] ? 'sa-field--err' : ''}`}>
      <label className="sa-label" htmlFor={`sa-${name}`}>
        {icon && <span className="sa-label-icon"></span>}
        {label}
      </label>
      {editMode
        ? (isLogo ? (
            <div className="sa-file-input-wrapper">
              <button 
                type="button" 
                className="sa-btn-file-trigger"
                onClick={() => logoRef.current?.click()}
              >
                {logoFile ? `📎 ${logoFile.name}` : '📷 Select Image...'}
              </button>
            </div>
          ) : as === 'textarea'
            ? <textarea id={`sa-${name}`} name={name} className="sa-input" rows={3}
                value={form[name] ?? ''} onChange={handleChange} />
            : <input    id={`sa-${name}`} name={name} className="sa-input"
                value={form[name] ?? ''} onChange={handleChange} />
          )
        : <div className="sa-readonly">
            {isLogo ? (value ? value.split('/').pop() : <em style={{ opacity: 0.35 }}>—</em>) : (value || <em style={{ opacity: 0.35 }}>—</em>)}
          </div>
      }
      {errors[name] && <span className="sa-err-msg">{errors[name]}</span>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SchoolAccount  →  GET + PATCH /api/school/update/
   ═══════════════════════════════════════════════════════════════ */
export default function SchoolAccount() {
  const EDITABLE = ['school_name', 'po_box', 'address', 'contact', 'email_address', 'motto', 'vision'];

  const [school, setSchool]       = useState(null);
  const [form, setForm]           = useState({});
  const [editMode, setEditMode]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [status, setStatus]       = useState(null);  // null | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [errors, setErrors]       = useState({});
  const logoRef                   = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile]   = useState(null);

  /* ── Fetch school on mount ── */
  useEffect(() => {
    authApi.get('/api/school/update/')
      .then(res => {
        setSchool(res.data);
        setForm(res.data);
        setLoading(false);
      })
      .catch(err => {
        setStatusMsg(
          err.response?.status === 401
            ? 'Session expired — please log in again.'
            : 'Failed to load school profile.'
        );
        setStatus('error');
        setLoading(false);
      });
  }, []);

  /* ── Field change ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  /* ── Logo change ── */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  /* ── Save → PATCH ── */
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    setStatusMsg('');

    const fd = new FormData();
    EDITABLE.forEach(k => { if (form[k] !== undefined) fd.append(k, form[k] ?? ''); });
    if (logoFile) fd.append('logo_path', logoFile);

    try {
      const res = await authApi.patch('/api/school/update/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSchool(res.data);
      setForm(res.data);
      setEditMode(false);
      setLogoPreview(null);
      setLogoFile(null);
      setStatusMsg('Profile updated successfully!');
      setStatus('success');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const fieldErrs = {};
        Object.entries(data).forEach(([k, v]) => {
          fieldErrs[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setErrors(fieldErrs);
        setStatusMsg('Fix the highlighted fields and try again.');
      } else {
        setStatusMsg('Save failed. Please try again.');
      }
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Cancel edit ── */
  const cancelEdit = () => {
    setForm(school);
    setErrors({});
    setLogoPreview(null);
    setLogoFile(null);
    setEditMode(false);
    setStatus(null);
    setStatusMsg('');
  };

  /* ── Status colours ── */
  const statusColor = { Approved: '#059669', Pending: '#d97706', Rejected: '#dc2626' };

  /* ── Loading state ── */
  if (loading) return (
    <div className="sa-root">
      <div className="sa-orb sa-orb-1" />
      <div className="sa-orb sa-orb-2" />
      <div className="sa-card sa-card--center">
        <div className="sa-big-spinner" />
        <p className="sa-loading-label">Loading school profile…</p>
      </div>
    </div>
  );

  /* ── Fatal error ── */
  if (!school) return (
    <div className="sa-root">
      <div className="sa-card">
        <div className="sa-alert sa-alert--err">⚠️ {statusMsg}</div>
      </div>
    </div>
  );

  const logoSrc = logoPreview || (school.logo_path ? `${BASE}${school.logo_path}` : null);

  return (
    <div className="sa-root">
      <div className="sa-orb sa-orb-1" />
      <div className="sa-orb sa-orb-2" />

      {/* Page header */}
      <header className="sa-page-header">
        <div className="sa-page-icon">⚙️</div>
        <div>
          <h1 className="sa-page-title">School Account</h1>
          <p className="sa-page-sub">View and manage your school's profile details.</p>
        </div>
      </header>

      <form className="sa-card" onSubmit={handleSave} noValidate>

        {/* ── Profile header ── */}
        <div className="sa-profile-header">
          {/* Logo */}
          <div
            className={`sa-logo-wrap ${editMode ? 'sa-logo-wrap--editable' : ''}`}
            onClick={() => editMode && logoRef.current?.click()}
          >
            {logoSrc
              ? <img src={logoSrc} alt="School logo" className="sa-logo-img" />
              : <div className="sa-logo-placeholder"></div>
            }
            {editMode && (
              <div className="sa-logo-overlay"><span>Change</span></div>
            )}
            <input ref={logoRef} id="sa-logo-input" type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleLogoChange} />
          </div>

          {/* Meta */}
          <div className="sa-meta">
            <h2 className="sa-school-name">{school.school_name}</h2>
            <span className="sa-status-pill"
              style={{ '--sp-color': statusColor[school.status] || '#6b7280' }}>
              {school.status}
            </span>
            <p className="sa-registered-on">
              Registered on&nbsp;
              {new Date(school.created_at).toLocaleDateString('en-KE', { dateStyle: 'long' })}
           
            </p>
          </div>

          {!editMode && (
            <button id="sa-edit-btn" type="button" className="sa-btn-outline"
              onClick={() => setEditMode(true)}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {/* ── School details ── */}
        <fieldset className="sa-fieldset">
          <legend className="sa-legend">🏫 School Details</legend>
          <div className="sa-grid-2">
            <InfoRow label="School Name"   name="school_name"   value={school.school_name}    editMode={editMode} form={form} handleChange={handleChange} errors={errors} />
            <InfoRow label="Logo Path"     name="logo_path"     value={school.logo_path || '—'}  editMode={editMode} form={form} handleChange={handleChange} errors={errors} logoRef={logoRef} logoFile={logoFile} />
            <InfoRow label="P.O. Box"      name="po_box"        value={school.po_box}        editMode={editMode} form={form} handleChange={handleChange} errors={errors} />
            <InfoRow label="Address"       name="address"       value={school.address}        editMode={editMode} form={form} handleChange={handleChange} errors={errors} />
            <InfoRow label="Contact"       name="contact"       value={school.contact}        editMode={editMode} form={form} handleChange={handleChange} errors={errors} />
            <InfoRow label="Email"         name="email_address" value={school.email_address}  editMode={editMode} form={form} handleChange={handleChange} errors={errors} />
            <InfoRow label="Motto"         name="motto"         value={school.motto}          editMode={editMode} form={form} handleChange={handleChange} errors={errors} />
          </div>
          <InfoRow label="Vision" name="vision" value={school.vision} as="textarea"  editMode={editMode} form={form} handleChange={handleChange} errors={errors} />
        </fieldset>

        {/* Feedback */}
        {statusMsg && (
          <div className={`sa-alert ${status === 'success' ? 'sa-alert--ok' : 'sa-alert--err'}`}>
            {status === 'success' ? '✅' : '⚠️'} {statusMsg}
          </div>
        )}

        {/* Action buttons */}
        {editMode && (
          <div className="sa-btn-row">
            <button id="sa-cancel-btn" type="button" className="sa-btn-ghost" onClick={cancelEdit}>
              Cancel
            </button>
            <button id="sa-save-btn" type="submit" className="sa-btn-primary" disabled={saving}>
              {saving
                ? <><span className="sa-spinner" /> Saving…</>
                : <><span>💾</span> Save Changes</>
              }
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
