/**
 * Middleware simple de rate limiting en memoire.
 *
 * Role architectural:
 * - Protege les routes sensibles comme /auth/login contre les tentatives repetees.
 * - Reste volontairement local et simple pour ne pas changer l'architecture existante.
 *
 * Limite:
 * - En production multi-instance, il faut preferer Redis pour partager les compteurs.
 */
// Map en memoire: cle client -> compteur et date de reinitialisation.
const buckets = new Map();

// Identifie le client via IP ou headers reseau disponibles.
const getClientKey = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

// Factory de middleware: chaque route peut choisir sa fenetre et son maximum.
const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests. Please try again later.' } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    // La cle inclut methode + URL + client pour separer les compteurs par endpoint.
    const key = `${req.method}:${req.originalUrl}:${getClientKey(req)}`;
    const bucket = buckets.get(key);

    // Nouveau client ou fenetre expiree: on initialise le compteur.
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    // Chaque requete dans la fenetre augmente le compteur.
    bucket.count += 1;

    // Condition securite: trop de requetes, on bloque temporairement.
    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({ message });
    }

    return next();
  };
};

module.exports = rateLimit;
