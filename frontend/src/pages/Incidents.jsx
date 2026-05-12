import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import {
  Radar,
  ShieldAlert,
  Siren,
  Target,
} from 'lucide-react';

import DataTable from '../components/data/DataTable';
import Loader from '../components/Loader';
import PageHeader from '../components/PageHeader';
import SeverityBadge from '../components/SeverityBadge';
import StatCard from '../components/StatCard';
import { getApiErrorMessage, hasRole } from '../services/api';
import {
  closeIncident,
  deleteIncident,
  getIncidents,
  importIncidents,
  previewWazuhAlerts,
} from '../services/incidentService';
import { severityColors } from '../utils/charts';

const limit = 20;

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(8,17,32,0.95)',
    border: '1px solid rgba(56,189,248,0.18)',
    borderRadius: '12px',
    color: '#dbeafe',
    fontSize: '12px',
  },
};

const statusBadge = (status) => (
  <span className={`badge status-${status || 'open'}`}>{status || 'open'}</span>
);

const arrayText = (value) =>
  Array.isArray(value) && value.length ? value.join(', ') : '-';

const formatDate = (value) =>
  value ? new Date(value).toLocaleString() : '-';

const filters = [
  { key: 'search', label: 'Search', placeholder: 'Title, host, CVE, MITRE…', type: 'search' },
  {
    key: 'severity',
    label: 'Severity',
    type: 'select',
    options: [
      { value: 'all', label: 'All severities' },
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'all', label: 'All statuses' },
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
      { value: 'resolved', label: 'Resolved' },
    ],
  },
  { key: 'agent', label: 'Agent', placeholder: 'Agent name or IP', type: 'search' },
  { key: 'from', label: 'From', type: 'datetime-local' },
  { key: 'to', label: 'To', type: 'datetime-local' },
];

