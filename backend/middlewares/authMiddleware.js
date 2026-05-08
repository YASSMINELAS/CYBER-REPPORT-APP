/**
 * Middleware d'authentification via Keycloak.
 * Remplace la verification JWT custom par les tokens Keycloak (RS256).
 * Le RBAC admin/analyst/viewer est conserve via les roles Keycloak.
 */
const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

const normalizeRole = (role) =>
  ['admin', 'analyst', 'viewer'].includes(role) ? role : 'viewer';

// Client JWKS qui recupere la cle publique Keycloak automatiquement.
const jwksClient = jwksRsa({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
});

// Recupere la cle publique depuis Keycloak pour verifier la signature du token.
const getKey = (header, callback) => {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
};

// Middleware principal : verifie le token Keycloak et construit req.user.
const protect = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  jwt.verify(token, getKey, {
    audience: process.env.KEYCLOAK_CLIENT_ID,
    issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    algorithms: ['RS256'],
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    // Keycloak stocke les roles dans realm_access.roles
    const keycloakRoles = decoded?.realm_access?.roles || [];
    const role = ['admin', 'analyst', 'viewer'].find(r => keycloakRoles.includes(r)) || 'viewer';

    req.user = {
      id: decoded.sub,                    // ID Keycloak
      username: decoded.preferred_username,
      role: normalizeRole(role),
    };

    next();
  });
};

// optionalAuth : ne bloque pas si pas de token (utile pour /register).
const optionalAuth = (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) return next();

  jwt.verify(token, getKey, {
    audience: process.env.KEYCLOAK_CLIENT_ID,
    issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    algorithms: ['RS256'],
  }, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Not authorized, token failed' });

    const keycloakRoles = decoded?.realm_access?.roles || [];
    const role = ['admin', 'analyst', 'viewer'].find(r => keycloakRoles.includes(r)) || 'viewer';

    req.user = {
      id: decoded.sub,
      username: decoded.preferred_username,
      role: normalizeRole(role),
    };
    next();
  });
};

// RBAC : identique a avant, aucun changement.
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  return next();
};

module.exports = protect;
module.exports.protect = protect;
module.exports.optionalAuth = optionalAuth;
module.exports.authorize = authorize;