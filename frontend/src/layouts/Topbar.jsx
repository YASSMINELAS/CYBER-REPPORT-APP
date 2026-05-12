import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
} from 'lucide-react';

import {
  defaultPageDescriptor,
  findNavigationItem,
} from '../config/navigation';
import { getCurrentUser } from '../services/api';
import keycloak from '../keycloak';

const pageOverrides = {
  '/add-vulnerability': {
    label: 'New Vulnerability',
    description:
      'Create a manually tracked finding with remediation context.',
  },
  '/add-incident': {
    label: 'New Incident',
    description:
      'Capture response details, indicators, and analyst notes.',
  },
};

const Topbar = ({
  onMenuClick,
  isDesktop,
  isSidebarCollapsed,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getCurrentUser();

  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);

  const pageDetails = useMemo(() => {
    if (
      location.pathname.startsWith(
        '/vulnerabilities/'
      ) &&
      location.pathname.endsWith('/edit')
    ) {
      return {
        label: 'Edit Vulnerability',
        description:
          'Update exposure details, tactic mapping, and remediation guidance.',
      };
    }

    if (
      location.pathname.startsWith('/incidents/') &&
      location.pathname.endsWith('/edit')
    ) {
      return {
        label: 'Edit Incident',
        description:
          'Update triage context, status, and remediation actions.',
      };
    }

    if (pageOverrides[location.pathname]) {
      return pageOverrides[location.pathname];
    }

    return (
      findNavigationItem(location.pathname) ||
      defaultPageDescriptor
    );
  }, [location.pathname]);

  const userInitials = useMemo(() => {
    const username =
      user?.username?.trim() || 'admin';

    return username
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase())
      .join('');
  }, [user?.username]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    window.addEventListener(
      'pointerdown',
      handlePointerDown
    );

    return () =>
      window.removeEventListener(
        'pointerdown',
        handlePointerDown
      );
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    const query = search.trim();

    if (query) {
      navigate(`/threat-hunting?search=${encodeURIComponent(query)}`);
    }
  };

  const handleLogout = async () => {
    await keycloak.logout({
      redirectUri: window.location.origin,
    });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-button topbar-menu-button"
          onClick={onMenuClick}
          aria-label={
            isDesktop
              ? isSidebarCollapsed
                ? 'Expand navigation'
                : 'Collapse navigation'
              : 'Open navigation'
          }
        >
          <Menu size={18} />
        </button>

        <div className="topbar-context">
          <div className="topbar-context__title-row">
            <div>
              <span className="topbar-context__eyebrow">
                SOC Platform
              </span>
              <h2>{pageDetails.label}</h2>
            </div>

            <span className="topbar-status-pill">
              <ShieldCheck size={14} />
              Keycloak Secured
            </span>
          </div>

          <p>{pageDetails.description}</p>
        </div>
      </div>

      <form
        className="topbar-search"
        onSubmit={handleSearch}
      >
        <Search size={18} />

        <input
          type="search"
          placeholder="Search telemetry, host, CVE, plugin, or IOC"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <button
          type="submit"
          className="search-submit-button"
        >
          Hunt
        </button>
      </form>

      <div className="topbar-user">
        <button
          type="button"
          className="icon-button notification-button"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        <div
          className={`user-menu${menuOpen ? ' open' : ''}`}
          ref={menuRef}
        >
          <button
            type="button"
            className="user-menu__trigger"
            onClick={() =>
              setMenuOpen((current) => !current)
            }
            aria-expanded={menuOpen}
          >
            <span className="user-avatar">
              {userInitials || 'A'}
            </span>

            <span className="user-meta">
              <strong>
                {user?.username || 'admin'}
              </strong>
              <small>
                {user?.role || 'viewer'}
              </small>
            </span>

            <ChevronDown size={16} />
          </button>

          {menuOpen && (
            <div className="user-menu__panel">
              <div className="user-menu__summary">
                <span className="user-avatar large">
                  {userInitials || 'A'}
                </span>

                <div>
                  <strong>
                    {user?.username || 'admin'}
                  </strong>
                  <span>
                    {user?.role || 'viewer'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="user-menu__action"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
