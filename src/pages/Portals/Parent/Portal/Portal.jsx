import React, { useState } from 'react';
import ParentPortalDashboard from '../Dashboard/Dashboard';
import ParentPortalFees       from '../Fees/Fees';
import ParentPortalLeave      from '../Leave/Leave';
import ParentPortalAttendance from '../Attendance/Attendance';
import ParentPortalAcademics  from '../Academics/Academics';

/* ── Shared bottom navigation ── */
const NAV_ITEMS = [
  { key: 'dashboard',  label: 'Home',        icon: '🏠' },
  { key: 'fees',       label: 'Fees',        icon: '💰' },
  { key: 'leave',      label: 'Leave',       icon: '📋' },
  { key: 'attendance', label: 'Attendance',  icon: '📅' },
  { key: 'academics',  label: 'Academics',   icon: '📊' },
];

export default function ParentPortal() {
  const [active, setActive] = useState('dashboard');

  const renderPage = () => {
    switch (active) {
      case 'dashboard':  return <ParentPortalDashboard />;
      case 'fees':       return <ParentPortalFees />;
      case 'leave':      return <ParentPortalLeave />;
      case 'attendance': return <ParentPortalAttendance />;
      case 'academics':  return <ParentPortalAcademics />;
      default:           return <ParentPortalDashboard />;
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0d0f14', paddingBottom: '70px' }}>
      {/* Page content */}
      {renderPage()}

      {/* ── Bottom Tab Bar ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#131720',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        zIndex: 800,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '0.65rem 0.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'opacity 0.2s',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: '28px', height: '2px',
                  background: '#6366f1',
                  borderRadius: '0 0 4px 4px',
                  boxShadow: '0 0 8px rgba(99,102,241,0.7)',
                }} />
              )}
              <span style={{
                fontSize: '1.3rem',
                filter: isActive ? 'none' : 'grayscale(0.6)',
                opacity: isActive ? 1 : 0.55,
                transition: 'all 0.2s',
                transform: isActive ? 'translateY(-1px)' : 'none',
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#a5b4fc' : '#6b7280',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                transition: 'color 0.2s',
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}