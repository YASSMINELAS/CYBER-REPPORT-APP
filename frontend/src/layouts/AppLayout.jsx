import { useEffect, useState } from 'react';

import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

const DESKTOP_BREAKPOINT = 1180;

const AppLayout = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= DESKTOP_BREAKPOINT
  );
  const [menuOpen, setMenuOpen] = useState(
    () => window.innerWidth >= DESKTOP_BREAKPOINT
  );
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(min-width: ${DESKTOP_BREAKPOINT}px)`
    );

    const syncLayout = (event) => {
      const desktop = event.matches;

      setIsDesktop(desktop);
      setMenuOpen(desktop);
    };

    syncLayout(mediaQuery);

    mediaQuery.addEventListener('change', syncLayout);

    return () =>
      mediaQuery.removeEventListener(
        'change',
        syncLayout
      );
  }, []);

  useEffect(() => {
    if (isDesktop) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () =>
      window.removeEventListener(
        'keydown',
        handleEscape
      );
  }, [isDesktop]);

  const handleMenuClick = () => {
    if (isDesktop) {
      setSidebarCollapsed((current) => !current);
      return;
    }

    setMenuOpen((current) => !current);
  };

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setSidebarCollapsed((current) => !current);
      return;
    }

    setMenuOpen(false);
  };

  return (
    <div
      className={`app-shell${isDesktop ? ' is-desktop' : ' is-mobile'}${
        menuOpen ? ' nav-open' : ''
      }${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
    >
      <Sidebar
        open={menuOpen}
        collapsed={sidebarCollapsed}
        isDesktop={isDesktop}
        onToggle={handleSidebarToggle}
      />

      <div className="app-shell__main">
        <Topbar
          onMenuClick={handleMenuClick}
          isDesktop={isDesktop}
          isSidebarCollapsed={sidebarCollapsed}
        />

        <main className="app-shell__content">
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
