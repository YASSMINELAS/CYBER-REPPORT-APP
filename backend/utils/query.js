/**
 * Utilitaires de requetes MongoDB.
 *
 * Role architectural:
 * - Fournit pagination, tri, recherche texte simple et nettoyage d'objets.
 * - Evite de dupliquer cette logique dans incidentService et vulnerabilityService.
 */
// Echappe les caracteres speciaux Regex pour eviter une regex non desiree.
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cree une recherche insensible a la casse.
const createSearchRegex = (value) => new RegExp(escapeRegExp(value), 'i');

// Parse page/limit depuis req.query et calcule skip pour MongoDB.
const parsePagination = (query, options = {}) => {
  const defaultLimit = options.defaultLimit || 100;
  const maxLimit = options.maxLimit || 500;
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

// Parse le tri tout en limitant les champs autorises.
const parseSort = (query, allowedFields, fallbackField) => {
  const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : fallbackField;
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  return {
    sortBy,
    sortOrder,
    sort: { [sortBy]: sortOrder, createdAt: -1 },
  };
};

// Ajoute un filtre $or MongoDB sur plusieurs champs texte.
const addTextSearch = (filters, fields, value) => {
  if (!value) return filters;

  const search = createSearchRegex(value);
  const searchFilter = {
    $or: fields.map((field) => ({ [field]: search })),
  };

  if (filters.$or || filters.$and) {
    return {
      ...filters,
      $and: [...(filters.$and || []), searchFilter],
    };
  }

  return {
    ...filters,
    ...searchFilter,
  };
};

// Retire les valeurs undefined pour eviter d'ecraser des champs involontairement.
const compactObject = (payload) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

module.exports = {
  addTextSearch,
  compactObject,
  createSearchRegex,
  parsePagination,
  parseSort,
};
