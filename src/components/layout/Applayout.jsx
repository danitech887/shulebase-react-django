/**
 * AppLayout.jsx — Reference layout
 *
 * Drop this in place of wherever you currently render
 * <Sidebar> + your main content wrapper.
 *
 * The sidebar is now position:fixed (z-index 900).
 * The page content is offset by margin-left via the
 * .sb-page-content / .sb-page-content.collapsed CSS classes.
 * On mobile (<= 768 px) the margin collapses to 0 and the
 * sidebar slides in as a full overlay with a backdrop.
 */

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header  from './components/layout/Header';
import SystemNotificationBar from './SystemNotificationBar';

export default function AppLayout() {
  // Desktop: collapsed = icon-only rail (64 px)
  const [collapsed, setCollapsed]     = useState(false);
  // Mobile: mobileOpen = full sidebar slides in over content
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth <= 768);

  /* Track viewport so we can switch between modes */
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false); // close overlay when resizing to desktop
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Toggle: on desktop → collapse/expand; on mobile → open/close overlay */
  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen(o => !o);
    } else {
      setCollapsed(o => !o);
    }
  };

  /* Backdrop or nav-item click on mobile closes the sidebar */
  const handleCloseMobile = () => setMobileOpen(false);

  /* Content offset class */
  const contentClass = [
    'sb-page-content',
    !isMobile && collapsed ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0f14' }}>
      <SystemNotificationBar />
      {/* ── Sidebar (fixed overlay) ── */}
      <Sidebar
        collapsed={!isMobile && collapsed}
        mobileOpen={isMobile && mobileOpen}
        onToggle={handleToggle}
        onBackdropClick={handleCloseMobile}
      />

      {/* ── Page content pushed right by margin ── */}
      <div className={contentClass} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header gets sidebarCollapsed so it can show/hide the logo */}
        <Header sidebarCollapsed={!isMobile && collapsed} onMenuClick={handleToggle} />

        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}