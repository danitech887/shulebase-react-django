import React, { useState, useEffect, useContext } from 'react';
import { Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Login.css';

const FEATURES = [
  { icon: '📊', text: 'Real-time attendance & analytics'   },
  { icon: '💳', text: 'Seamless fee management'            },
  { icon: '📚', text: 'CBC academic progress tracking'     },
  { icon: '📋', text: 'Leave & communication portal'       },
];

export default function Login({ isModal = false }) {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, loading: authLoading, error: authError, setError } = useContext(AuthContext);

  const [formData, setFormData]         = useState({ username: '', password: '' });
  const [loading, setLoading]           = useState(false);
  const [localError, setLocalError]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleRedirect = (userData) => {
    // We navigate to /dashboard, and DashboardHub in AppRoutes handles role-based rendering
    navigate('/dashboard');
  };

  useEffect(() => {
    if (isAuthenticated && user) handleRoleRedirect(user);
  }, [isAuthenticated, user, navigate]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
    if (setError) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!formData.username || !formData.password) {
      setLocalError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    const loggedInUser = await login(formData.username, formData.password);
    if (loggedInUser) {
      handleRoleRedirect(loggedInUser);
    } else {
      setLocalError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  };

  const errorMsg = localError || authError;

  return (
    <div className={isModal ? "login-root-modal" : "login-page"}>

      {!isModal && (
        <>
          {/* Ambient blobs */}
          <div className="login-blob login-blob-1" />
          <div className="login-blob login-blob-2" />

          {/* ════════ LEFT PANEL ════════ */}
          <div className="login-left">
            <div className="login-left-content">

              {/* Animated rings illustration */}
              <div className="login-illustration">
                <div className="login-ring login-ring-1" />
                <div className="login-ring login-ring-2" />
                <div className="login-ring login-ring-3" />
                <div className="login-center-icon">🏫</div>
                <div className="login-orbit-chip"><span className="chip-dot" /> Students</div>
                <div className="login-orbit-chip"><span className="chip-dot" /> Teachers</div>
                <div className="login-orbit-chip"><span className="chip-dot" /> Reports</div>
                <div className="login-orbit-chip"><span className="chip-dot" /> Analytics</div>
              </div>

              <h1 className="login-hero-title">
                One Portal.<br />
                <span>Every Stakeholder.</span>
              </h1>
              <p className="login-hero-sub">
                A unified school management platform connecting administrators,
                teachers, students and parents — all in one secure place.
              </p>

              <div className="login-features">
                {FEATURES.map((f, i) => (
                  <div key={i} className="login-feature-item" style={{ '--fi-delay': `${0.3 + i * 0.08}s` }}>
                    <div className="login-feature-icon">{f.icon}</div>
                    <span className="login-feature-text">{f.text}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Vertical divider */}
          <div className="login-divider" />
        </>
      )}

      {/* ════════ RIGHT PANEL ════════ */}
      <div className={isModal ? "login-modal-content" : "login-right"}>
        {isModal && <div className="login-modal-divider" />}

        {/* ── Animated Logo (image only, no tagline) ── */}
        {!isModal && (
          <div className="login-logo-wrap">
            <div className="login-logo-stage">

              {/* Outermost sweeping ring */}
              <div className="ll-ring ll-ring-outer" />

              {/* Mid ring (reverse) */}
              <div className="ll-ring ll-ring-mid" />

              {/* Inner glow disc */}
              <div className="ll-glow-disc" />

              {/* Orbiting accent dots */}
              <span className="ll-dot ll-dot-1" />
              <span className="ll-dot ll-dot-2" />
              <span className="ll-dot ll-dot-3" />

              {/* Radar sweep */}
              <div className="ll-radar" />

              {/* The logo itself */}
              <img
                src="/assets/images/logo.png"
                alt="ShuleBase"
                className="ll-img"
              />
            </div>
          </div>
        )}

        {/* Heading */}
        <h2 className="login-form-title">Welcome back</h2>
        <p className="login-form-sub">Sign in to access your portal</p>

        {/* Error */}
        {errorMsg && (
          <div className="login-error">
            <span className="login-error-icon">⚠️</span>
            <span>{errorMsg}</span>
            <button
              className="login-error-close"
              onClick={() => { setLocalError(''); if (setError) setError(null); }}
            >✕</button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field-group" style={{ '--fi-delay': '0.3s' }}>
            <label className="login-label" htmlFor="username">Username</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">👤</span>
              <input
                id="username"
                className="login-input"
                type="text"
                name="username"
                autoComplete="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="login-field-group" style={{ '--fi-delay': '0.37s' }}>
            <label className="login-label" htmlFor="password">Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                id="password"
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type="button"
                className="login-pw-toggle"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading || authLoading}
          >
            {loading || authLoading
              ? <><Spinner as="span" size="sm" animation="border" className="me-2" />Signing in…</>
              : 'Sign In'
            }
          </button>
        </form>

        <p className="login-footer-note">
          Secure login · <span>All sessions are encrypted</span> · v1.0.0
        </p>

      </div>
    </div>
  );
}