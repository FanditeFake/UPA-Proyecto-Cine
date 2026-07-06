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

module.exports = { listar, obtener };
