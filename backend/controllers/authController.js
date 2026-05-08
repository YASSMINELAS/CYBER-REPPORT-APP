/**
 * Controller d'authentification adapte pour Keycloak.
 * - Login : delegue a Keycloak via l'API token.
 * - Register : cree l'utilisateur dans Keycloak + MongoDB.
 * - Le RBAC admin/analyst/viewer est conserve.
 */
const User = require('../models/User');

// Recupere un token admin Keycloak pour appeler l'API d'administration.
const getAdminToken = async () => {
  const res = await fetch(
    `${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      }),
    }
  );
  const data = await res.json();
  return data.access_token;
};

// Login : envoie username/password a Keycloak, retourne le token JWT Keycloak.
const loginUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const response = await fetch(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: process.env.KEYCLOAK_CLIENT_ID,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
          username,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Recupere les infos user depuis MongoDB pour le role local.
    const user = await User.findOne({ username });

    res.json({
      token: data.access_token,
      refreshToken: data.refresh_token,
      user: {
        username,
        role: user?.role || 'viewer',
      },
    });
  } catch (error) {
    next(error);
  }
};

// Register : cree l'utilisateur dans Keycloak ET dans MongoDB.
const registerUser = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    const usersCount = await User.countDocuments();

    // RBAC : apres le premier compte, seuls les admins peuvent creer des utilisateurs.
    if (usersCount > 0 && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create users.' });
    }

    const assignedRole = usersCount === 0 ? 'admin' : role || 'viewer';
    const adminToken = await getAdminToken();

    // 1. Creer l'utilisateur dans Keycloak.
    const kcRes = await fetch(
      `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          username,
          enabled: true,
          credentials: [{ type: 'password', value: password, temporary: false }],
          realmRoles: [assignedRole],
        }),
      }
    );

    if (!kcRes.ok) {
      const err = await kcRes.json();
      return res.status(400).json({ message: err.errorMessage || 'Keycloak error' });
    }

    // 2. Creer aussi dans MongoDB pour garder les données metier.
    const user = await User.create({ username, role: assignedRole });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser };