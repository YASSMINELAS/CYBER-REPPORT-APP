/**
 * Service frontend des incidents.
 *
 * Role architectural:
 * - Regroupe les appels Axios vers /api/incidents et /api/external/wazuh.
 * - Fournit une interface simple aux pages React.
 */
// Client Axios centralise avec JWT.
import api from './api';

// Transforme les filtres UI en query string HTTP.
const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.set(key, value);
    }
  });

  return query.toString();
};

// GET /incidents: liste paginee/filtre.
export const getIncidents = async (params) => {
  const query = buildQuery(params);
  const response = await api.get(`/incidents${query ? `?${query}` : ''}`);
  return response.data;
};

// GET /incidents/:id: detail d'un incident.
export const getIncident = async (id) => {
  const response = await api.get(`/incidents/${id}`);
  return response.data;
};

// POST /incidents: creation manuelle.
export const createIncident = async (payload) => {
  const response = await api.post('/incidents', payload);
  return response.data;
};

// PUT /incidents/:id: mise a jour.
export const updateIncident = async (id, payload) => {
  const response = await api.put(`/incidents/${id}`, payload);
  return response.data;
};

// PATCH /incidents/:id/status: fermeture/resolution.
export const closeIncident = async (id) => {
  const response = await api.patch(`/incidents/${id}/status`, { status: 'closed' });
  return response.data;
};

// DELETE /incidents/:id: suppression admin.
export const deleteIncident = async (id) => {
  const response = await api.delete(`/incidents/${id}`);
  return response.data;
};

// GET /external/wazuh/preview: previsualise les alertes Wazuh normalisees.
export const previewWazuhAlerts = async () => {
  const response = await api.get('/external/wazuh/preview');
  return response.data;
};

// POST /incidents/import: sauvegarde les alertes selectionnees.
export const importIncidents = async (items) => {
  const response = await api.post('/incidents/import', { items });
  return response.data;
};
