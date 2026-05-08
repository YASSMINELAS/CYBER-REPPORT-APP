/**
 * Layout principal des pages authentifiees.
 *
 * Role architectural:
 * - Encadre les pages privees avec Sidebar et Topbar.
 * - Utilise Outlet pour afficher la route enfant active.
 */
// useState gere l'etat visuel de la sidebar.
import { useState } from 'react';
// Outlet affiche la page correspondant a la route enfant.
import { Outlet } from 'react-router-dom';
// Navigation laterale.
import Sidebar from './Sidebar';
// Barre superieure.
import Topbar from './Topbar';

// Composant layout prive.
const AppLayout = () => {
  // Etat React: true si la sidebar est repliee.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} />
      <Topbar collapsed={sidebarCollapsed} />
      <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default AppLayout;
