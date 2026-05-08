/**
 * Page Vulnerabilities.
 *
 * Role architectural:
 * - Liste les vulnerabilites avec filtres, tri et pagination.
 * - Permet la preview Nessus puis l'import des findings selectionnes.
 * - Affiche le lifecycle open/resolved et l'age des vulnerabilites.
 */
// Hooks React pour etat, effet et callback stable.
import { useCallback, useEffect, useState } from 'react';
// Link cree des liens; useNavigate ouvre les formulaires edit.
import { Link, useNavigate } from 'react-router-dom';
// Notifications utilisateur.
import { toast } from 'react-toastify';
// Composants UI de table, chargement et badges.
import DataTable from '../components/data/DataTable';
import Loader from '../components/Loader';
import SeverityBadge from '../components/SeverityBadge';
// Helpers auth/erreur.
import { getApiErrorMessage, hasRole } from '../services/api';
// Service API vulnerabilities/Nessus.
import {
  closeVulnerability,
  deleteVulnerability,
  getVulnerabilities,
  importVulnerabilities,
  previewNessusFindings,
} from '../services/vulnerabilityService';

// Nombre de lignes par page demande au backend.
const limit = 20;

// Helpers de rendu pour garder les colonnes declaratives.
const statusBadge = (status) => <span className={`badge status-${status || 'open'}`}>{status || 'open'}</span>;
const arrayText = (value) => (Array.isArray(value) && value.length ? value.join(', ') : '-');
const formatTimestamp = (value) => (value ? new Date(value).toLocaleString() : '-');
const getAgeClass = (age) => {
  // Code couleur pedagogique: plus l'age est eleve, plus le risque operationnel augmente.
  if (typeof age !== 'number') return '';
  if (age <= 30) return 'badge-green';
  if (age <= 90) return 'badge-orange';
  return 'badge-red';
};

// Rendu du badge d'age avec infobulle firstSeen/lastSeen.
const ageBadge = (row) => {
  if (typeof row.ageInDays !== 'number') {
    return '-';
  }

  return (
    <span
      className={`badge age-badge ${getAgeClass(row.ageInDays)}`}
      title={`First seen: ${formatTimestamp(row.firstSeenAt)}\nLast seen: ${formatTimestamp(row.lastSeenAt)}`}
    >
      {row.ageInDays} d
    </span>
  );
};

