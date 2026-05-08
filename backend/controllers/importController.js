/**
 * Controller d'import generique.
 *
 * Role architectural:
 * - Conserve un endpoint historique sans permettre d'import massif direct.
 * - Oriente l'utilisateur vers le flux plus sur: preview -> selection -> sauvegarde.
 */
// Repond en 410 Gone pour signaler que l'ancien flux est volontairement desactive.
const importScan = async (req, res, next) => {
  try {
    res.status(410).json({
      message: 'Bulk source import is disabled. Use preview mode and save selected records.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importScan,
};
