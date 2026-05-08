/**
 * Point d'entree principal du backend Express.
 *
 * Role architectural:
 * - Charge la configuration d'environnement.
 * - Initialise Express, les middlewares globaux, les routes API et la connexion MongoDB.
 * - Relie les couches routes -> controllers -> services -> models.
 *
 * Flux de donnees:
 * Client React -> route Express -> controller -> service -> model Mongoose -> MongoDB -> reponse JSON.
 *
 * Points securite:
 * - Les variables critiques sont verifiees au demarrage.
 * - CORS, headers securite, limite JSON et sanitization sont appliques avant les routes.
 */
// Express fournit le serveur HTTP et le systeme de routes/middlewares.
const express = require('express');
// CORS controle quelles origines frontend peuvent appeler l'API.
const cors = require('cors');
// dotenv charge les variables depuis .env en developpement.
const dotenv = require('dotenv');
// Connexion MongoDB centralisee via Mongoose.
const connectDB = require('./config/db');
// Options CORS propres au projet, basees sur FRONTEND_URL.
const corsOptions = require('./config/cors');
// Routes metier pour la gestion des vulnerabilites.
const vulnerabilityRoutes = require('./routes/vulnerabilityRoutes');
// Routes metier pour la gestion des incidents de securite.
const incidentRoutes = require('./routes/incidentRoutes');
// Routes dediees aux imports.
const importRoutes = require('./routes/importRoutes');
// Routes de statistiques pour le dashboard.
const statsRoutes = require('./routes/statsRoutes');
// Routes d'integration avec Nessus et Wazuh.
const externalRoutes = require('./routes/externalRoutes');
// Middleware final qui transforme les erreurs en reponses JSON propres.
const errorMiddleware = require('./middlewares/errorMiddleware');
// Nettoie les payloads pour reduire les risques d'injection NoSQL.
const sanitizeRequest = require('./middlewares/sanitizeRequest');
// Ajoute des headers HTTP de defense cote navigateur.
const securityHeaders = require('./middlewares/securityHeaders');

// Charge .env avant toute lecture de process.env.
dotenv.config();

// Variables indispensables au fonctionnement securise de l'API.
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'KEYCLOAK_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_CLIENT_ID',
  'KEYCLOAK_CLIENT_SECRET',
  'NESSUS_URL',
  'NESSUS_ACCESS_KEY',
  'NESSUS_SECRET_KEY',
  'WAZUH_API_URL',
];
// Liste les variables manquantes afin de produire une erreur explicite au demarrage.
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

// Si des destinataires d'alerte existent, l'envoi email devient actif.
// On refuse donc de demarrer sans configuration SMTP complete.
if (process.env.ALERT_EMAIL_RECIPIENTS) {
  const emailEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingEmailVars = emailEnvVars.filter((envVar) => !process.env[envVar]);
  // Condition importante: un email partiel provoquerait des erreurs au moment des incidents.
  if (missingEmailVars.length > 0) {
    console.error('âŒ FATAL: Email alerts enabled but missing SMTP configuration:');
    missingEmailVars.forEach((envVar) => console.error(`  - ${envVar}`));
    process.exit(1);
  }
}

// Condition critique: l'application ne doit pas tourner sans MongoDB, JWT ou connecteurs externes.
if (missingEnvVars.length > 0) {
  console.error('âŒ FATAL: Missing required environment variables:');
  missingEnvVars.forEach((envVar) => console.error(`  - ${envVar}`));
  process.exit(1);
}

// Cree l'application Express. A ce stade, aucune route n'est encore exposee.
const app = express();

// Bonne pratique: ne pas reveler Express dans les headers HTTP.
app.disable('x-powered-by');
// Middleware global: ajoute des headers de securite a toutes les reponses.
app.use(securityHeaders);
// Middleware global: bloque les origines navigateur non autorisees.
app.use(cors(corsOptions));
// Middleware global: parse le JSON entrant et limite la taille des payloads.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
// Middleware global: retire les cles Mongo dangereuses avant les controllers.
app.use(sanitizeRequest);

// Route de sante simple pour confirmer manuellement que l'API repond.
app.get('/api/test', (req, res) => {
  res.json({ message: 'API works' });
});

// Routes REST montees par domaine metier.
app.use('/api/vulnerabilities', vulnerabilityRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/import', importRoutes);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stats', statsRoutes);
app.use('/api/external', externalRoutes);
// Le middleware d'erreur reste apres les routes pour recevoir les next(error).
app.use(errorMiddleware);

// Port HTTP configurable par environnement, avec 5000 par defaut en local.
const PORT = process.env.PORT || 5000;

// Demarrage sequentiel: connexion MongoDB d'abord, ecoute HTTP ensuite.
// Resultat attendu: le serveur n'accepte des requetes que lorsque la base est disponible.
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

// Lance effectivement le backend.
startServer();
