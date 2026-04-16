import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header  from './Header';

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

  /* Content offset mirrors sidebar width */
  const contentClass = [
    'sb-page-content',
    !isMobile && collapsed ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', overflowX: 'hidden', maxWidth: '100vw' }}>

      {/* Fixed overlay sidebar */}
      <Sidebar
        collapsed={!isMobile && collapsed}
        mobileOpen={isMobile && mobileOpen}
        onToggle={handleToggle}
        onClose={handleCloseMobile}
        onBackdropClick={handleCloseMobile}
      />

      {/* Page content — offset by margin-left via CSS class */}
      <div
        className={contentClass}
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}
      >
        <Header
          sidebarCollapsed={!isMobile && collapsed}
          onMenuClick={handleToggle}
        />
        <main style={{ flex: 1, padding: '1.5rem', paddingTop: ' calc(62px + 1.5rem)', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>

    </div>
  );
}