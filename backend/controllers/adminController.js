/**
 * Controlador de operaciones administrativas de mantenimiento.
 */
const adminService = require('../services/adminService');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/admin/reset  (solo admin) — restablece la BD a su estado inicial
const resetear = asyncHandler(async (req, res) => {
  await adminService.resetearBaseDeDatos();
  res.json({ ok: true, mensaje: 'Base de datos restablecida a su estado inicial.' });
});

module.exports = { resetear };
