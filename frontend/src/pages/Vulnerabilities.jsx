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
  Bug,
  ShieldAlert,
  Target,
  Waypoints,
} from 'lucide-react';

import DataTable from '../components/data/DataTable';
import Loader from '../components/Loader';
import PageHeader from '../components/PageHeader';
import SeverityBadge from '../components/SeverityBadge';
import StatCard from '../components/StatCard';
import { getApiErrorMessage, hasRole } from '../services/api';
import {
  closeVulnerability,
  deleteVulnerability,
  getVulnerabilities,
  importVulnerabilities,
  previewNessusFindings,
} from '../services/vulnerabilityService';
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusBadge = (status) => {
  const normalized = ['open', 'closed', 'resolved'].includes(status) ? status : 'open';
  return <span className={`badge status-${normalized}`}>{normalized}</span>;
};

const arrayText = (value) => {
  if (!value) return '-';
  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean);
    return filtered.length ? filtered.join(', ') : '-';
  }
  const trimmed = String(value).trim();
  return trimmed || '-';
};

const formatTimestamp = (value) =>
  value ? new Date(value).toLocaleString() : '-';

const getAgeClass = (age) => {
  if (typeof age !== 'number') return '';
  if (age <= 30) return 'badge-green';
  if (age <= 90) return 'badge-orange';
  return 'badge-red';
};

const resolveAgeInDays = (row) => {
  if (typeof row.ageInDays === 'number') return row.ageInDays;
  const start = row.firstSeenAt || row.createdAt;
  if (!start) return null;
  const isResolved = row.status === 'resolved' || row.status === 'closed';
  const end = isResolved && row.resolvedAt ? row.resolvedAt : new Date();
  return Math.max(0, Math.floor((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)));
};

const ageBadge = (row) => {
  const age = resolveAgeInDays(row);
  if (age === null || age === undefined) return '-';
  return (
    <span
      className={`badge age-badge ${getAgeClass(age)}`}
      title={[
        `First seen: ${formatTimestamp(row.firstSeenAt)}`,
        `Last seen: ${formatTimestamp(row.lastSeenAt)}`,
        row.resolvedAt ? `Resolved at: ${formatTimestamp(row.resolvedAt)}` : '',
      ].filter(Boolean).join('\n')}
    >
      {age}d
    </span>
  );
};

// ─── Filters config ──────────────────────────────────────────────────────────

