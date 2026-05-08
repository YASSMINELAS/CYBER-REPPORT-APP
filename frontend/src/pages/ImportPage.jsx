/**
 * Page Import legacy.
 *
 * Role architectural:
 * - Ancienne interface d'import direct.
 * - Le backend renvoie maintenant 410 pour encourager le flux preview -> selection -> save.
 *
 * Importance pedagogique:
 * - Montre comment une fonctionnalite peut etre conservee tout en etant neutralisee cote API.
 */
// useState gere source, chargement et resultat.
import { useState } from 'react';
// Notifications utilisateur.
import { toast } from 'react-toastify';
// Loader d'attente.
import Loader from '../components/Loader';
// Client API centralise.
import api, { getApiErrorMessage } from '../services/api';

// Composant React de l'import manuel.
const ImportPage = () => {
  // Source selectionnee par l'utilisateur.
  const [source, setSource] = useState('wazuh');
  // Etat loading pour desactiver le bouton.
  const [loading, setLoading] = useState(false);
  // Resultat affiche apres l'appel API.
  const [result, setResult] = useState(null);

  // Lance l'appel d'import direct.
  const handleImport = async () => {
    try {
      setLoading(true);
      setResult(null);
      // Appel API: POST /api/import, actuellement desactive cote backend.
      const response = await api.post('/import', { source });
      setResult(response.data);
      toast.success(`${response.data.imported || 0} ${source} records imported.`);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Import failed. Check integration settings.');
      toast.error(message);
      setResult({ source, imported: 0, error: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Import Scan</h1>
          <p>Manually ingest alerts from Wazuh or scan findings from Nessus.</p>
        </div>
      </section>

      <section className="panel import-panel">
        <label className="filter-control">
          Source
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="wazuh">Wazuh</option>
            <option value="nessus">Nessus</option>
          </select>
        </label>
        <button type="button" onClick={handleImport} disabled={loading}>
          {loading ? 'Importing...' : 'Import Scan'}
        </button>
      </section>

      {loading && <Loader label={`Importing ${source} records...`} />}

      {result && (
        <section className={`panel import-result${result.error ? ' error-message' : ''}`}>
          <h2>Import Result</h2>
          <div className="metric-row">
            <span>Source</span>
            <strong>{result.source}</strong>
          </div>
          <div className="metric-row">
            <span>Fetched</span>
            <strong>{result.fetched || 0}</strong>
          </div>
          <div className="metric-row">
            <span>Imported</span>
            <strong>{result.imported || result.inserted || 0}</strong>
          </div>
          {result.error && <p className="error-text">{result.error}</p>}
        </section>
      )}
    </main>
  );
};

export default ImportPage;
