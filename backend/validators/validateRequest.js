/**
 * Middleware de validation generique.
 *
 * Role architectural:
 * - Applique les schemas de validation aux sources Express: body, query, params.
 * - Remplace req[source] par la valeur nettoyee pour les controllers.
 */
// schemas peut contenir { body, query, params }, chacun avec une methode validate().
const validateRequest = (schemas = {}) => (req, res, next) => {
  try {
    // On parcourt les trois emplacements classiques d'une requete Express.
    ['body', 'query', 'params'].forEach((source) => {
      const schema = schemas[source];
      if (!schema) return;

      // Chaque schema renvoie soit { value }, soit { error }.
      const { value, error } = schema.validate(req[source]);
      if (error) {
        const validationError = new Error(error.message);
        validationError.statusCode = 400;
        throw validationError;
      }

      // Les controllers recoivent une version normalisee de la donnee.
      req[source] = value;
    });

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validateRequest;
