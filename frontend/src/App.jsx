/**
 * Composant racine de l'application React.
 *
 * Role architectural:
 * - Definit les routes principales avec React Router.
 * - Separe les pages publiques (/login) des pages protegees par ProtectedRoute.
 * - Installe ToastContainer pour les notifications globales.
 */
// Navigate redirige, Route declare une page, Routes regroupe les routes.
import { Navigate, Route, Routes } from 'react-router-dom';
// ToastContainer affiche les notifications declenchees par react-toastify.
import { ToastContainer } from 'react-toastify';
// ProtectedRoute verifie le token avant d'afficher le layout prive.
import ProtectedRoute from './components/ProtectedRoute.jsx';
// Pages principales de l'application.
import Dashboard from './pages/Dashboard.jsx';
import Incidents from './pages/Incidents.jsx';
import IncidentFormPage from './pages/IncidentFormPage.jsx';
import ScanDetails from './pages/ScanDetails.jsx';
import ThreatHunting from './pages/ThreatHunting.jsx';
import Vulnerabilities from './pages/Vulnerabilities.jsx';
import VulnerabilityFormPage from './pages/VulnerabilityFormPage.jsx';
// Styles de la librairie de notifications.
import 'react-toastify/dist/ReactToastify.css';

// App ne gere pas de donnees directement: elle orchestre la navigation.
const App = () => {
  return (
    <>
      {/* Routes React Router: le rendu change selon l'URL. */}
      <Routes>
        {/* Redirection de la racine vers le dashboard. */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* Toutes les routes imbriquees passent par ProtectedRoute. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/threat-hunting" element={<ThreatHunting />} />
          <Route path="/scan-details" element={<ScanDetails />} />
          <Route path="/vulnerabilities" element={<Vulnerabilities />} />
          <Route path="/add-vulnerability" element={<VulnerabilityFormPage />} />
          <Route path="/vulnerabilities/:id/edit" element={<VulnerabilityFormPage />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/add-incident" element={<IncidentFormPage />} />
          <Route path="/incidents/:id/edit" element={<IncidentFormPage />} />
        </Route>
        {/* Fallback: toute URL inconnue revient au dashboard. */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      {/* Zone globale d'affichage des messages succes/erreur. */}
      <ToastContainer
        position="top-right"
        autoClose={2600}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
        toastClassName="app-toast"
      />
    </>
  );
};

export default App;