const filters = [
  { key: 'search', label: 'Search', placeholder: 'Plugin, CVE, host, MITRE…', type: 'search' },
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
  { key: 'host', label: 'Host', placeholder: 'Host or IP', type: 'search' },
  {
    key: 'ageBucket',
    label: 'Age',
    type: 'select',
    options: [
      { value: 'all', label: 'All ages' },
      { value: '30', label: 'Age > 30 days' },
      { value: '90', label: 'Age > 90 days' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

const Vulnerabilities = () => {
  const navigate = useNavigate();
  const canManageRecords = hasRole('admin', 'analyst');
  const canDeleteRecords = hasRole('admin');

  const [rows, setRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState(new Set());
  const [filterValues, setFilterValues] = useState({
    severity: 'all', status: 'all', search: '', host: '', ageBucket: 'all',
  });
  const [sortBy, setSortBy] = useState('severity');
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
      const query = { ...filterValues, page: nextPage, limit, sortBy, sortOrder };
      if (filterValues.ageBucket !== 'all') query.minAge = filterValues.ageBucket;
      delete query.ageBucket;
      const payload = await getVulnerabilities(query);
      setRows(payload.data || []);
      setTotal(payload.total || 0);
      setPages(payload.pages || 1);
      setPage(payload.page || nextPage);
    } catch (requestError) {
      if (requestError.response?.status === 401) return;
      const message = getApiErrorMessage(requestError, 'Failed to load vulnerabilities.');
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
    if (!canManageRecords) return toast.error('Only admins and analysts can import Nessus findings.');
    try {
      setPreviewLoading(true);
      const preview = await previewNessusFindings();
      setPreviewRows(preview);
      setSelectedPreviewIds(new Set());
      toast.success(`${preview.length} Nessus findings ready for review.`);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to connect to Nessus.'));
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
    if (!items.length) return toast.info('Select at least one Nessus finding first.');
    try {
      setSubmitting(true);
      const payload = await importVulnerabilities(items);
      toast.success(`${payload.imported} vulnerabilities saved.`);
      setSelectedPreviewIds(new Set());
      await fetchRows(1);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to save selected vulnerabilities.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (row) => {
    try {
      await closeVulnerability(row._id);
      toast.success('Vulnerability closed.');
      await fetchRows(page);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to update vulnerability status.'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete vulnerability "${row.title}"?`)) return;
    try {
      await deleteVulnerability(row._id);
      toast.success('Vulnerability deleted.');
      await fetchRows(page);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to delete vulnerability.'));
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
  const highPriorityCount = rows.filter((row) =>
    ['critical', 'high'].includes(row.severity?.toLowerCase())
  ).length;

  // ─── Columns ──────────────────────────────────────────────────────────────

  const columns = [
    { key: 'title', label: 'Finding', sortable: true },
    {
      key: 'severity', label: 'Severity', sortable: true,
      render: (row) => <SeverityBadge value={row.severity} />,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'ageInDays', label: 'Age', sortable: true,
      render: (row) => ageBadge(row),
    },
    {
      key: 'host', label: 'Host', sortable: true,
      render: (row) => row.host || '-',
    },
    {
      key: 'port', label: 'Port', sortable: true,
      render: (row) => row.port !== undefined && row.port !== null && row.port !== '' ? String(row.port) : '-',
    },
    { key: 'cve', label: 'CVE', render: (row) => arrayText(row.cve) },
    { key: 'mitreTactic', label: 'MITRE', render: (row) => arrayText(row.mitreTactic) },
    { key: 'solution', label: 'Solution', render: (row) => row.solution || '-' },
    {
      key: 'actions', label: 'Actions',
      render: (row) => (
        <div className="row-actions">
          {canManageRecords && (
            <>
              <button type="button" className="secondary-button" onClick={() => navigate(`/vulnerabilities/${row._id}/edit`)}>Edit</button>
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
    { key: 'title', label: 'Plugin' },
    { key: 'severity', label: 'Severity', render: (row) => <SeverityBadge value={row.severity} /> },
    { key: 'host', label: 'Host', render: (row) => row.host || '-' },
    {
      key: 'port', label: 'Port',
      render: (row) => row.port !== undefined && row.port !== null && row.port !== '' ? String(row.port) : '-',
    },
    { key: 'cve', label: 'CVE', render: (row) => arrayText(row.cve) },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="page wide-page">
      <PageHeader
        eyebrow="Exposure Management"
        title="Vulnerabilities"
        description="Track Nessus findings, asset exposure, MITRE mapping, and remediation status."
        meta={
          <div className="page-meta-badges">
            <span className="page-meta-pill">{total} tracked findings</span>
            <span className="page-meta-pill">{previewRows.length} preview rows</span>
          </div>
        }
        actions={
          canManageRecords && (
            <>
              <button type="button" className="secondary-button" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? 'Connecting…' : 'Connect to Nessus'}
              </button>
              <Link className="add-button" to="/add-vulnerability">Add Vulnerability</Link>
            </>
          )
        }
      />

      {/* Stat cards */}
      <section className="stats-grid stats-grid--compact">
        <StatCard label="Visible findings" value={rows.length} helper="Current page results" icon={Bug} accent="cyan" />
        <StatCard label="Open findings" value={openCount} helper="Needs remediation" icon={ShieldAlert} accent="blue" />
        <StatCard label="High priority" value={highPriorityCount} helper="Critical and high severity" icon={Target} accent="teal" />
        <StatCard label="Selected preview" value={selectedPreviewIds.size} helper="Queued Nessus imports" icon={Waypoints} accent="cyan" />
      </section>

      {/* Charts */}
      {!loading && rows.length > 0 && (
        <section className="charts-row">
          {/* Severity donut */}
          <article className="panel chart-card">
            <div>
              <span className="chart-kicker">Distribution</span>
              <p className="chart-title">Severity Breakdown</p>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%" cy="50%"
                    innerRadius={38} outerRadius={68}
                    dataKey="value"
                    labelLine={false}
                  >
                    {severityChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11, color: '#9fb2cc' }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Status donut */}
          <article className="panel chart-card">
            <div>
              <span className="chart-kicker">Remediation</span>
              <p className="chart-title">Status Breakdown</p>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%" cy="50%"
                    innerRadius={38} outerRadius={68}
                    dataKey="value"
                    labelLine={false}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11, color: '#9fb2cc' }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Bar chart */}
          <article className="panel chart-card" style={{ gridColumn: 'span 2' }}>
            <div>
              <span className="chart-kicker">Count by severity</span>
              <p className="chart-title">Findings Distribution</p>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: '#9fb2cc', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9fb2cc', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      )}

      {previewLoading && <Loader label="Fetching Nessus preview…" />}

      {previewRows.length > 0 && (
        <section className="panel preview-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">External preview</span>
              <h2>Nessus Preview</h2>
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
          <DataTable columns={previewColumns} rows={previewRows} emptyMessage="No Nessus findings found." />
        </section>
      )}

      {loading && <Loader label="Loading vulnerabilities…" />}
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
          emptyMessage="No vulnerabilities found."
        />
      )}
    </main>
  );
};

export default Vulnerabilities;
