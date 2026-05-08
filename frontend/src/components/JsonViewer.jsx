/**
 * Composant JsonViewer.
 *
 * Role architectural:
 * - Affiche les donnees brutes Nessus/Wazuh pour audit et investigation.
 * - Utile en cybersécurité pour garder la trace du signal source.
 */
// data est transforme en JSON formate avec indentation de 2 espaces.
const JsonViewer = ({ data }) => {
  return <pre className="json-viewer">{JSON.stringify(data || {}, null, 2)}</pre>;
};

export default JsonViewer;
