/**
 * Page Threat Hunting.
 *
 * Role architectural:
 * - Fournit une vue orientee investigation sur les alertes Wazuh stockees comme incidents.
 * - Permet de filtrer, paginer et ouvrir le JSON brut pour analyse.
 */
// Fragment permet de rendre plusieurs lignes <tr>; hooks React gerent etat/effets.
import { Fragment, useCallback, useEffect, useState } from 'react';
// useSearchParams lit les filtres depuis l'URL.
import { useSearchParams } from 'react-router-dom';
// Notifications utilisateur.
import { toast } from 'react-toastify';
// Composants UI.
import JsonViewer from '../components/JsonViewer';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import SeverityBadge from '../components/SeverityBadge';
// Client API centralise.
import api, { getApiErrorMessage } from '../services/api';

// Formate les timestamps Wazuh/incidents pour affichage humain.
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-');

// Composant React de threat hunting.
const ThreatHunting = () => {
  // Lit ?search=... pour synchroniser une recherche venant d'autres pages.
  const [searchParams] = useSearchParams();
  // Alertes/incidents affiches dans la table.
  const [alerts, setAlerts] = useState([]);
  // Meta pagination renvoyee par le backend.
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  // Filtres controles par les inputs.
  const [filters, setFilters] = useState({
    severity: 'all',
    agent: '',
    from: '',
    to: '',
    search: searchParams.get('search') || '',
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  // Identifiant de la ligne ouverte pour afficher le JSON brut.
  const [expandedId, setExpandedId] = useState('');
  // Etat de chargement de la table.
  const [loading, setLoading] = useState(true);

  // Charge les alertes Wazuh depuis /api/incidents?source=wazuh.
  const fetchAlerts = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        // Query string envoyee au backend avec pagination et tri.
        const params = new URLSearchParams({
          source: 'wazuh',
          page,
          limit: 25,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        // Ajoute uniquement les filtres utiles.
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== 'all') params.set(key, value);
        });

        // Appel API: les alertes Wazuh sont stockees comme incidents source=wazuh.
        const response = await api.get(`/incidents?${params.toString()}`);
        const payload = response.data;
        setAlerts(payload.data || payload);
        setMeta({
          page: payload.page || page,
          pages: payload.pages || 1,
          total: payload.total || (payload.data || payload).length,
        });
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to load Wazuh alerts.'));
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Chargement initial et rechargement a chaque changement de filtre.
  useEffect(() => {
    fetchAlerts(1);
  }, [fetchAlerts]);

  // Synchronise la recherche si l'URL change.
  useEffect(() => {
    const querySearch = searchParams.get('search') || '';
    setFilters((current) =>
      current.search === querySearch ? current : { ...current, search: querySearch }
    );
  }, [searchParams]);

  // Met a jour un filtre de facon immutable.
  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="page wide-page">
      <section className="page-header">
        <div>
          <h1>Threat Hunting</h1>
          <p>Wazuh-style alert discovery with MITRE and agent context.</p>
        </div>
      </section>

      <section className="panel dense-filters">
        <input
          type="search"
          placeholder="Search rule, agent, IP..."
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
        />
        <select value={filters.severity} onChange={(event) => updateFilter('severity', event.target.value)}>
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          type="search"
          placeholder="Agent name or IP"
          value={filters.agent}
          onChange={(event) => updateFilter('agent', event.target.value)}
        />
        <input type="datetime-local" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} />
        <input type="datetime-local" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} />
      </section>

      {loading && <Loader label="Loading Wazuh alerts..." />}

      {!loading && (
        <>
          <div className="table-wrap dense-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Agent</th>
                  <th>IP</th>
                  <th>Rule</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <Fragment key={alert._id}>
                    <tr
                      className="expandable-row"
                      onClick={() => setExpandedId(expandedId === alert._id ? '' : alert._id)}
                    >
                      <td>{formatDate(alert.timestamp || alert.createdAt)}</td>
                      <td>{alert.agentName || '-'}</td>
                      <td>{alert.agentIP || '-'}</td>
                      <td>{alert.title}</td>
                      <td>
                        <SeverityBadge value={alert.severity} /> {alert.ruleLevel}
                      </td>
                    </tr>
                    {expandedId === alert._id && (
                      <tr className="expanded-row">
                        <td colSpan="6">
                          <JsonViewer data={alert.raw || alert} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {!alerts.length && <div className="empty-state">No alerts found.</div>}
          <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPageChange={fetchAlerts} />
        </>
      )}
    </main>
  );
};

export default ThreatHunting;
