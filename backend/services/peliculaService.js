/**
 * Lógica de negocio de películas.
 */
const { QueryTypes } = require('sequelize');
const { Pelicula } = require('../models');
const { sequelize } = require('../config/db');
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

const CLASIFICACIONES = ['AA', 'A', 'B', 'B15', 'C', 'D'];

/**
 * Crea una película nueva a partir de los datos del formulario del admin.
 * Valida los campos obligatorios antes de insertar.
 */
async function crear(datos = {}) {
  const titulo = String(datos.titulo || '').trim();
  const genero = String(datos.genero || '').trim();
  const duracion = Number(datos.duracion);
  const precio = Number(datos.precio);
  const clasificacion = String(datos.clasificacion || 'B').trim();
  const sinopsis = datos.sinopsis ? String(datos.sinopsis).trim() : null;
  const posterUrl = datos.poster_url ? String(datos.poster_url).trim() : null;

  if (!titulo) throw new ErrorApp('El título es obligatorio', 400);
  if (!genero) throw new ErrorApp('El género es obligatorio', 400);
  if (!Number.isFinite(duracion) || duracion <= 0) throw new ErrorApp('La duración debe ser un número mayor a 0', 400);
  if (!Number.isFinite(precio) || precio <= 0) throw new ErrorApp('El precio debe ser un número mayor a 0', 400);
  if (!CLASIFICACIONES.includes(clasificacion)) throw new ErrorApp(`Clasificación inválida. Usa una de: ${CLASIFICACIONES.join(', ')}`, 400);

  return Pelicula.create({
    titulo,
    sinopsis,
    duracion,
    clasificacion,
    genero,
    precio,
    poster_url: posterUrl,
    activa: true,
  });
}

/**
 * Elimina una película, PERO solo si nadie ha comprado boletos para
 * ninguna de sus funciones. Si ya hay ventas, se rechaza (409) para no
 * romper el histórico de compras.
 *
 * Al borrar la película, sus funciones se eliminan en cascada
 * (ON DELETE CASCADE definido en cinemax.sql).
 */
async function eliminar(id) {
  const pelicula = await Pelicula.findByPk(id);
  if (!pelicula) throw new ErrorApp('Película no encontrada', 404);

  const [{ vendidos }] = await sequelize.query(
    `SELECT COUNT(*) AS vendidos
       FROM compras c
       JOIN funciones f ON f.id = c.funcion_id
      WHERE f.pelicula_id = :id`,
    { replacements: { id }, type: QueryTypes.SELECT }
  );

  if (Number(vendidos) > 0) {
    throw new ErrorApp(
      `No se puede eliminar "${pelicula.titulo}": ya tiene boletos vendidos.`,
      409
    );
  }

  const titulo = pelicula.titulo;
  await pelicula.destroy();
  return { id: Number(id), titulo };
}

module.exports = { listar, obtener, crear, eliminar };
