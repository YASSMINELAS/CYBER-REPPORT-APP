/**
 * Topbar applicative.
 *
 * Role architectural:
 * - Affiche la recherche globale, l'utilisateur courant et le logout.
 * - La recherche redirige vers Threat Hunting avec un query param.
 */
// useState gere le champ de recherche.
import { useState } from 'react';
// useNavigate permet la redirection.
import { useNavigate } from 'react-router-dom';
// toast informe l'utilisateur au logout.
import { toast } from 'react-toastify';
// Helpers auth: lecture utilisateur et suppression token.
import { clearAuth, getCurrentUser } from '../services/api';

// collapsed adapte le style a l'etat de la sidebar.
const Topbar = ({ collapsed }) => {
  // Navigation programmee.
  const navigate = useNavigate();
  // Utilisateur decode depuis le JWT.
  const user = getCurrentUser();
  // Etat controle du champ de recherche.
  const [search, setSearch] = useState('');

  // Soumet la recherche globale vers la page Threat Hunting.
  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    // Condition importante: ne pas naviguer avec une recherche vide.
    if (query) navigate(`/threat-hunting?search=${encodeURIComponent(query)}`);
  };

  // Deconnecte l'utilisateur cote frontend.
  const handleLogout = () => {
    clearAuth();
    toast.info('Logged out successfully.');
    navigate('/login', { replace: true });
  };

  return (
    <header className={`topbar ${collapsed ? 'collapsed' : ''}`}>
      <form className="global-search" role="search" onSubmit={handleSearch}>
        <span aria-hidden="true">Search</span>
        <input
          type="search"
          placeholder="Search alerts, hosts, CVEs..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </form>

      <div className="topbar-actions">
        <div className="user-menu">
          <span className="user-avatar">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
          <span className="user-info">
            <span className="user-name">{user?.username || 'User'}</span>
            <span className="user-role">{user?.role || 'viewer'}</span>
          </span>
        </div>
        <button type="button" className="icon-button" onClick={handleLogout} title="Logout" aria-label="Logout">
          X
        </button>
      </div>
    </header>
  );
};

export default Topbar;
