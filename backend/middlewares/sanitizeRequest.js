/**
 * Middleware de sanitization anti NoSQL injection.
 *
 * Role architectural:
 * - Nettoie req.body et req.params avant leur arrivee dans les controllers/services.
 * - Evite que des cles MongoDB speciales comme $ne ou des chemins avec "." soient injectes.
 *
 * Exemple de risque:
 * { "username": { "$ne": null } } peut modifier le sens d'une requete Mongo si non filtre.
 */
// Detecte un objet simple que l'on peut parcourir sans toucher aux Date ou tableaux.
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

// Nettoie recursivement une valeur: tableaux, objets imbriques, valeurs primitives.
const sanitizeValue = (value) => {
  // Les tableaux sont conserves mais chaque element est nettoye.
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  // Les strings, nombres, booleens et dates restent inchanges.
  if (!isPlainObject(value)) {
    return value;
  }

  // Reconstruit l'objet en ignorant les cles dangereuses.
  return Object.entries(value).reduce((sanitized, [key, childValue]) => {
    // Condition securite: les operateurs Mongo commencent par "$", les chemins imbriques utilisent ".".
    if (key.startsWith('$') || key.includes('.')) {
      return sanitized;
    }

    sanitized[key] = sanitizeValue(childValue);
    return sanitized;
  }, {});
};

// Middleware Express applique globalement par server.js.
const sanitizeRequest = (req, res, next) => {
  // Le body contient les donnees creees/modifiees par le frontend.
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Les params contiennent par exemple :id dans /vulnerabilities/:id.
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

module.exports = sanitizeRequest;
