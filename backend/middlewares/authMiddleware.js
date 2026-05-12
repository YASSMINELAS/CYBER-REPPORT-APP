/**
 * Middleware d'authentification via Keycloak.
 * Verification des JWT Keycloak (RS256) avec JWKS.
 * Gestion RBAC via les roles Keycloak.
 */

const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

// ✅ Variables déjà chargées par dotenv.config() dans server.js
const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;

const normalizeRole = (role) =>
  ['admin', 'analyst', 'viewer'].includes(role) ? role : 'viewer';

// ✅ Plus de validation ici — server.js s'en charge au démarrage
const jwksClient = jwksRsa({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5, // ✅ Evite le "Too many requests" Keycloak
  cacheMaxAge: 600000,       // ✅ Cache les clés 10 min
});

const getKey = (header, callback) => {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

const protect = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      message: 'Not authorized, no token',
    });
  }

  jwt.verify(
    token,
    getKey,
    {
      issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
      algorithms: ['RS256'],
      ignoreExpiration: false,
    },
    (err, decoded) => {
      if (err) {
        console.log('JWT ERROR:', err);
        return res.status(401).json({
          message: 'Not authorized, token failed',
        });
      }

      const keycloakRoles = decoded?.realm_access?.roles || [];
      const role =
        ['admin', 'analyst', 'viewer'].find((r) =>
          keycloakRoles.includes(r)
        ) || 'viewer';

      req.user = {
        id: decoded.sub,
        username: decoded.preferred_username,
        role: normalizeRole(role),
      };

      next();
    }
  );
};

const optionalAuth = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  jwt.verify(
    token,
    getKey,
    {
      issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
      algorithms: ['RS256'],
      ignoreExpiration: false,
    },
    (err, decoded) => {
      if (err) {
        console.log('JWT ERROR:', err);
        return next();
      }

      const keycloakRoles = decoded?.realm_access?.roles || [];
      const role =
        ['admin', 'analyst', 'viewer'].find((r) =>
          keycloakRoles.includes(r)
        ) || 'viewer';

      req.user = {
        id: decoded.sub,
        username: decoded.preferred_username,
        role: normalizeRole(role),
      };

      next();
    }
  );
};

const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Not authorized',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Forbidden: insufficient permissions',
      });
    }

    next();
  };

module.exports = protect;
module.exports.protect = protect;
module.exports.optionalAuth = optionalAuth;
module.exports.authorize = authorize;