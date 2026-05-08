/**
 * Configuration de connexion MongoDB.
 *
 * Role architectural:
 * - Centralise la connexion Mongoose utilisee par tous les models du backend.
 * - Est appele par server.js avant que l'API commence a accepter des requetes.
 *
 * Importance:
 * - Sans cette connexion, les controllers et services ne peuvent pas lire/ecrire les incidents,
 *   vulnerabilites ou utilisateurs.
 */
// Mongoose est l'ODM qui transforme les schemas JavaScript en collections MongoDB.
const mongoose = require('mongoose');

// Fonction de demarrage qui ouvre une connexion unique vers MongoDB.
const connectDB = async () => {
  try {
    // MONGO_URI vient de l'environnement pour eviter d'ecrire les secrets dans le code.
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    // Erreur fatale: l'application s'arrete pour eviter un backend partiellement fonctionnel.
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
