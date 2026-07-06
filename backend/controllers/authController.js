/**
 * Controlador de autenticación.
 */
const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/auth/register
const registrar = asyncHandler(async (req, res) => {
  const resultado = await authService.registrar(req.body);
  res.status(201).json({ ok: true, ...resultado });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const resultado = await authService.login(req.body);
  res.json({ ok: true, ...resultado });
});

// GET /api/auth/me   (requiere token)
const perfil = asyncHandler(async (req, res) => {
  const usuario = await authService.obtenerPerfil(req.usuario.id);
  res.json({ ok: true, usuario });
});

module.exports = { registrar, login, perfil };
