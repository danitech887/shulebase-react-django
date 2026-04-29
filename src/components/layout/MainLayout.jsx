import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header  from './Header';
import SystemNotificationBar from './SystemNotificationBar';
import PricingModal from '../common/PricingModal';

export default function MainLayout() {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(() => window.innerWidth <= 768);

  /* Detect viewport changes */
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleToggle = () => {
    if (isMobile) setMobileOpen(o => !o);
    else          setCollapsed(o => !o);
  };

  const handleCloseMobile = () => setMobileOpen(false);

  /* Content offset mirrors sidebar width — now purely via CSS class logic */
  const contentClass = [
    'sb-page-content',
    !isMobile && collapsed ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="sb-dashboard-shell" style={{ minHeight: '100vh', background: 'var(--sb-bg, #0d0f14)', overflowX: 'hidden', position: 'relative' }}>
      <PricingModal />
      <SystemNotificationBar />
      
      {/* 1. Sidebar overlay */}
      <Sidebar
        collapsed={!isMobile && collapsed}
        mobileOpen={isMobile && mobileOpen}
        onToggle={handleToggle}
        onClose={handleCloseMobile}
        onBackdropClick={handleCloseMobile}
      />

      {/* 2. Main content area */}
      <div
        className={contentClass}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh', 
          minWidth: 0,
          background: 'inherit'
        }}
      >
        <Header
          sidebarCollapsed={!isMobile && collapsed}
          onMenuClick={handleToggle}
        />
        <main style={{ 
          flex: 1, 
          padding: '1.5rem', 
          paddingTop: 'calc(62px + 1.5rem)', 
          overflowX: 'hidden',
          width: '100%'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}