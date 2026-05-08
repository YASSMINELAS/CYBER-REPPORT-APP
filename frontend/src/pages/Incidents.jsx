/**
 * Page Incidents.
 *
 * Role architectural:
 * - Liste les incidents avec filtres, tri et pagination.
 * - Permet la preview Wazuh puis l'import des alertes selectionnees.
 * - Applique les permissions UI selon le role utilisateur.
 */
// Hooks React pour etat, effets et callbacks stables.
import { useCallback, useEffect, useState } from 'react';
// Link cree des liens; useNavigate redirige vers les formulaires edit.
import { Link, useNavigate } from 'react-router-dom';
// Notifications utilisateur.
import { toast } from 'react-toastify';
// Composants UI de table, chargement et badge.
import DataTable from '../components/data/DataTable';
import Loader from '../components/Loader';
import SeverityBadge from '../components/SeverityBadge';
// Helpers auth/erreur.
import { getApiErrorMessage, hasRole } from '../services/api';
// Service API incidents: encapsule les appels Axios.
import {
  closeIncident,
  deleteIncident,
  getIncidents,
  importIncidents,
  previewWazuhAlerts,
} from '../services/incidentService';

// Taille de page envoyee au backend.
const limit = 20;

// Petits render helpers pour garder les colonnes lisibles.
const statusBadge = (status) => <span className={`badge status-${status || 'open'}`}>{status || 'open'}</span>;
const arrayText = (value) => (Array.isArray(value) && value.length ? value.join(', ') : '-');
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-');

