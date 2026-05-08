/**
 * Sidebar de navigation.
 *
 * Role architectural:
 * - Fournit l'acces aux pages principales du SOC.
 * - Utilise NavLink pour marquer automatiquement la route active.
 */
// NavLink applique une classe active selon l'URL courante.
import { NavLink } from 'react-router-dom';

// Configuration declarative du menu lateral.
const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'D' },
  { path: '/threat-hunting', label: 'Threat Hunting', icon: '!' },
  { path: '/scan-details', label: 'Scan Details', icon: 'S' },
  { path: '/vulnerabilities', label: 'Vulnerabilities', icon: 'V' },
  { path: '/incidents', label: 'Incidents', icon: 'I' },
];

// collapsed controle l'affichage compact; onToggle vient du layout parent.
const Sidebar = ({ collapsed, onToggle }) => {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <NavLink to="/dashboard" className="brand" aria-label="SOC Platform dashboard">
          <span className="brand-icon">S</span>
          <span className="brand-text">SOC Platform</span>
        </NavLink>
        <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          Menu
        </button>
      </div>

      <nav className="nav-links" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} className="nav-item" data-tooltip={item.label}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
