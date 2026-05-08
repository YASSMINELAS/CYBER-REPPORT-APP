/**
 * Composant de protection des routes privees.
 *
 * Role architectural:
 * - Verifie qu'un JWT existe et n'est pas expire.
 * - Affiche AppLayout si l'utilisateur est connecte.
 * - Redirige vers /login sinon.
 */
// Navigate effectue une redirection React Router.
import { Navigate } from 'react-router-dom';
// Helpers auth: token localStorage et verification expiration.
import { clearAuth, getToken, isTokenExpired } from '../services/api';
// Layout prive affiche pour toutes les pages authentifiees.
import AppLayout from '../layouts/AppLayout';

// Guard React Router utilise comme route parente dans App.jsx.
const ProtectedRoute = () => {
  // Lecture du token JWT stocke cote frontend.
  const token = getToken();

  // Condition importante: pas de token ou token expire => retour login.
  if (!token || isTokenExpired(token)) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  // Si la session est valide, on affiche le layout contenant l'Outlet des pages.
  return <AppLayout />;
};

export default ProtectedRoute;
