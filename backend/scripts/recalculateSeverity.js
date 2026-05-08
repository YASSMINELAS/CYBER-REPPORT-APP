/**
 * Script de maintenance: recalcul des severites.
 *
 * Role architectural:
 * - Recalcule ruleLevel/severity pour les incidents et vulnerabilites existants.
 * - Utile apres un changement de logique de mapping severite.
 *
 * Execution:
 * npm run recalculate:severity
 */
// Charge les variables d'environnement, notamment MONGO_URI.
const dotenv = require('dotenv');
// Connexion MongoDB partagee avec le backend.
const connectDB = require('../config/db');
// Models concernes par le recalcul.
const Incident = require('../models/Incident');
const Vulnerability = require('../models/Vulnerability');
// Helpers de conversion niveau -> severite.
const { mapSeverity, normalizeRuleLevel, severityToRuleLevel } = require('../utils/severity');

// Initialise process.env.
dotenv.config();

// Recalcule une collection generique pour eviter de dupliquer le code.
const recalculateCollection = async (Model, label) => {
  // Requete MongoDB: lit seulement les champs necessaires.
  const records = await Model.find().select('_id ruleLevel severity');

  // Prepare un bulkWrite pour mettre a jour efficacement tous les documents.
  const updates = records.map((record) => {
    const fallbackRuleLevel = severityToRuleLevel(record.severity);
    const ruleLevel = normalizeRuleLevel(record.ruleLevel, fallbackRuleLevel);

    return {
      updateOne: {
        filter: { _id: record._id },
        update: {
          $set: {
            ruleLevel,
            severity: mapSeverity(ruleLevel),
          },
        },
      },
    };
  });

  if (updates.length === 0) {
    // Aucun document: le script se termine proprement.
    console.log(`${label}: no records to update`);
    return;
  }

  // Requete MongoDB en lot.
  const result = await Model.bulkWrite(updates);
  console.log(`${label}: ${result.modifiedCount} records updated`);
};

// Fonction principale du script.
const run = async () => {
  // Connexion obligatoire avant toute requete Mongoose.
  await connectDB();
  await recalculateCollection(Vulnerability, 'Vulnerabilities');
  await recalculateCollection(Incident, 'Incidents');
  process.exit(0);
};

// Gestion d'erreur globale du script CLI.
run().catch((error) => {
  console.error('Severity recalculation failed:', error);
  process.exit(1);
});
