import axios from 'axios';
import { toast } from 'react-toastify';
import keycloak from '../keycloak';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// utilisateur courant
export const getCurrentUser = () => {
  if (!keycloak.tokenParsed) {
    return null;
  }

  const roles = keycloak.tokenParsed?.realm_access?.roles || [];

  return {
    id: keycloak.tokenParsed.sub,
    username: keycloak.tokenParsed.preferred_username,
    role:
      ['admin', 'analyst', 'viewer'].find((r) => roles.includes(r)) ||
      'viewer',
  };
};

// RBAC frontend
export const hasRole = (...allowedRoles) => {
  const user = getCurrentUser();

  return Boolean(user && allowedRoles.includes(user.role));
};

// helper erreurs
export const getApiErrorMessage = (
  error,
  fallback = 'Something went wrong. Please try again.'
) => error.response?.data?.message || fallback;

// ajoute automatiquement le token Keycloak
api.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    await keycloak.updateToken(30);

    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }

  return config;
});

// gestion session expirée
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      toast.error('Session expired');

      await keycloak.login();
    }

    return Promise.reject(error);
  }
);

export default api;