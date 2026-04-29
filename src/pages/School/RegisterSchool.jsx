import React, { useState, useRef } from 'react';
import axios from 'axios';
import './RegisterSchool.css';

/* ─── Public API (no auth needed for registration) ──────────── */
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const publicApi = axios.create({ baseURL: API_URL });

/* ── Reusable field (defined outside to prevent focus loss) ── */
const Field = ({ id, label, name, type = 'text', placeholder, icon, as = 'input', form, handleChange, errors, logoRef, logoFile }) => {
  const isLogo = name === 'logo_path';

  return (
    <div className={`rs-field ${errors[name] ? 'rs-field--err' : ''}`}>
      <label className="rs-label" htmlFor={id}>
        {icon && <span className="rs-label-icon">{icon}</span>}
        {label}
      </label>
      {isLogo ? (
        <div className="rs-file-input-wrapper">
          <button 
            type="button" 
            className="rs-btn-file-trigger"
            onClick={() => logoRef.current?.click()}
          >
            {logoFile ? `📎 ${logoFile.name}` : '📷 Select Logo...'}
          </button>
        </div>
      ) : as === 'textarea'
        ? <textarea id={id} name={name} className="rs-input" rows={3}
            placeholder={placeholder} value={form[name]} onChange={handleChange} />
        : <input id={id} name={name} type={type} className="rs-input"
            placeholder={placeholder} value={form[name]} onChange={handleChange}
            autoComplete={name === 'password' ? 'new-password' : 'off'} />
      }
      {errors[name] && <span className="rs-err-msg">{errors[name]}</span>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   RegisterSchool  →  POST /api/school/register/
   Now supports multipart/form-data for Logo upload
   ═══════════════════════════════════════════════════════════════ */
export default function RegisterSchool({ isModal = false }) {
  const INIT = {
    school_name: '',
    po_box: '',
    address: '',
    contact: '',
    email_address: '',
    motto: '',
    vision: '',
    username: '',
    password: '',
    confirmPassword: '',
    plan_name: 'Starter',
    billing_cycle: 'Monthly',
  };

  const [form, setForm]       = useState(INIT);
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState(null);   // null | 'loading' | 'success' | 'error'
  const [apiMsg, setApiMsg]   = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Logo state
  const logoRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  /* ── Handlers ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setStatus(null);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs = {};
    if (!form.school_name.trim())     errs.school_name    = 'School name is required';
    if (!form.po_box.trim())          errs.po_box         = 'P.O. Box is required';
    if (!form.address.trim())         errs.address        = 'Address is required';
    if (!form.contact.trim())         errs.contact        = 'Contact is required';
    if (!form.email_address.trim())   errs.email_address  = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email_address)) errs.email_address = 'Invalid email address';
    if (!form.username.trim())        errs.username       = 'Admin username is required';
    if (!form.password)               errs.password       = 'Password is required';
    else if (form.password.length < 8) errs.password      = 'Minimum 8 characters';
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match';
    if (!form.plan_name)              errs.plan_name      = 'Please select a plan';
    if (!form.billing_cycle)          errs.billing_cycle   = 'Please select a billing cycle';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setStatus('loading');
    
    // Use FormData for file upload
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k !== 'confirmPassword') fd.append(k, v);
    });
    if (logoFile) fd.append('logo_path', logoFile);

    try {
      const res = await publicApi.post('/api/school/register/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setApiMsg(res.data.message || `School registered! Admin username: ${res.data.admin_username}`);
      setStatus('success');
      setForm(INIT);
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const fieldErrs = {};
        Object.entries(data).forEach(([k, v]) => {
          fieldErrs[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setErrors(fieldErrs);
        setApiMsg('Please fix the highlighted fields and try again.');
      } else {
        setApiMsg('Registration failed. Please try again.');
      }
      setStatus('error');
    }
  };

  return (
    <div className={isModal ? "rs-root-modal" : "rs-root"}>
      {!isModal && (
        <>
          <div className="rs-blob rs-blob-1" />
          <div className="rs-blob rs-blob-2" />
          <header className="rs-page-header">
            <div className="rs-page-icon">🏫</div>
            <div>
              <h1 className="rs-page-title">Register a School</h1>
              <p className="rs-page-sub">Create a new school account and its admin user in one step.</p>
            </div>
          </header>
        </>
      )}

      <form className={isModal ? "rs-form-modal" : "rs-card"} onSubmit={handleSubmit} noValidate>

        {/* Success banner */}
        {status === 'success' && (
          <div className="rs-banner rs-banner--ok">
            <span className="rs-banner-icon">✅</span>
            <div>
              <p className="rs-banner-title">Registration Successful!</p>
              <p className="rs-banner-body">{apiMsg}</p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {status === 'error' && apiMsg && (
          <div className="rs-banner rs-banner--err">
            <span className="rs-banner-icon">⚠️</span>
            <p className="rs-banner-body">{apiMsg}</p>
          </div>
        )}

        {/* ── Section: School Info ── */}
        <fieldset className="rs-fieldset">
          <legend className="rs-legend">🏫 School Information</legend>
          
          {/* Logo Upload Section */}
          <div className="rs-logo-section">
            <div 
              className="rs-logo-wrap" 
              onClick={() => logoRef.current?.click()}
              title="Click to upload school logo"
            >
              {logoPreview 
                ? <img src={logoPreview} alt="Logo preview" className="rs-logo-img" />
                : <div className="rs-logo-placeholder"><span>📷</span></div>
              }
              <div className="rs-logo-overlay">Change Logo</div>
              <input 
                ref={logoRef} 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleLogoChange} 
              />
            </div>
            <div className="rs-logo-meta">
              <span className="rs-logo-label">School Logo</span>
              <p className="rs-logo-sub">Recommended: Square PNG or JPG</p>
            </div>
          </div>

          <div className="rs-grid-2">
            <Field id="rs-school-name" label="School Name"      name="school_name"   placeholder="e.g. Greenfield Academy"  icon="🏷️" form={form} handleChange={handleChange} errors={errors} />
            <Field id="rs-logo-path"   label="Logo Path"        name="logo_path"     placeholder="Select school logo"       icon="🖼️" form={form} handleChange={handleChange} errors={errors} logoRef={logoRef} logoFile={logoFile} />
            <Field id="rs-po-box"      label="P.O. Box"         name="po_box"        placeholder="e.g. 1234-00100"          icon="📬" form={form} handleChange={handleChange} errors={errors} />
            <Field id="rs-address"     label="Address"          name="address"       placeholder="Town / County"             icon="📍" form={form} handleChange={handleChange} errors={errors} />
            <Field id="rs-contact"     label="Contact"          name="contact"       placeholder="+254 700 000 000"          icon="📞" form={form} handleChange={handleChange} errors={errors} />
            <Field id="rs-email"       label="Email Address"    name="email_address" placeholder="admin@school.ac.ke"        icon="✉️" type="email" form={form} handleChange={handleChange} errors={errors} />
            <Field id="rs-motto"       label="Motto (optional)" name="motto"         placeholder="e.g. Strive for Excellence" icon="✨" form={form} handleChange={handleChange} errors={errors} />
          </div>
          <Field id="rs-vision" label="Vision (optional)" name="vision"
                 as="textarea" placeholder="Describe the school's long-term vision…" icon="🎯" form={form} handleChange={handleChange} errors={errors} />
        </fieldset>

        {/* ── Section: Pricing Plan ── */}
        <fieldset className="rs-fieldset">
          <legend className="rs-legend">💳 Pricing Plan (7 Days Free Trial)</legend>
          
          <div className="rs-billing-toggle">
            <span className={`rs-toggle-lbl ${form.billing_cycle === 'Monthly' ? 'active' : ''}`}>Monthly</span>
            <div 
              className={`rs-toggle-track ${form.billing_cycle === 'Annual' ? 'annual' : ''}`}
              onClick={() => setForm(f => ({ ...f, billing_cycle: f.billing_cycle === 'Monthly' ? 'Annual' : 'Monthly' }))}
            >
              <div className="rs-toggle-thumb" />
            </div>
            <span className={`rs-toggle-lbl ${form.billing_cycle === 'Annual' ? 'active' : ''}`}>Annual (Save 20%)</span>
          </div>

          <div className="rs-pricing-grid">
            {[
              { id: 'Starter',    icon: '🌱', priceM: '3,500', priceA: '2,800', desc: 'Up to 300 students' },
              { id: 'Growth',     icon: '🚀', priceM: '7,500', priceA: '6,000', desc: 'Up to 1,000 students' },
              { id: 'Enterprise', icon: '🏢', priceM: '14,000', priceA: '11,200', desc: 'Unlimited students' },
            ].map(plan => (
              <div 
                key={plan.id}
                className={`rs-plan-card ${form.plan_name === plan.id ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, plan_name: plan.id }))}
              >
                <div className="rs-plan-check">{form.plan_name === plan.id ? '✅' : '○'}</div>
                <div className="rs-plan-icon">{plan.icon}</div>
                <div className="rs-plan-name">{plan.id}</div>
                <div className="rs-plan-price">
                  <span className="rs-plan-curr">KES</span>
                  <span className="rs-plan-amt">{form.billing_cycle === 'Monthly' ? plan.priceM : plan.priceA}</span>
                  <span className="rs-plan-period">/mo</span>
                </div>
                <div className="rs-plan-desc">{plan.desc}</div>
              </div>
            ))}
          </div>
          <p className="rs-pricing-note">💡 Your 7-day free trial begins immediately after approval.</p>
        </fieldset>

        {/* ── Section: Admin Account ── */}
        <fieldset className="rs-fieldset">
          <legend className="rs-legend">👤 Admin Account</legend>
          <div className="rs-grid-2">
            <Field id="rs-username" label="Admin Username" name="username"
                   placeholder="Choose a unique username" icon="👤" form={form} handleChange={handleChange} errors={errors} />

            {/* Password with show/hide */}
            <div className={`rs-field ${errors.password ? 'rs-field--err' : ''}`}>
              <label className="rs-label" htmlFor="rs-password">
                <span className="rs-label-icon">🔒</span> Password
              </label>
              <div className="rs-pwd-wrap">
                <input id="rs-password" name="password"
                  type={showPwd ? 'text' : 'password'}
                  className="rs-input rs-input-pwd"
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={handleChange}
                  autoComplete="new-password"
                />
                <button type="button" id="rs-toggle-pwd" className="rs-pwd-toggle"
                  onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="rs-err-msg">{errors.password}</span>}
            </div>

            <div className={`rs-field ${errors.confirmPassword ? 'rs-field--err' : ''}`}>
              <label className="rs-label" htmlFor="rs-confirm-pwd">
                <span className="rs-label-icon">🔒</span> Confirm Password
              </label>
              <input id="rs-confirm-pwd" name="confirmPassword"
                type={showPwd ? 'text' : 'password'}
                className="rs-input"
                placeholder="Repeat your password"
                value={form.confirmPassword} onChange={handleChange}
              />
              {errors.confirmPassword && <span className="rs-err-msg">{errors.confirmPassword}</span>}
            </div>
          </div>
        </fieldset>

        {/* Submit */}
        <div className="rs-submit-row">
          <button id="rs-submit-btn" type="submit" className="rs-btn-primary"
            disabled={status === 'loading'}>
            {status === 'loading'
              ? <><span className="rs-spinner" /> Registering…</>
              : <><span>🚀</span> Register School</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
