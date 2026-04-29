import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SubscriptionContext } from '../../context/SubscriptionContext';
import logo from '/assets/images/logo.png';
import api from '../../api/api';
import './Header.css';

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(); };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export default function Header({ sidebarCollapsed = false, onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const { setShowPricingModal } = useContext(SubscriptionContext);

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);

  const notifRef = useRef(null);
  const userRef  = useRef(null);

  useOutsideClick(notifRef, () => setNotifOpen(false));
  useOutsideClick(userRef,  () => setUserOpen(false));

  const username   = user?.display_name || user?.username || 'User';
  const schoolName = user?.school_name || 'School';
  const role       = user?.role        || 'Staff';

  const initials = username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleNotifOpen = () => { setNotifOpen(o => !o); setUserOpen(false); };
  const handleUserOpen  = () => { setUserOpen(o => !o);  setNotifOpen(false); };
  const handleLogout    = async () => { await logout(); navigate('/login'); };

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('system-notifications/');
        setNotifications(data || []);
      } catch (err) { console.error('Failed to fetch header notifications', err); }
    };
    fetchNotifs();
  }, []);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  const notifItems = [
    { icon: '📝', msg: 'New student registered', time: '2 hours ago' },
    { icon: '✅', msg: 'Attendance marked',       time: '4 hours ago' },
    { icon: '💳', msg: 'Fee payment received',    time: '1 day ago'   },
  ];

  // ── Dynamic Menu items based on role ─────────────
  const getProfileRoute = () => {
    const currentRole = user?.role?.toLowerCase();
    if (currentRole === 'teacher') {
      return '/teachers-portal/account';
    }
    // Fallback to security page for roles without a dedicated profile yet
    return '/account/change-password';
  };

  const menuItems = [
    {
      icon: '👤',
      label: 'My Profile',
      onClick: () => { setUserOpen(false); navigate(getProfileRoute()); },
    },
    {
      icon: '🔐',
      label: 'Account Security',
      onClick: () => { setUserOpen(false); navigate('/account/change-password'); },
    }
  ];

  return (
    <nav className={`hd-navbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="hd-inner">

        {/* ── Hamburger ── */}
        <button
          className="hd-hamburger"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          ☰
        </button>

        {/* ── Logo — desktop only, when sidebar collapsed ── */}
        {sidebarCollapsed && (
          <div className="hd-logo hd-logo-desktop">
            <img src={logo} alt="School Logo" width={80} height={52} />
          </div>
        )}

        {/* ── School Name ── */}
        <div className="hd-center">
          <span className="hd-school-name">{schoolName.toUpperCase()}</span>
        </div>

        {/* ── Right Actions ── */}
        <div className="hd-right">

          {/* Theme Toggle */}
          <button 
            className="hd-icon-btn hd-theme-btn" 
            onClick={toggleTheme} 
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Notifications */}
          <div className="hd-dropdown-wrap" ref={notifRef}>
            <button className="hd-icon-btn hd-notif-btn" onClick={handleNotifOpen} aria-label="Notifications">
              🔔
              {notifications.length > 0 && (
                <span className="hd-notif-badge">{notifications.length}</span>
              )}
            </button>

            {notifOpen && (
              <div className="hd-dropdown hd-notif-dropdown">
                <div className="hd-dropdown-header">
                  <span className="hd-dropdown-header-title">System Notifications</span>
                </div>
                <div className="hd-notif-scroll" style={{maxHeight:'300px', overflowY:'auto'}}>
                  {notifications.length === 0 ? (
                    <div style={{padding:'2rem', textAlign:'center', color:'#6b7280'}}>No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="hd-notif-item">
                        <div className="hd-notif-icon">
                          {n.priority === 'danger' ? '🚨' : n.priority === 'warning' ? '⚠️' : n.priority === 'success' ? '✨' : 'ℹ️'}
                        </div>
                        <div className="hd-notif-text">
                          <p className="hd-notif-msg" style={{fontWeight:600}}>{n.title}</p>
                          <p className="hd-notif-sub" style={{fontSize:'0.85rem', margin:'4px 0'}}>{n.content}</p>
                          <span className="hd-notif-time">{formatTimeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="hd-dropdown-wrap" ref={userRef}>
            <button
              className={`hd-user-btn ${userOpen ? 'open' : ''}`}
              onClick={handleUserOpen}
              aria-label="User menu"
            >
              <div className="hd-avatar">{initials}</div>
              <span className="hd-user-name">{username}</span>
              <span className="hd-arrow">▼</span>
            </button>

            {userOpen && (
              <div className="hd-dropdown hd-user-dropdown">
                <div className="hd-user-header">
                  <div className="hd-avatar-lg">{initials}</div>
                  <div className="hd-user-header-info">
                    <p className="hd-user-display-name">{username}</p>
                    <span className="hd-user-role">{role}</span>
                  </div>
                </div>

                <div className="hd-menu-section">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      className="hd-menu-item"
                      onClick={item.onClick}
                    >
                      <span className="hd-menu-item-icon">{item.icon}</span>
                      <span className="hd-menu-item-label">{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="hd-menu-divider" />

                <div className="hd-menu-section">
                  {['admin', 'systemowner'].includes(user?.role?.toLowerCase()) && (
                    <button className="hd-menu-item upgrade-plan" onClick={() => { setShowPricingModal(true); setUserOpen(false); }}>
                      <span className="hd-menu-item-icon">💎</span>
                      <span className="hd-menu-item-label">Display Pricing</span>
                    </button>
                  )}
                  <button className="hd-menu-item logout" onClick={handleLogout}>
                    <span className="hd-menu-item-icon">🚪</span>
                    <span className="hd-menu-item-label">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}