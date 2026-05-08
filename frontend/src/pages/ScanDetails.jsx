/**
 * Page Scan Details.
 *
 * Role architectural:
 * - Affiche les findings Nessus stockes comme vulnerabilites source=nessus.
 * - Combine table, details selectionnes, stats host et graphique de severite.
 */
// Hooks React pour etat, effets, callbacks et calculs memorises.
import { useCallback, useEffect, useMemo, useState } from 'react';
// Notifications utilisateur.
import { toast } from 'react-toastify';
// Composants UI utilises pour details, loader, pagination et graphiques.
import JsonViewer from '../components/JsonViewer';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import SeverityBadge from '../components/SeverityBadge';
import SeverityPieChart from '../components/SeverityPieChart';
import StatCard from '../components/StatCard';
// Client API.
import api, { getApiErrorMessage } from '../services/api';
// Helper de transformation des lignes en donnees de chart.
import { recordsToSeverityChartData } from '../utils/charts';

// Composant React des details de scan Nessus.
const ScanDetails = () => {
  // Findings Nessus affiches dans la table.
  const [vulnerabilities, setVulnerabilities] = useState([]);
  // Pagination backend.
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  // Filtres controles par l'UI.
  const [filters, setFilters] = useState({
    severity: 'all',
    host: '',
    search: '',
    sortBy: 'severity',
    sortOrder: 'desc',
  });
  // Ligne selectionnee pour afficher le panneau detail.
  const [selected, setSelected] = useState(null);
  // Chargement de la page.
  const [loading, setLoading] = useState(true);

  // Charge les vulnerabilites Nessus depuis le backend.
  const fetchVulnerabilities = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        // source=nessus limite les resultats aux imports Nessus.
        const params = new URLSearchParams({
          source: 'nessus',
          page,
          limit: 25,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        // Ajoute les filtres non vides.
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== 'all') params.set(key, value);
        });

        // Appel API: GET /api/vulnerabilities?source=nessus.
        const response = await api.get(`/vulnerabilities?${params.toString()}`);
        const payload = response.data;
        const rows = payload.data || payload;
        setVulnerabilities(rows);
        setSelected((current) => current || rows[0] || null);
        setMeta({
          page: payload.page || page,
          pages: payload.pages || 1,
          total: payload.total || rows.length,
        });
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to load Nessus scan details.'));
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Chargement initial et rechargement sur changement de filtre.
  useEffect(() => {
    fetchVulnerabilities(1);
  }, [fetchVulnerabilities]);

  // useMemo evite de recalculer la liste d'hotes a chaque rendu non pertinent.
  const hosts = useMemo(
    () => Array.from(new Set(vulnerabilities.map((item) => item.host).filter(Boolean))),
    [vulnerabilities]
  );
  // Donnees de graphique derivees des vulnerabilites visibles.
  const chartData = useMemo(() => recordsToSeverityChartData(vulnerabilities), [vulnerabilities]);

  // Met a jour un filtre controle.
  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="page wide-page">
      <section className="page-header">
        <div>
          <h1>Scan Details</h1>
          <p>Nessus-like scan findings, affected hosts, and remediation context.</p>
        </div>
      </section>

      <section className="panel dense-filters">
        <input
          type="search"
          placeholder="Search plugin, CVE, host..."
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
          placeholder="Host IP"
          value={filters.host}
          onChange={(event) => updateFilter('host', event.target.value)}
        />
      </section>

      {loading && <Loader label="Loading Nessus findings..." />}

      {!loading && (
        <section className="split-layout">
          <div>
            <div className="table-wrap dense-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Plugin</th>
                    <th>Severity</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>CVE</th>
                  </tr>
                </thead>
                <tbody>
                  {vulnerabilities.map((vulnerability) => (
                    <tr
                      key={vulnerability._id}
                      className={selected?._id === vulnerability._id ? 'selected-row' : ''}
                      onClick={() => setSelected(vulnerability)}
                    >
                      <td>{vulnerability.title}</td>
                      <td><SeverityBadge value={vulnerability.severity} /></td>
                      <td>{vulnerability.host || '-'}</td>
                      <td>{vulnerability.port || '-'}</td>
                      <td>{vulnerability.cve?.join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!vulnerabilities.length && <div className="empty-state">No scan findings found.</div>}
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPageChange={fetchVulnerabilities} />
          </div>

          <aside className="details-panel">
            <div className="stats-grid compact-stats">
              <StatCard label="Findings" value={meta.total} />
              <StatCard label="Hosts" value={hosts.length} />
            </div>
            <SeverityPieChart title="Severity Distribution" data={chartData} />
            <section className="panel">
              <h2>Selected Finding</h2>
              {selected ? (
                <div className="finding-detail">
                  <h3>{selected.title}</h3>
                  <p>{selected.description || 'No description available.'}</p>
                  <div className="metric-row"><span>Host</span><strong>{selected.host || '-'}</strong></div>
                  <div className="metric-row"><span>Protocol</span><strong>{selected.protocol || '-'}</strong></div>
                  <div className="metric-row"><span>Scan</span><strong>{selected.scanName || selected.scanId || '-'}</strong></div>
                  <h3>Solution</h3>
                  <p>{selected.solution || 'No remediation guidance available.'}</p>
                  <JsonViewer data={selected.raw || selected} />
                </div>
              ) : (
                <p className="message">Select a vulnerability to inspect it.</p>
              )}
            </section>
          </aside>
        </section>
      )}
    </main>
  );
};

export default ScanDetails;
