import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import logo from '/assets/images/logo.png';
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

  const [notifications, setNotifications] = useState(3);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);

  const notifRef = useRef(null);
  const userRef  = useRef(null);

  useOutsideClick(notifRef, () => setNotifOpen(false));
  useOutsideClick(userRef,  () => setUserOpen(false));

  const username   = user?.username    || 'User';
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
  const handleMarkRead  = () => setNotifications(0);
  const handleLogout    = async () => { await logout(); navigate('/login'); };

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

          {/* Notifications */}
          <div className="hd-dropdown-wrap" ref={notifRef}>
            <button className="hd-icon-btn hd-notif-btn" onClick={handleNotifOpen} aria-label="Notifications">
              🔔
              {notifications > 0 && (
                <span className="hd-notif-badge">{notifications}</span>
              )}
            </button>

            {notifOpen && (
              <div className="hd-dropdown hd-notif-dropdown">
                <div className="hd-dropdown-header">
                  <span className="hd-dropdown-header-title">Notifications</span>
                  {notifications > 0 && (
                    <button className="hd-dropdown-header-action" onClick={handleMarkRead}>
                      Mark all read
                    </button>
                  )}
                </div>
                {notifItems.map((n, i) => (
                  <div key={i} className="hd-notif-item" onClick={handleMarkRead}>
                    <div className="hd-notif-icon">{n.icon}</div>
                    <div className="hd-notif-text">
                      <p className="hd-notif-msg">{n.msg}</p>
                      <span className="hd-notif-time">{n.time}</span>
                    </div>
                  </div>
                ))}
                <div className="hd-dropdown-footer">
                  <button className="hd-view-all">View all notifications →</button>
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