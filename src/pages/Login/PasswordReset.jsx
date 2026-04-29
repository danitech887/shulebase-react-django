import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import students from '../../api/api';
import './Login.css';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const uid = searchParams.get('uid');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await students.post('auth/password-reset/', { email });
      setMessage(response.data.message);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await students.post('auth/password-reset-confirm/', {
        uid,
        token,
        new_password: password
      });
      setMessage('Password reset successful. You can now login.');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired link.');
    } finally {
      setLoading(false);
    }
  };

  const isConfirmMode = !!(token && uid);

  return (
    <div className="login-page">
      {/* Ambient blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-right" style={{ 
        margin: 'auto', 
        borderLeft: '1px solid var(--lg-border)', 
        borderRadius: 'var(--lg-radius)',
        flex: '0 0 440px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        
        {/* Animated Logo Stage */}
        <div className="login-logo-wrap">
          <div className="login-logo-stage">
            <div className="ll-ring ll-ring-outer" />
            <div className="ll-ring ll-ring-mid" />
            <div className="ll-glow-disc" />
            <img
              src="/assets/images/logo.png"
              alt="ShuleBase"
              className="ll-img"
            />
          </div>
        </div>

        <h2 className="login-form-title" style={{ textAlign: 'center' }}>
          {isConfirmMode ? 'Set New Password' : 'Forgot Password?'}
        </h2>
        <p className="login-form-sub" style={{ textAlign: 'center' }}>
          {isConfirmMode 
            ? 'Your identity is verified. Choose a strong new password.' 
            : "Enter your email and we'll send you a recovery link."}
        </p>

        {/* Error message */}
        {error && (
          <div className="login-error">
            <span className="login-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {message && (
          <div className="login-error" style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            borderColor: 'rgba(16, 185, 129, 0.3)', 
            color: '#34d399' 
          }}>
            <span className="login-error-icon">✅</span>
            <span>{message}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={isConfirmMode ? handleConfirmReset : handleRequestReset} noValidate>
            {!isConfirmMode ? (
              <div className="login-field-group">
                <label className="login-label">Email Address</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">✉️</span>
                  <input
                    className="login-input"
                    type="email"
                    placeholder="name@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="login-field-group">
                  <label className="login-label">New Password</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">🔒</span>
                    <input
                      className="login-input"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="login-field-group">
                  <label className="login-label">Confirm New Password</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">🔒</span>
                    <input
                      className="login-input"
                      type="password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
              style={{ marginTop: '1.5rem' }}
            >
              {loading ? (
                <><Spinner as="span" size="sm" animation="border" className="me-2" />Processing...</>
              ) : (
                isConfirmMode ? 'Update Password' : 'Send Recovery Link'
              )}
            </button>
          </form>
        )}

        <div className="login-footer-note" style={{ marginTop: '2rem' }}>
          <Link 
            to="/login" 
            style={{ 
              color: 'var(--lg-accent)', 
              textDecoration: 'none', 
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