const filters = [
  { key: 'search', label: 'Search', placeholder: 'Title, host, CVE, MITRE...', type: 'search' },
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

// Composant React principal de la page incidents.
const Incidents = () => {
  // Navigation programmee vers les pages d'edition.
  const navigate = useNavigate();
  // Permissions UI: le backend reste la vraie protection, l'UI cache juste les actions.
  const canManageRecords = hasRole('admin', 'analyst');
  const canDeleteRecords = hasRole('admin');
  // Donnees principales de la table.
  const [rows, setRows] = useState([]);
  // Donnees de preview Wazuh avant sauvegarde.
  const [previewRows, setPreviewRows] = useState([]);
  // Set des externalId selectionnes dans la preview.
  const [selectedPreviewIds, setSelectedPreviewIds] = useState(new Set());
  // Etat des filtres controle par DataTable.
  const [filterValues, setFilterValues] = useState({ severity: 'all', status: 'all', search: '', agent: '', from: '', to: '' });
  // Etat du tri envoye au backend.
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Charge une page d'incidents depuis l'API.
  const fetchRows = useCallback(async (nextPage = 1) => {
    try {
      setLoading(true);
      setError('');
      // Appel API: GET /api/incidents avec filtres/pagination/tri.
      const payload = await getIncidents({ ...filterValues, page: nextPage, limit, sortBy, sortOrder });
      setRows(payload.data || []);
      setTotal(payload.total || 0);
      setPages(payload.pages || 1);
      setPage(payload.page || nextPage);
    } catch (error) {
      if (error.response?.status === 401) return;
      const message = getApiErrorMessage(error, 'Failed to load incidents.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filterValues, sortBy, sortOrder]);

  // Recharge automatiquement lorsque filtres ou tri changent.
  useEffect(() => {
    fetchRows(1);
  }, [filterValues, sortBy, sortOrder, fetchRows]);

  const handleFilterChange = (key, value) => {
    // Manipulation d'etat React: mise a jour immuable d'un filtre.
    setFilterValues((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const handleSort = (columnKey, order) => {
    setSortBy(columnKey);
    setSortOrder(order);
    setPage(1);
  };

  const handlePreview = async () => {
    // Condition importante: l'UI bloque les roles non autorises avant l'appel backend.
    if (!canManageRecords) return toast.error('Only admins and analysts can import Wazuh alerts.');

    try {
      setPreviewLoading(true);
      // Appel API: GET /api/external/wazuh/preview.
      const preview = await previewWazuhAlerts();
      setPreviewRows(preview);
      setSelectedPreviewIds(new Set());
      toast.success(`${preview.length} Wazuh alerts ready for review.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to connect to Wazuh.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const togglePreviewRow = (externalId) => {
    // Set est clone pour respecter l'immutabilite de l'etat React.
    setSelectedPreviewIds((current) => {
      const next = new Set(current);
      next.has(externalId) ? next.delete(externalId) : next.add(externalId);
      return next;
    });
  };

  const saveSelected = async () => {
    // Donnees sortantes: seuls les elements selectionnes sont envoyes au backend.
    const items = previewRows.filter((row) => selectedPreviewIds.has(row.externalId));
    if (!items.length) return toast.info('Select at least one Wazuh alert first.');

    try {
      setSubmitting(true);
      // Appel API: POST /api/incidents/import.
      const payload = await importIncidents(items);
      toast.success(`${payload.imported} incidents saved.`);
      setSelectedPreviewIds(new Set());
      await fetchRows(1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save selected incidents.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (row) => {
    try {
      // Appel API: PATCH /api/incidents/:id/status.
      await closeIncident(row._id);
      toast.success('Incident closed.');
      await fetchRows(page);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update incident status.'));
    }
  };

  const handleDelete = async (row) => {
    // Confirmation navigateur avant action destructive.
    if (!window.confirm(`Delete incident "${row.title}"?`)) return;

    try {
      await deleteIncident(row._id);
      toast.success('Incident deleted.');
      await fetchRows(page);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete incident.'));
    }
  };

  const columns = [
    // Configuration declarative des colonnes de DataTable.
    { key: 'title', label: 'Incident', sortable: true },
    { key: 'severity', label: 'Severity', sortable: true, render: (row) => <SeverityBadge value={row.severity} /> },
    { key: 'status', label: 'Status', sortable: true, render: (row) => statusBadge(row.status) },
    { key: 'host', label: 'Host / IP', sortable: true, render: (row) => row.host || row.agentIP || '-' },
    { key: 'port', label: 'Port', sortable: true, render: (row) => row.port || '-' },
    { key: 'cve', label: 'CVE', render: (row) => arrayText(row.cve) },
    { key: 'mitreTactic', label: 'MITRE', render: (row) => arrayText(row.mitreTactic) },
    { key: 'timestamp', label: 'Time', sortable: true, render: (row) => formatDate(row.timestamp || row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="row-actions">
          {canManageRecords && (
            <>
              <button type="button" className="secondary-button" onClick={() => navigate(`/incidents/${row._id}/edit`)}>
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
    { key: 'title', label: 'Rule' },
    { key: 'severity', label: 'Severity', render: (row) => <SeverityBadge value={row.severity} /> },
    { key: 'agentName', label: 'Agent', render: (row) => row.agentName || '-' },
    { key: 'agentIP', label: 'IP', render: (row) => row.agentIP || '-' },
    { key: 'mitreTactic', label: 'MITRE', render: (row) => arrayText(row.mitreTactic) },
  ];

  return (
    <main className="page wide-page">
      <section className="page-header">
        <div>
          <h1>Incidents</h1>
          <p>Investigate Wazuh alerts, track response status, and maintain remediation context.</p>
        </div>
        {canManageRecords && (
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={handlePreview} disabled={previewLoading}>
              {previewLoading ? 'Connecting...' : 'Connect to Wazuh'}
            </button>
            <Link className="add-button" to="/add-incident">+ Add Incident</Link>
          </div>
        )}
      </section>

      {previewLoading && <Loader label="Fetching Wazuh preview..." />}
      {previewRows.length > 0 && (
        <section className="panel preview-panel">
          <div className="panel-heading">
            <div>
              <h2>Wazuh Preview</h2>
              <p>{selectedPreviewIds.size} of {previewRows.length} selected</p>
            </div>
            <button type="button" onClick={saveSelected} disabled={submitting || selectedPreviewIds.size === 0}>
              {submitting ? 'Saving...' : 'Save Selected'}
            </button>
          </div>
          <DataTable columns={previewColumns} rows={previewRows} emptyMessage="No Wazuh alerts found." />
        </section>
      )}

      {loading && <Loader label="Loading incidents..." />}
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
