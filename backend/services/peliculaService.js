/**
 * Lógica de negocio de películas.
 */
const { Pelicula } = require('../models');
const { ErrorApp } = require('../utils/errores');

/** Lista las películas. Por defecto solo las activas. */
async function listar({ soloActivas = true } = {}) {
  const where = soloActivas ? { activa: true } : {};
  return Pelicula.findAll({ where, order: [['titulo', 'ASC']] });
}

/** Obtiene una película por id. */
async function obtener(id) {
  const pelicula = await Pelicula.findByPk(id);
  if (!pelicula) throw new ErrorApp('Película no encontrada', 404);
  return pelicula;
}

module.exports = { listar, obtener };
