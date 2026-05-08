/**
 * Model Mongoose User.
 *
 * Role architectural:
 * - Represente les comptes qui peuvent se connecter au dashboard.
 * - Est utilise par authController pour register/login et par JWT pour porter l'identite.
 *
 * Points securite:
 * - Le mot de passe stocke ici doit toujours etre hashe avant creation.
 * - Le role alimente le RBAC: admin, analyst ou viewer.
 */
// Mongoose permet de definir un schema MongoDB cote application.
const mongoose = require('mongoose');

// Schema de la collection users.
const userSchema = new mongoose.Schema({
  // Identifiant de connexion unique, normalise par authValidator/authController.
  username: {
    type: String,
    required: true,
    unique: true,
  },
  // Mot de passe hashe avec bcrypt; jamais le mot de passe clair.
  password: {
    type: String,
    required: true,
  },
  // Role applicatif utilise par authorize() pour proteger les routes sensibles.
  role: {
    type: String,
    enum: ['admin', 'analyst', 'viewer'],
    default: 'viewer',
  },
});

// Exporte le model Mongoose, utilise par les controllers/services.
module.exports = mongoose.model('User', userSchema);
