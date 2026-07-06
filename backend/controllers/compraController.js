/**
 * Controlador de compras.
 */
const compraService = require('../services/compraService');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/compras   (requiere token)
const crear = asyncHandler(async (req, res) => {
  const compra = await compraService.crear(req.usuario.id, req.body);
  res.status(201).json({ ok: true, compra });
});

// GET /api/compras/mias   (requiere token)
const misCompras = asyncHandler(async (req, res) => {
  const compras = await compraService.misCompras(req.usuario.id);
  res.json({ ok: true, compras });
});

// GET /api/compras/:id   (requiere token; solo el dueño)
const obtener = asyncHandler(async (req, res) => {
  const compra = await compraService.obtenerPorId(req.params.id, req.usuario.id, true);
  res.json({ ok: true, compra });
});

module.exports = { crear, misCompras, obtener };
