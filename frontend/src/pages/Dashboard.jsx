/**
 * Page Dashboard.
 *
 * Role architectural:
 * - Affiche une vue globale SOC a partir des statistiques backend.
 * - Consomme /api/stats et transforme les donnees en cartes et graphiques.
 *
 * Flux:
 * useEffect -> fetchStats -> Axios GET /stats -> setStats -> rendu JSX/Recharts.
 */
// Hooks React: etat, effet de chargement, callback stable et reference persistante.
import { useCallback, useEffect, useRef, useState } from 'react';
// Navigation programmatique vers les pages detaillees.
import { useNavigate } from 'react-router-dom';
// Notifications utilisateur.
import { toast } from 'react-toastify';
// Composants Recharts pour la courbe temporelle.
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
// Composants UI reutilisables.
import Loader from '../components/Loader';
import SeverityBadge from '../components/SeverityBadge';
import SeverityBarChart from '../components/SeverityBarChart';
import SeverityPieChart from '../components/SeverityPieChart';
import StatCard from '../components/StatCard';
// Client API centralise et helper d'erreur.
import api, { getApiErrorMessage } from '../services/api';
// Helpers qui transforment les stats en donnees de graphiques.
import { severityRange, severityStatsToChartData } from '../utils/charts';

// Composant React de page.
const Dashboard = () => {
  // Hook React Router pour changer de page au clic sur les cartes.
  const navigate = useNavigate();
  // Etat principal: payload complet renvoye par /api/stats.
  const [stats, setStats] = useState(null);
  // Etat d'erreur affichable dans l'interface.
  const [error, setError] = useState('');
  // Etat de chargement pour afficher Loader et desactiver Refresh.
  const [loading, setLoading] = useState(true);
  // Ref: persiste entre rendus sans declencher de re-render.
  const loadedToastShown = useRef(false);

  // useCallback memorise la fonction pour eviter des effets inutiles dans useEffect.
  const fetchStats = useCallback(async (showToast = false) => {
    try {
      // Manipulations d'etat React avant appel API.
      setError('');
      setLoading(true);
      // Appel API vers le backend Express: GET /api/stats.
      const response = await api.get('/stats');
      // Met a jour l'etat; React relance ensuite le rendu JSX.
      setStats(response.data);
      if (showToast) {
        toast.success('Dashboard refreshed.');
      } else if (!loadedToastShown.current) {
        toast.success('Dashboard data loaded.');
        loadedToastShown.current = true;
      }
    } catch (error) {
      // 401 est deja gere par l'intercepteur Axios global.
      if (error.response?.status === 401) {
        return;
      }
      const message = getApiErrorMessage(error, 'Failed to load dashboard stats.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect lance le chargement initial au montage de la page.
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Valeurs derivees: evitent les erreurs si stats est encore null.
  const vulnerabilities = stats?.vulnerabilities || {};
  const incidents = stats?.incidents || {};
  const wazuh = stats?.wazuh || {};
  const vulnerabilityChartData = severityStatsToChartData(vulnerabilities);
  const incidentChartData = severityStatsToChartData(incidents);
  const incidentTimeline = stats?.incidentsOverTime || [];

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Security overview from Nessus and Wazuh.</p>
        </div>
        <button
          type="button"
          className="secondary-button refresh-button"
          onClick={() => fetchStats(true)}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {loading && <Loader label="Loading dashboard..." />}
      {error && <div className="panel error-message">{error}</div>}

      {!loading && !error && stats && (
        <>
          <section className="stats-grid">
            <StatCard
              label="Total vulnerabilities"
              value={vulnerabilities.total || 0}
              helper="Open vulnerability records"
              onClick={() => navigate('/vulnerabilities')}
            />
            <StatCard
              label="Total incidents"
              value={incidents.total || 0}
              helper="Security incidents"
              onClick={() => navigate('/incidents')}
            />
            <StatCard
              label="Alerts last 24h"
              value={wazuh.alertsLast24h || 0}
              helper="Recent Wazuh activity"
              onClick={() => navigate('/threat-hunting')}
            />
            <StatCard
              label="Nessus findings"
              value={stats?.nessus?.totalScans || 0}
              helper="Imported scan findings"
              onClick={() => navigate('/scan-details')}
            />
          </section>

          <section className="severity-card-grid">
            {['critical', 'high', 'medium', 'low'].map((severity) => (
              <article className={`panel severity-summary severity-${severity}`} key={severity}>
                <SeverityBadge value={severity} />
                <strong>{(vulnerabilities[severity] || 0) + (incidents[severity] || 0)}</strong>
                <span>Total {severity} records</span>
              </article>
            ))}
          </section>

          <section className="grid-two">
            <article className="panel severity-overview">
              <h2>Severity Levels</h2>
              <div className="severity-levels">
                <div className="severity-tile severity-critical">
                  <strong>Critical</strong>
                  <span>{severityRange.critical}</span>
                </div>
                <div className="severity-tile severity-high">
                  <strong>High</strong>
                  <span>{severityRange.high}</span>
                </div>
                <div className="severity-tile severity-medium">
                  <strong>Medium</strong>
                  <span>{severityRange.medium}</span>
                </div>
                <div className="severity-tile severity-low">
                  <strong>Low</strong>
                  <span>{severityRange.low}</span>
                </div>
              </div>
            </article>
            <SeverityPieChart
              title="Vulnerabilities by Severity"
              data={vulnerabilityChartData}
            />
            <SeverityBarChart
              title="Vulnerability Counts"
              data={vulnerabilityChartData}
            />
            <SeverityPieChart title="Incidents by Severity" data={incidentChartData} />
            <article className="panel chart-card">
              <h2>Incidents Over Time</h2>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incidentTimeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#155eef" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
};

export default Dashboard;
