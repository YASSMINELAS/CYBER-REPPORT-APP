import { NavLink } from 'react-router-dom';

import {
  ChevronLeft,
  ShieldCheck,
  X,
} from 'lucide-react';

import {
  navigationSections,
} from '../config/navigation';

const Sidebar = ({
  open,
  collapsed,
  isDesktop,
  onToggle,
}) => {
  const handleNavClick = () => {
    if (!isDesktop) {
      onToggle();
    }
  };

  return (
    <>
      {!isDesktop && open && (
        <div
          className="sidebar-overlay"
          onClick={onToggle}
        />
      )}

      <aside
        className={`sidebar${open ? ' open' : ''}${
          collapsed ? ' collapsed' : ''
        }`}
      >
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <span className="sidebar-brand__mark">
              SP
            </span>

            <div className="sidebar-brand__copy">
              <strong>SOC Platform</strong>
              <span>Cyber defense console</span>
            </div>
          </div>

          <button
            type="button"
            className="icon-button sidebar-toggle-button"
            onClick={onToggle}
            aria-label={
              isDesktop
                ? collapsed
                  ? 'Expand sidebar'
                  : 'Collapse sidebar'
                : 'Close sidebar'
            }
          >
            {isDesktop ? (
              <ChevronLeft
                size={18}
                className={
                  collapsed
                    ? 'sidebar-toggle-icon collapsed'
                    : 'sidebar-toggle-icon'
                }
              />
            ) : (
              <X size={18} />
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigationSections.map((section) => (
            <div
              className="sidebar-group"
              key={section.label}
            >
              <p className="sidebar-group__label">
                {section.label}
              </p>

              <div className="sidebar-group__links">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={item.label}
                      className={({ isActive }) =>
                        isActive
                          ? 'sidebar-link active'
                          : 'sidebar-link'
                      }
                      onClick={handleNavClick}
                    >
                      <span className="sidebar-link__icon">
                        <Icon size={18} />
                      </span>

                      <span className="sidebar-link__content">
                        <span className="sidebar-link__title">
                          {item.label}
                        </span>
                        <span className="sidebar-link__description">
                          {item.description}
                        </span>
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="sidebar-status__icon">
              <ShieldCheck size={16} />
            </span>

            <div className="sidebar-status__copy">
              <strong>Identity secured</strong>
              <span>Keycloak session active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
