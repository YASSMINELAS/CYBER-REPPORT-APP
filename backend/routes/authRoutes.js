/**
 * Routes d'authentification.
 *
 * Role architectural:
 * - Expose les endpoints de creation de compte et de connexion.
 * - Delegue la logique JWT au controller authController.
 * - Applique validation et rate limiting avant la logique metier.
 */
// Express Router permet de grouper les routes /api/auth.
const express = require('express');
// Controllers responsables de creer l'utilisateur et generer le JWT.
const { registerUser, loginUser } = require('../controllers/authController');
// optionalAuth permet de connaitre l'utilisateur si un token est fourni.
const { optionalAuth } = require('../middlewares/authMiddleware');
// Rate limiter pour reduire les attaques brute force.
const rateLimit = require('../middlewares/rateLimitMiddleware');
// Middleware generique qui valide req.body avec les schemas.
const validateRequest = require('../validators/validateRequest');
// Schemas pedagogiques: username/password/role.
const { loginSchema, registerSchema } = require('../validators/authValidator');

// Cree un routeur isole, monte ensuite dans server.js sur /api/auth.
const router = express.Router();
// Limite specifique aux endpoints auth, plus stricte que pour une API classique.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
});

// POST /api/auth/register
// Entree: { username, password, role? }
// Sortie: utilisateur cree sans mot de passe.
// Securite: premier compte possible sans admin; ensuite seul un admin peut creer des utilisateurs.
router.post('/register', authRateLimit, optionalAuth, validateRequest({ body: registerSchema }), registerUser);
// POST /api/auth/login
// Entree: { username, password }
// Sortie: { token, user } si les identifiants sont valides.
router.post('/login', authRateLimit, validateRequest({ body: loginSchema }), loginUser);

module.exports = router;