// Configuration des filtres envoyes a DataTable.
const filters = [
  { key: 'search', label: 'Search', placeholder: 'Plugin, CVE, host, MITRE...', type: 'search' },
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

// Composant React principal de la page vulnerabilities.
const Vulnerabilities = () => {
  // Navigation vers formulaire d'edition.
  const navigate = useNavigate();
  // Permissions UI basees sur le role decode du JWT.
  const canManageRecords = hasRole('admin', 'analyst');
  const canDeleteRecords = hasRole('admin');
  // Etat de la table principale.
  const [rows, setRows] = useState([]);
  // Etat de la preview Nessus avant import.
  const [previewRows, setPreviewRows] = useState([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState(new Set());
  const [filterValues, setFilterValues] = useState({ severity: 'all', status: 'all', search: '', host: '', ageBucket: 'all' });
  const [sortBy, setSortBy] = useState('severity');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Charge les vulnerabilites depuis le backend.
  const fetchRows = useCallback(async (nextPage = 1) => {
    try {
      setLoading(true);
      setError('');
      const query = {
        ...filterValues,
        page: nextPage,
        limit,
        sortBy,
        sortOrder,
      };

      if (filterValues.ageBucket !== 'all') {
        // Transforme le filtre UI "Age > N jours" en query backend minAge.
        query.minAge = filterValues.ageBucket;
      }

      // ageBucket est un concept UI, pas un parametre direct du backend.
      delete query.ageBucket;

      // Appel API: GET /api/vulnerabilities.
      const payload = await getVulnerabilities(query);
      setRows(payload.data || []);
      setTotal(payload.total || 0);
      setPages(payload.pages || 1);
      setPage(payload.page || nextPage);
    } catch (error) {
      if (error.response?.status === 401) return;
      const message = getApiErrorMessage(error, 'Failed to load vulnerabilities.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filterValues, sortBy, sortOrder]);

  // Recharge la liste quand filtres ou tri changent.
  useEffect(() => {
    fetchRows(1);
  }, [filterValues, sortBy, sortOrder, fetchRows]);

  const handleFilterChange = (key, value) => {
    // Mise a jour immutable d'un champ filtre.
    setFilterValues((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const handleSort = (columnKey, order) => {
    setSortBy(columnKey);
    setSortOrder(order);
    setPage(1);
  };

  const handlePreview = async () => {
    // Protection UX: le backend verifiera aussi le role.
    if (!canManageRecords) return toast.error('Only admins and analysts can import Nessus findings.');

    try {
      setPreviewLoading(true);
      // Appel API: GET /api/external/nessus/preview.
      const preview = await previewNessusFindings();
      setPreviewRows(preview);
      setSelectedPreviewIds(new Set());
      toast.success(`${preview.length} Nessus findings ready for review.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to connect to Nessus.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const togglePreviewRow = (externalId) => {
    // Set clone pour ne pas muter directement l'etat React.
    setSelectedPreviewIds((current) => {
      const next = new Set(current);
      next.has(externalId) ? next.delete(externalId) : next.add(externalId);
      return next;
    });
  };

  const saveSelected = async () => {
    // Envoie uniquement les findings selectionnes par l'analyste.
    const items = previewRows.filter((row) => selectedPreviewIds.has(row.externalId));
    if (!items.length) return toast.info('Select at least one Nessus finding first.');

    try {
      setSubmitting(true);
      // Appel API: POST /api/vulnerabilities/import.
      const payload = await importVulnerabilities(items);
      toast.success(`${payload.imported} vulnerabilities saved.`);
      setSelectedPreviewIds(new Set());
      await fetchRows(1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save selected vulnerabilities.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (row) => {
    try {
      // Appel API: PATCH /api/vulnerabilities/:id/status.
      await closeVulnerability(row._id);
      toast.success('Vulnerability closed.');
      await fetchRows(page);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update vulnerability status.'));
    }
  };

  const handleDelete = async (row) => {
    // Confirmation avant suppression destructive.
    if (!window.confirm(`Delete vulnerability "${row.title}"?`)) return;

    try {
      await deleteVulnerability(row._id);
      toast.success('Vulnerability deleted.');
      await fetchRows(page);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete vulnerability.'));
    }
  };

  const columns = [
    // Colonnes de la table principale.
    { key: 'title', label: 'Finding', sortable: true },
    { key: 'severity', label: 'Severity', sortable: true, render: (row) => <SeverityBadge value={row.severity} /> },
    { key: 'status', label: 'Status', sortable: true, render: (row) => statusBadge(row.status) },
    {
      key: 'ageInDays',
      label: 'AGE (days)',
      sortable: true,
      headerClassName: 'cell-age',
      cellClassName: 'cell-age',
      render: (row) => ageBadge(row),
    },
    { key: 'host', label: 'Host', sortable: true, render: (row) => row.host || '-' },
    { key: 'port', label: 'Port', sortable: true, render: (row) => row.port || '-' },
    { key: 'cve', label: 'CVE', render: (row) => arrayText(row.cve) },
    { key: 'mitreTactic', label: 'MITRE', render: (row) => arrayText(row.mitreTactic) },
    { key: 'solution', label: 'Solution', render: (row) => row.solution || '-' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="row-actions">
          {canManageRecords && (
            <>
              <button type="button" className="secondary-button" onClick={() => navigate(`/vulnerabilities/${row._id}/edit`)}>
                Edit
              </button>
              <button type="button" className="secondary-button" onClick={() => handleClose(row)}>
                Close
              </button>
            </>
          )}
          {canDeleteRecords && (
            <button type="button" className="danger-button" onClick={() => handleDelete(row)}>
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  const previewColumns = [
    {
      key: 'select',
      label: '',
      render: (row) => (
        <input type="checkbox" checked={selectedPreviewIds.has(row.externalId)} onChange={() => togglePreviewRow(row.externalId)} />
      ),
    },
    { key: 'title', label: 'Plugin' },
    { key: 'severity', label: 'Severity', render: (row) => <SeverityBadge value={row.severity} /> },
    { key: 'host', label: 'Host', render: (row) => row.host || '-' },
    { key: 'port', label: 'Port', render: (row) => row.port || '-' },
    { key: 'cve', label: 'CVE', render: (row) => arrayText(row.cve) },
  ];

  return (
    <main className="page wide-page">
      <section className="page-header">
        <div>
          <h1>Vulnerabilities</h1>
          <p>Track Nessus findings, exposure context, MITRE mapping, and remediation status.</p>
        </div>
        {canManageRecords && (
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={handlePreview} disabled={previewLoading}>
              {previewLoading ? 'Connecting...' : 'Connect to Nessus'}
            </button>
            <Link className="add-button" to="/add-vulnerability">+ Add Vulnerability</Link>
          </div>
        )}
      </section>

      {previewLoading && <Loader label="Fetching Nessus preview..." />}
      {previewRows.length > 0 && (
        <section className="panel preview-panel">
          <div className="panel-heading">
            <div>
              <h2>Nessus Preview</h2>
              <p>{selectedPreviewIds.size} of {previewRows.length} selected</p>
            </div>
            <button type="button" onClick={saveSelected} disabled={submitting || selectedPreviewIds.size === 0}>
              {submitting ? 'Saving...' : 'Save Selected'}
            </button>
          </div>
          <DataTable columns={previewColumns} rows={previewRows} emptyMessage="No Nessus findings found." />
        </section>
      )}

      {loading && <Loader label="Loading vulnerabilities..." />}
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
