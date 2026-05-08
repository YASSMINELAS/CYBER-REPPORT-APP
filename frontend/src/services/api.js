/**
 * Client API Axios centralise.
 *
 * Role architectural:
 * - Configure l'URL du backend.
 * - Gere le token JWT cote frontend.
 * - Ajoute automatiquement Authorization aux requetes.
 * - Redirige vers /login si le backend renvoie 401.
 *
 * Point securite:
 * - Le token est actuellement stocke en localStorage; simple pour apprentissage,
 *   mais un cookie HttpOnly serait preferable en production contre le XSS.
 */
// Axios execute les appels HTTP vers Express.
import axios from 'axios';
// toast affiche les erreurs/session expiree a l'utilisateur.
import { toast } from 'react-toastify';

// Instance Axios partagee par tous les services frontend.
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Cle localStorage utilisee pour persister le JWT.
export const TOKEN_KEY = 'token';

// Lit le JWT courant.
export const getToken = () => localStorage.getItem(TOKEN_KEY);

// Supprime la session locale.
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// Stocke le JWT apres login.
export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Decode le payload JWT cote client pour lire username/role/expiration.
export const getTokenPayload = () => {
  const token = getToken();

  if (!token) {
    // Sans token, aucun utilisateur connecte.
    return null;
  }

  try {
    // atob decode la partie payload du JWT; aucune verification cryptographique cote client.
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

// Retourne l'utilisateur courant sous une forme stable pour l'UI.
export const getCurrentUser = () => {
  const payload = getTokenPayload();

  if (!payload) {
    return null;
  }

  return {
    id: payload.id,
    username: payload.username || 'User',
    role: ['admin', 'analyst', 'viewer'].includes(payload.role) ? payload.role : 'viewer',
  };
};

// Helper RBAC cote UI: cache/affiche des boutons selon le role.
export const hasRole = (...allowedRoles) => {
  const user = getCurrentUser();
  return Boolean(user && allowedRoles.includes(user.role));
};

// Extrait un message d'erreur lisible depuis une erreur Axios.
export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error.response?.data?.message || fallback;

// Verifie l'expiration du JWT pour eviter d'afficher une session invalide.
export const isTokenExpired = (token) => {
  if (!token) {
    return true;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 <= Date.now() : false;
  } catch {
    return true;
  }
};

// Intercepteur de requete: ajoute Authorization: Bearer <token>.
api.interceptors.request.use((config) => {
  const token = getToken();

  // Condition importante: sans token, les routes publiques restent appelables.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Intercepteur de reponse: traite globalement les 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 signifie token manquant, invalide ou expire cote backend.
    if (error.response?.status === 401) {
      clearAuth();
      toast.error('Session expired. Please log in again.');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