const Incidents = () => {
  const navigate = useNavigate();
  const canManageRecords = hasRole('admin', 'analyst');
  const canDeleteRecords = hasRole('admin');

  const [rows, setRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState(new Set());
  const [filterValues, setFilterValues] = useState({
    severity: 'all', status: 'all', search: '', agent: '', from: '', to: '',
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchRows = useCallback(async (nextPage = 1) => {
    try {
      setLoading(true);
      setError('');
      const payload = await getIncidents({ ...filterValues, page: nextPage, limit, sortBy, sortOrder });
      setRows(payload.data || []);
      setTotal(payload.total || 0);
      setPages(payload.pages || 1);
      setPage(payload.page || nextPage);
    } catch (requestError) {
      if (requestError.response?.status === 401) return;
      const message = getApiErrorMessage(requestError, 'Failed to load incidents.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filterValues, sortBy, sortOrder]);

  useEffect(() => { fetchRows(1); }, [filterValues, sortBy, sortOrder, fetchRows]);

  const handleFilterChange = (key, value) => {
    setFilterValues((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const handleSort = (columnKey, order) => {
    setSortBy(columnKey);
    setSortOrder(order);
    setPage(1);
  };

  const handlePreview = async () => {
    if (!canManageRecords) return toast.error('Only admins and analysts can import Wazuh alerts.');
    try {
      setPreviewLoading(true);
      const preview = await previewWazuhAlerts();
      setPreviewRows(preview);
      setSelectedPreviewIds(new Set());
      toast.success(`${preview.length} Wazuh alerts ready for review.`);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to connect to Wazuh.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const togglePreviewRow = (externalId) => {
    setSelectedPreviewIds((current) => {
      const next = new Set(current);
      next.has(externalId) ? next.delete(externalId) : next.add(externalId);
      return next;
    });
  };

  const saveSelected = async () => {
    const items = previewRows.filter((row) => selectedPreviewIds.has(row.externalId));
    if (!items.length) return toast.info('Select at least one Wazuh alert first.');
    try {
      setSubmitting(true);
      const payload = await importIncidents(items);
      toast.success(`${payload.imported} incidents saved.`);
      setSelectedPreviewIds(new Set());
      await fetchRows(1);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to save selected incidents.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (row) => {
    try {
      await closeIncident(row._id);
      toast.success('Incident closed.');
      await fetchRows(page);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to update incident status.'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete incident "${row.title}"?`)) return;
    try {
      await deleteIncident(row._id);
      toast.success('Incident deleted.');
      await fetchRows(page);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to delete incident.'));
    }
  };

  // ─── Chart data ──────────────────────────────────────────────────────────

  const severityChartData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    rows.forEach((r) => {
      const s = r.severity?.toLowerCase();
      if (s in counts) counts[s]++;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: severityColors[key],
    }));
  }, [rows]);

  const statusChartData = useMemo(() => {
    const counts = { open: 0, closed: 0, resolved: 0 };
    rows.forEach((r) => {
      const s = r.status || 'open';
      if (s in counts) counts[s]++;
    });
    return [
      { name: 'Open', value: counts.open, color: '#38bdf8' },
      { name: 'Closed', value: counts.closed, color: '#6f86a8' },
      { name: 'Resolved', value: counts.resolved, color: '#22c55e' },
    ];
  }, [rows]);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const openCount = rows.filter((row) => (row.status || 'open') === 'open').length;
  const criticalCount = rows.filter((row) => row.severity?.toLowerCase() === 'critical').length;
  const agentCount = new Set(rows.map((row) => row.agentName || row.agentIP).filter(Boolean)).size;

  // ─── Columns ──────────────────────────────────────────────────────────────

  const columns = [
    { key: 'title', label: 'Incident', sortable: true },
    {
      key: 'severity', label: 'Severity', sortable: true,
      render: (row) => <SeverityBadge value={row.severity} />,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'host', label: 'Host / IP', sortable: true,
      render: (row) => row.host || row.agentIP || '-',
    },
    {
      key: 'port', label: 'Port', sortable: true,
      render: (row) => row.port || '-',
    },
    { key: 'cve', label: 'CVE', render: (row) => arrayText(row.cve) },
    { key: 'mitreTactic', label: 'MITRE', render: (row) => arrayText(row.mitreTactic) },
    {
      key: 'timestamp', label: 'Time', sortable: true,
      render: (row) => formatDate(row.timestamp || row.createdAt),
    },
    {
      key: 'actions', label: 'Actions',
      render: (row) => (
        <div className="row-actions">
          {canManageRecords && (
            <>
              <button type="button" className="secondary-button" onClick={() => navigate(`/incidents/${row._id}/edit`)}>Edit</button>
              <button type="button" className="secondary-button" onClick={() => handleClose(row)}>Close</button>
            </>
          )}
          {canDeleteRecords && (
            <button type="button" className="danger-button" onClick={() => handleDelete(row)}>Delete</button>
          )}
        </div>
      ),
    },
  ];

  const previewColumns = [
    {
      key: 'select', label: '',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedPreviewIds.has(row.externalId)}
          onChange={() => togglePreviewRow(row.externalId)}
        />
      ),
    },
    { key: 'title', label: 'Rule' },
    { key: 'severity', label: 'Severity', render: (row) => <SeverityBadge value={row.severity} /> },
    { key: 'agentName', label: 'Agent', render: (row) => row.agentName || '-' },
    { key: 'agentIP', label: 'IP', render: (row) => row.agentIP || '-' },
    { key: 'mitreTactic', label: 'MITRE', render: (row) => arrayText(row.mitreTactic) },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="page wide-page">
      <PageHeader
        eyebrow="Detection Response"
        title="Incidents"
        description="Investigate Wazuh alerts, preserve analyst context, and manage response status."
        meta={
          <div className="page-meta-badges">
            <span className="page-meta-pill">{total} tracked incidents</span>
            <span className="page-meta-pill">{previewRows.length} preview rows</span>
          </div>
        }
        actions={
          canManageRecords && (
            <>
              <button type="button" className="secondary-button" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? 'Connecting…' : 'Connect to Wazuh'}
              </button>
              <Link className="add-button" to="/add-incident">Add Incident</Link>
            </>
          )
        }
      />

      {/* Stat cards */}
      <section className="stats-grid stats-grid--compact">
        <StatCard label="Visible incidents" value={rows.length} helper="Current page results" icon={Siren} accent="cyan" />
        <StatCard label="Open investigations" value={openCount} helper="Still in response flow" icon={ShieldAlert} accent="blue" />
        <StatCard label="Critical alerts" value={criticalCount} helper="Immediate analyst focus" icon={Target} accent="teal" />
        <StatCard label="Impacted agents" value={agentCount} helper="Unique assets in view" icon={Radar} accent="cyan" />
      </section>

      {/* Charts */}
      {!loading && rows.length > 0 && (
        <section className="charts-row">
          {/* Severity donut */}
          <article className="panel chart-card">
            <div>
              <span className="chart-kicker">Alert severity</span>
              <p className="chart-title">Incidents by Severity</p>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityChartData} cx="50%" cy="50%" innerRadius={38} outerRadius={68} dataKey="value" labelLine={false}>
                    {severityChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#9fb2cc' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Status donut */}
          <article className="panel chart-card">
            <div>
              <span className="chart-kicker">Response status</span>
              <p className="chart-title">Incidents by Status</p>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={38} outerRadius={68} dataKey="value" labelLine={false}>
                    {statusChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#9fb2cc' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Severity bar */}
          <article className="panel chart-card" style={{ gridColumn: 'span 2' }}>
            <div>
              <span className="chart-kicker">Volume</span>
              <p className="chart-title">Incident Count by Severity</p>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: '#9fb2cc', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9fb2cc', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      )}

      {previewLoading && <Loader label="Fetching Wazuh preview…" />}

      {previewRows.length > 0 && (
        <section className="panel preview-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">External preview</span>
              <h2>Wazuh Preview</h2>
              <p>{selectedPreviewIds.size} of {previewRows.length} selected</p>
            </div>
            <button
              type="button"
              className="add-button"
              onClick={saveSelected}
              disabled={submitting || selectedPreviewIds.size === 0}
            >
              {submitting ? 'Saving…' : 'Save Selected'}
            </button>
          </div>
          <DataTable columns={previewColumns} rows={previewRows} emptyMessage="No Wazuh alerts found." />
        </section>
      )}

      {loading && <Loader label="Loading incidents…" />}
      {error && <div className="panel error-message">{error}</div>}

      {!loading && !error && (
        <DataTable
          columns={columns}
          rows={rows}
          filters={filters}
          filterValues={filterValues}
          meta={{ page, pages, total, limit }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onFilterChange={handleFilterChange}
          onSort={handleSort}
          onPageChange={fetchRows}
          emptyMessage="No incidents found."
        />
      )}
    </main>
  );
};

export default Incidents;
