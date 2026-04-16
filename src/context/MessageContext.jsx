import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import './MessageContext.css';

const ICONS = {
  success: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6.5 11.5L9.5 14.5L15.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 8L14 14M14 8L8 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 3L20 19H2L11 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M11 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="11" cy="16" r="0.8" fill="currentColor"/>
    </svg>
  ),
  info: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 10V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="11" cy="7" r="0.8" fill="currentColor"/>
    </svg>
  ),
};

const TYPE_STYLES = {
  success: { accent: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  error:   { accent: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
  warning: { accent: '#d97706', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.25)' },
  info:    { accent: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)' },
};

// Modal component used by the provider. Supports pause-on-hover and custom duration.
function GlobalMessageModal({ message, onClose }) {
  const { open, type = 'info', text = '', duration = 4000 } = message || {};
  const timerRef = useRef(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { if (!hoverRef.current) onClose?.(); }, duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [open, text, duration, onClose]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && open) onClose?.(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const styles = TYPE_STYLES[type] || TYPE_STYLES.info;

  return (
    <div className={`gmm-root ${open ? 'gmm-open' : ''}`} role="alert" aria-live="polite">
      <div
        className="gmm-toast"
        style={{
          '--gmm-accent': styles.accent,
          '--gmm-bg': styles.bg,
          '--gmm-border': styles.border,
        }}
        onMouseEnter={() => { hoverRef.current = true; if (timerRef.current) clearTimeout(timerRef.current); }}
        onMouseLeave={() => { hoverRef.current = false; if (open) timerRef.current = setTimeout(() => onClose?.(), duration); }}
      >
        <div className="gmm-icon" style={{ color: styles.accent }}>
          {ICONS[type] || ICONS.info}
        </div>
        <span className="gmm-text">{text}</span>
        <button className="gmm-close" onClick={onClose} aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="gmm-progress" style={{ animationDuration: `${duration}ms` }} />
      </div>
    </div>
  );
}

// Context + Provider
const MessageContext = createContext();

export function MessageProvider({ children }) {
  const [message, setMessage] = useState({ open: false, type: 'info', text: '', duration: 4000 });

  const showMessage = useCallback(({ type = 'info', text = '', duration = 10000 }) => {
    setMessage({ open: true, type, text, duration });
  }, []);

  const close = useCallback(() => setMessage(prev => ({ ...prev, open: false })), []);

  return (
    <MessageContext.Provider value={{ showMessage, message, close }}>
      {children}
      <GlobalMessageModal message={message} onClose={close} />
    </MessageContext.Provider>
  );
}

export function useMessage() {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('useMessage must be used within MessageProvider');
  return ctx;
}

export { GlobalMessageModal };