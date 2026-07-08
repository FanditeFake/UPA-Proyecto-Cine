/**
 * Controlador de películas.
 */
const peliculaService = require('../services/peliculaService');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/peliculas
const listar = asyncHandler(async (req, res) => {
  const peliculas = await peliculaService.listar();
  res.json({ ok: true, peliculas });
});

// GET /api/peliculas/:id
const obtener = asyncHandler(async (req, res) => {
  const pelicula = await peliculaService.obtener(req.params.id);
  res.json({ ok: true, pelicula });
});

// POST /api/admin/peliculas  (solo admin)
const crear = asyncHandler(async (req, res) => {
  const pelicula = await peliculaService.crear(req.body);
  res.status(201).json({ ok: true, pelicula });
});

// DELETE /api/admin/peliculas/:id  (solo admin) — solo si no tiene boletos vendidos
const eliminar = asyncHandler(async (req, res) => {
  const resultado = await peliculaService.eliminar(req.params.id);
  res.json({ ok: true, mensaje: `Película "${resultado.titulo}" eliminada.`, id: resultado.id });
});

module.exports = { listar, obtener, crear, eliminar };
