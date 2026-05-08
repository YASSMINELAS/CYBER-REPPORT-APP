/**
 * Middleware global de gestion des erreurs Express.
 *
 * Role architectural:
 * - Recoit les erreurs envoyees par next(error) dans les controllers/services.
 * - Transforme ces erreurs en reponses JSON standardisees pour le frontend.
 *
 * Donnees entrantes:
 * - error.statusCode optionnel.
 * - error.message lisible par le client.
 *
 * Resultat:
 * - Reponse HTTP avec code coherent et objet { message }.
 */
// Middleware Express a 4 arguments: Express reconnait cette signature comme gestionnaire d'erreurs.
const errorMiddleware = (error, req, res, next) => {
  // Si aucun status n'est defini, on utilise 500 pour signaler une erreur serveur.
  const statusCode = error.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  // Le frontend consomme message pour afficher toast/erreur utilisateur.
  res.status(statusCode).json({
    message: error.message || 'Server Error',
  });
};

module.exports = errorMiddleware;
