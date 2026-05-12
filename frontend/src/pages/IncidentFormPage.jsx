import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import Loader from '../components/Loader';
import PageHeader from '../components/PageHeader';
import { getApiErrorMessage } from '../services/api';
import {
  createIncident,
  getIncident,
  updateIncident,
} from '../services/incidentService';

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

const arrayToInput = (value) =>
  Array.isArray(value) ? value.join(', ') : value || '';

const inputToArray = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const IncidentFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing) return;

    const loadIncident = async () => {
      try {
        setLoading(true);
        const incident = await getIncident(id);
        setFormData({
          title: incident.title || '',
          description: incident.description || '',
          severity: incident.severity || 'medium',
          status: incident.status || 'open',
          host: incident.host || incident.agentIP || '',
          port: incident.port || '',
          cve: arrayToInput(incident.cve),
          mitreTactic: arrayToInput(
            incident.mitreTactic
          ),
          solution: incident.solution || '',
        });
      } catch (requestError) {
        const message = getApiErrorMessage(
          requestError,
          'Failed to load incident.'
        );
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadIncident();
  }, [id, isEditing]);

  const payload = useMemo(
    () => ({
      ...formData,
      port:
        formData.port === ''
          ? undefined
          : Number(formData.port),
      cve: inputToArray(formData.cve),
      mitreTactic: inputToArray(formData.mitreTactic),
    }),
    [formData]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isEditing) {
        await updateIncident(id, payload);
        toast.success('Incident updated.');
      } else {
        await createIncident(payload);
        toast.success('Incident created.');
      }
      navigate('/incidents');
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        'Failed to save incident.'
      );
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page form-page">
      <PageHeader
        eyebrow="Incident Intake"
        title={
          isEditing ? 'Edit Incident' : 'Add Incident'
        }
        description="Capture triage context, impacted assets, MITRE mapping, and remediation guidance while keeping the existing API behavior intact."
        actions={
          <Link
            className="secondary-button"
            to="/incidents"
          >
            Back to incidents
          </Link>
        }
      />

      {loading && (
        <Loader label="Loading incident..." />
      )}

      {!loading && (
        <section className="form-layout">
          <aside className="panel form-sidebar">
            <span className="section-kicker">
              Analyst guidance
            </span>
            <h2>Make the incident easy to triage.</h2>
            <p>
              Capture what happened, which asset
              is affected, the current response
              state, and the action plan for
              containment or remediation.
            </p>
            <div className="form-hint-list">
              <div className="form-hint">
                <strong>Status</strong>
                <span>
                  Keep response state aligned
                  with analyst workflow.
                </span>
              </div>
              <div className="form-hint">
                <strong>Description</strong>
                <span>
                  Preserve investigation notes
                  and detection context.
                </span>
              </div>
              <div className="form-hint">
                <strong>Solution</strong>
                <span>
                  Capture containment or
                  remediation next steps.
                </span>
              </div>
            </div>
          </aside>

          <form
            className="panel record-form"
            onSubmit={handleSubmit}
          >
            <div className="form-grid">
              <label className="span-2">
                Title
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Suspicious PowerShell execution"
                />
              </label>

              <label>
                Severity
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">
                    Critical
                  </option>
                </select>
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="resolved">
                    Resolved
                  </option>
                </select>
              </label>

              <label>
                Host / IP
                <input
                  name="host"
                  value={formData.host}
                  onChange={handleChange}
                  placeholder="10.0.4.21"
                />
              </label>

              <label>
                Port
                <input
                  type="number"
                  min="0"
                  max="65535"
                  name="port"
                  value={formData.port}
                  onChange={handleChange}
                  placeholder="443"
                />
              </label>

              <label>
                CVE
                <input
                  name="cve"
                  value={formData.cve}
                  onChange={handleChange}
                  placeholder="CVE-2024-0001, CVE-2024-0002"
                />
              </label>

              <label>
                MITRE Tactic
                <input
                  name="mitreTactic"
                  value={formData.mitreTactic}
                  onChange={handleChange}
                  placeholder="Execution, Persistence"
                />
              </label>

              <label className="span-2">
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="6"
                  placeholder="What happened, where it was detected, and analyst notes."
                />
              </label>

              <label className="span-2">
                Solution
                <textarea
                  name="solution"
                  value={formData.solution}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Containment and remediation steps."
                />
              </label>
            </div>

            {error && (
              <p className="error-text">{error}</p>
            )}

            <div className="form-actions">
              <Link
                className="secondary-button"
                to="/incidents"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Incident'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
};

export default IncidentFormPage;
