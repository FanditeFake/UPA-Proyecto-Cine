/**
 * Controlador de funciones (cartelera) y asientos.
 */
const funcionService = require('../services/funcionService');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/funciones
const listar = asyncHandler(async (req, res) => {
  const funciones = await funcionService.listar();
  res.json({ ok: true, funciones });
});

// GET /api/funciones/:id
const obtener = asyncHandler(async (req, res) => {
  const funcion = await funcionService.obtener(req.params.id);
  res.json({ ok: true, funcion });
});

// GET /api/funciones/:id/asientos
const asientos = asyncHandler(async (req, res) => {
  const asientos = await funcionService.asientos(req.params.id);
  res.json({ ok: true, asientos });
});

module.exports = { listar, obtener, asientos };
