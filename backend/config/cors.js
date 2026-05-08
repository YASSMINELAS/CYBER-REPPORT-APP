/**
 * Configuration CORS du backend.
 *
 * Role architectural:
 * - Definit quelles applications frontend peuvent appeler l'API Express depuis un navigateur.
 * - Est consommee par server.js avec app.use(cors(corsOptions)).
 *
 * Point securite:
 * - Une liste blanche limite les appels cross-origin non desires.
 */
// Lit FRONTEND_URL et accepte plusieurs URLs separees par des virgules.
const parseAllowedOrigins = () => {
  const configuredOrigins = process.env.FRONTEND_URL || 'http://localhost:5173';

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

// Options passees au middleware cors().
const corsOptions = {
  // Fonction appelee pour chaque requete afin de valider l'origine.
  origin(origin, callback) {
    const allowedOrigins = parseAllowedOrigins();

    // Les outils serveur ou tests peuvent ne pas envoyer d'Origin; ils restent autorises.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Si l'origine est inconnue, le navigateur recevra un refus CORS.
    return callback(new Error('Not allowed by CORS'));
  },
  // Liste explicite des methodes REST utilisees par le projet.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Authorization est necessaire pour transporter le JWT.
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Prepare le projet a l'utilisation future de cookies securises.
  credentials: true,
};

module.exports = corsOptions;
