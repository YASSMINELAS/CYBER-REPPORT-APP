/**
 * Validateur des payloads d'authentification.
 *
 * Role architectural:
 * - Nettoie et valide les donnees avant authController.
 * - Reduit les erreurs MongoDB et les risques de donnees incoherentes.
 */
// Roles acceptes par le RBAC du projet.
const allowedRoles = ['admin', 'analyst', 'viewer'];

// Normalise une valeur texte optionnelle.
const normalizeString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

// Valide le username utilise pour login/register.
const validateUsername = (value) => {
  const username = normalizeString(value)?.toLowerCase();

  if (!username) {
    throw new Error('username is required.');
  }

  if (username.length < 3 || username.length > 64) {
    throw new Error('username must be between 3 and 64 characters.');
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw new Error('username can only contain letters, numbers, dots, underscores, and hyphens.');
  }

  return username;
};

// Valide le mot de passe; register impose une force minimale.
const validatePassword = (value, { enforceStrength = false } = {}) => {
  const password = normalizeString(value);

  if (!password) {
    throw new Error('password is required.');
  }

  if (password.length < 8 || password.length > 128) {
    throw new Error('password must be between 8 and 128 characters.');
  }

  if (enforceStrength && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
    throw new Error('password must contain uppercase, lowercase, and numeric characters.');
  }

  return password;
};

// Schema compatible avec validateRequest pour /auth/register.
const registerSchema = {
  validate(payload = {}) {
    try {
      const role = normalizeString(payload.role)?.toLowerCase();

      if (role && !allowedRoles.includes(role)) {
        throw new Error(`role must be one of: ${allowedRoles.join(', ')}.`);
      }

      return {
        value: {
          username: validateUsername(payload.username),
          password: validatePassword(payload.password, { enforceStrength: true }),
          role,
        },
      };
    } catch (error) {
      return { error };
    }
  },
};

// Schema compatible avec validateRequest pour /auth/login.
const loginSchema = {
  validate(payload = {}) {
    try {
      return {
        value: {
          username: validateUsername(payload.username),
          password: validatePassword(payload.password),
        },
      };
    } catch (error) {
      return { error };
    }
  },
};

module.exports = {
  loginSchema,
  registerSchema,
};
