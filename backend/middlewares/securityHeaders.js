/**
 * Middleware de headers HTTP securite.
 *
 * Role architectural:
 * - Ajoute des protections navigateur sur toutes les reponses API.
 * - Complete CORS et l'auth JWT sans changer la logique metier.
 */
// Middleware Express global: req entre, les headers sont poses, puis next() continue vers les routes.
const securityHeaders = (req, res, next) => {
  // Empêche certains navigateurs d'interpreter un contenu avec un type MIME different.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Interdit l'integration de l'API dans une iframe, utile contre le clickjacking.
  res.setHeader('X-Frame-Options', 'DENY');
  // Evite de transmettre l'URL precedente a d'autres sites.
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Desactive des permissions navigateur inutiles pour une API cyber.
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Limite le partage cross-origin des ressources.
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  // HSTS ne doit etre active qu'en production HTTPS.
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
};

module.exports = securityHeaders;
