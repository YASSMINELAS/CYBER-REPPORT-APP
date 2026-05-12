import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  Bug,
  Radar,
  ScanSearch,
  Siren,
} from 'lucide-react';

import Loader from '../components/Loader';
import PageHeader from '../components/PageHeader';
import SeverityBadge from '../components/SeverityBadge';
import StatCard from '../components/StatCard';

import api, { getApiErrorMessage } from '../services/api';

import {
  severityColors,
  severityRange,
  severityStatsToChartData,
} from '../utils/charts';

/* ── Tooltip styles shared across charts ── */
const tooltipStyle = {
  contentStyle: {
    background: 'rgba(8, 17, 32, 0.95)',
    border: '1px solid rgba(56, 189, 248, 0.18)',
    borderRadius: '12px',
    color: '#dbeafe',
    fontSize: '12px',
  },
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadedToastShown = useRef(false);

  const fetchStats = useCallback(async (showToast = false) => {
    try {
      setError('');
      setLoading(true);
      const response = await api.get('/stats');
      setStats(response.data);
      if (showToast) {
        toast.success('Dashboard refreshed.');
      } else if (!loadedToastShown.current) {
        toast.success('Dashboard data loaded.');
        loadedToastShown.current = true;
      }
    } catch (requestError) {
      if (requestError.response?.status === 401) return;
      const message = getApiErrorMessage(requestError, 'Failed to load dashboard stats.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const vulnerabilities = stats?.vulnerabilities || {};
  const incidents = stats?.incidents || {};
  const wazuh = stats?.wazuh || {};

  const vulnerabilityChartData = severityStatsToChartData(vulnerabilities);
  const incidentChartData = severityStatsToChartData(incidents);
  const incidentTimeline = stats?.incidentsOverTime || [];

  const totalCritical = (vulnerabilities.critical || 0) + (incidents.critical || 0);
  const totalHigh = (vulnerabilities.high || 0) + (incidents.high || 0);
  const combinedExposure = (vulnerabilities.total || 0) + (incidents.total || 0);

  /* Combined bar data (vulns + incidents per severity) */
  const combinedBarData = ['critical', 'high', 'medium', 'low'].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    Vulnerabilities: vulnerabilities[s] || 0,
    Incidents: incidents[s] || 0,
    color: severityColors[s],
  }));

  return (
    <main className="page dashboard-page">
      <PageHeader
        eyebrow="Mission Control"
        title="Dashboard"
        description="Executive security visibility across Nessus, Wazuh, and analyst-managed records."
        meta={
          <div className="page-meta-badges">
            <span className="page-meta-pill">Wazuh telemetry</span>
            <span className="page-meta-pill">Nessus imports</span>
            <span className="page-meta-pill">Keycloak secured</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="secondary-button refresh-button"
            onClick={() => fetchStats(true)}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {loading && <Loader label="Loading dashboard…" />}
      {error && <div className="panel error-message">{error}</div>}

      {!loading && !error && stats && (
        <>
          {/* ── Command overview ── */}
          <section className="dashboard-command panel">
            <div className="dashboard-command__copy">
              <span className="section-kicker">Command overview</span>
              <h2>Monitor active threats, remediation progress, and platform telemetry.</h2>
              <p>Pivot from posture metrics into deeper investigations, exposure analysis, and incident response workflows.</p>
            </div>

            <div className="dashboard-command__metrics">
              <div className="command-metric">
                <span>Critical exposure</span>
                <strong>{totalCritical}</strong>
              </div>
              <div className="command-metric">
                <span>High priority</span>
                <strong>{totalHigh}</strong>
              </div>
              <div className="command-metric">
                <span>Total tracked</span>
                <strong>{combinedExposure}</strong>
              </div>
            </div>
          </section>

          {/* ── Stat cards ── */}
          <section className="stats-grid stats-grid--dashboard">
            <StatCard
              label="Total vulnerabilities"
              value={vulnerabilities.total || 0}
              helper="Open vulnerability records"
              icon={Bug}
              accent="cyan"
              onClick={() => navigate('/vulnerabilities')}
            />
            <StatCard
              label="Total incidents"
              value={incidents.total || 0}
              helper="Security incidents"
              icon={Siren}
              accent="blue"
              onClick={() => navigate('/incidents')}
            />
            <StatCard
              label="Alerts last 24h"
              value={wazuh.alertsLast24h || 0}
              helper="Recent Wazuh activity"
              icon={Radar}
              accent="teal"
              onClick={() => navigate('/threat-hunting')}
            />
            <StatCard
              label="Nessus findings"
              value={stats?.nessus?.totalScans || 0}
              helper="Imported scan findings"
              icon={ScanSearch}
              accent="cyan"
              onClick={() => navigate('/scan-details')}
            />
          </section>

          {/* ── Severity breakdown row ── */}
          <section className="severity-grid">
            {['critical', 'high', 'medium', 'low'].map((severity) => (
              <article
                className={`stat-card severity-stat-card severity-${severity}`}
                key={severity}
              >
                <SeverityBadge value={severity} />
                <strong>
                  {(vulnerabilities[severity] || 0) + (incidents[severity] || 0)}
                </strong>
                <span className="stat-helper">Total {severity}</span>
              </article>
            ))}
          </section>

          {/* ── Charts grid ── */}
          <section className="dashboard-grid">

            {/* Severity model legend */}
            <article className="panel severity-overview">
              <div className="chart-card__header">
                <div>
                  <span className="chart-kicker">Severity model</span>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Rule Level Ranges</h2>
                </div>
              </div>
              <div className="severity-list">
                {['critical', 'high', 'medium', 'low'].map((s) => (
                  <div className={`severity-item severity-${s}`} key={s}>
                    <strong>{s.charAt(0).toUpperCase() + s.slice(1)}</strong>
                    <span>{severityRange[s]}</span>
                  </div>
                ))}
              </div>
            </article>

            {/* Vulnerabilities pie */}
            <article className="panel chart-card">
              <div className="chart-card__header">
                <div>
                  <span className="chart-kicker">Exposure</span>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Vulnerabilities</h2>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vulnerabilityChartData}
                      cx="50%" cy="50%"
                      innerRadius={40}
                      outerRadius={72}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {vulnerabilityChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ fontSize: 11, color: '#9fb2cc' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            {/* Incidents pie */}
            <article className="panel chart-card">
              <div className="chart-card__header">
                <div>
                  <span className="chart-kicker">Detection</span>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Incidents</h2>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incidentChartData}
                      cx="50%" cy="50%"
                      innerRadius={40}
                      outerRadius={72}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {incidentChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ fontSize: 11, color: '#9fb2cc' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            {/* Combined severity bar */}
            <article className="panel chart-card" style={{ gridColumn: 'span 2' }}>
              <div className="chart-card__header">
                <div>
                  <span className="chart-kicker">Cross-platform</span>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Vulns vs Incidents by Severity</h2>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedBarData} barSize={18} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                    <XAxis dataKey="name" tick={{ fill: '#9fb2cc', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#9fb2cc', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, color: '#9fb2cc' }}>{value}</span>} />
                    <Bar dataKey="Vulnerabilities" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Incidents" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            {/* Incidents over time line */}
            <article className="panel chart-card">
              <div className="chart-card__header">
                <div>
                  <span className="chart-kicker">Incident activity</span>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Incidents Over Time</h2>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incidentTimeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                    <XAxis dataKey="date" tick={{ fill: '#9fb2cc', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#9fb2cc', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#22d3ee' }}
                    />
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
