/**
 * Page formulaire Incident.
 *
 * Role architectural:
 * - Sert a creer ou modifier un incident manuel.
 * - Prepare les champs dans le format attendu par l'API backend.
 */
// Hooks React pour lifecycle, memoisation et etat.
import { useEffect, useMemo, useState } from 'react';
// Routing: lien retour, navigation apres sauvegarde, id depuis l'URL.
import { Link, useNavigate, useParams } from 'react-router-dom';
// Notifications utilisateur.
import { toast } from 'react-toastify';
// Loader de chargement.
import Loader from '../components/Loader';
// Service API incidents.
import { createIncident, getIncident, updateIncident } from '../services/incidentService';
// Helper pour messages d'erreur backend.
import { getApiErrorMessage } from '../services/api';

// Valeurs initiales en mode creation.
const defaultForm = {
  title: '',
  description: '',
  severity: 'medium',
  status: 'open',
  host: '',
  port: '',
  cve: '',
  mitreTactic: '',
  solution: '',
};

// Transforme un tableau MongoDB en chaine editable.
const arrayToInput = (value) => (Array.isArray(value) ? value.join(', ') : value || '');

// Transforme une chaine separee par virgules en tableau.
const inputToArray = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// Composant React du formulaire incident.
const IncidentFormPage = () => {
  // id est present en edition.
  const { id } = useParams();
  // Navigation apres succes.
  const navigate = useNavigate();
  // Booleen derive pour choisir create/update.
  const isEditing = Boolean(id);
  // Etat controle de tous les champs du formulaire.
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Charge l'incident existant si on edite.
  useEffect(() => {
    // En creation, on garde defaultForm.
    if (!isEditing) return;

    const loadIncident = async () => {
      try {
        setLoading(true);
        // Appel API: GET /api/incidents/:id.
        const incident = await getIncident(id);
        setFormData({
          title: incident.title || '',
          description: incident.description || '',
          severity: incident.severity || 'medium',
          status: incident.status || 'open',
          host: incident.host || incident.agentIP || '',
          port: incident.port || '',
          cve: arrayToInput(incident.cve),
          mitreTactic: arrayToInput(incident.mitreTactic),
          solution: incident.solution || '',
        });
      } catch (error) {
        const message = getApiErrorMessage(error, 'Failed to load incident.');
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadIncident();
  }, [id, isEditing]);

  // Payload envoye a l'API: convertit port et tableaux.
  const payload = useMemo(() => ({
    ...formData,
    port: formData.port === '' ? undefined : Number(formData.port),
    cve: inputToArray(formData.cve),
    mitreTactic: inputToArray(formData.mitreTactic),
  }), [formData]);

  // Met a jour un champ controle.
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  // Soumet create ou update.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      // En edition on appelle PUT, sinon POST.
      if (isEditing) {
        await updateIncident(id, payload);
        toast.success('Incident updated.');
      } else {
        await createIncident(payload);
        toast.success('Incident created.');
      }
      navigate('/incidents');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to save incident.');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page form-page">
      <section className="page-header">
        <div>
          <h1>{isEditing ? 'Edit Incident' : 'Add Incident'}</h1>
          <p>Capture triage context, affected asset details, indicators, and remediation guidance.</p>
        </div>
        <Link className="secondary-button" to="/incidents">Back to incidents</Link>
      </section>

      {loading && <Loader label="Loading incident..." />}

      {!loading && (
        <form className="panel record-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="span-2">
              Title
              <input name="title" value={formData.title} onChange={handleChange} required placeholder="Suspicious PowerShell execution" />
            </label>

            <label>
              Severity
              <select name="severity" value={formData.severity} onChange={handleChange}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>

            <label>
              Status
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>

            <label>
              Host / IP
              <input name="host" value={formData.host} onChange={handleChange} placeholder="10.0.4.21" />
            </label>

            <label>
              Port
              <input type="number" min="0" max="65535" name="port" value={formData.port} onChange={handleChange} placeholder="443" />
            </label>

            <label>
              CVE
              <input name="cve" value={formData.cve} onChange={handleChange} placeholder="CVE-2024-0001, CVE-2024-0002" />
            </label>

            <label>
              MITRE Tactic
              <input name="mitreTactic" value={formData.mitreTactic} onChange={handleChange} placeholder="Execution, Persistence" />
            </label>

            <label className="span-2">
              Description
              <textarea name="description" value={formData.description} onChange={handleChange} rows="5" placeholder="What happened, where it was detected, and analyst notes." />
            </label>

            <label className="span-2">
              Solution
              <textarea name="solution" value={formData.solution} onChange={handleChange} rows="4" placeholder="Containment and remediation steps." />
            </label>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="form-actions">
            <Link className="secondary-button" to="/incidents">Cancel</Link>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Incident'}</button>
          </div>
        </form>
      )}
    </main>
  );
};

export default IncidentFormPage;
