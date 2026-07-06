/**
 * Middleware de autorización por rol.
 * Debe usarse DESPUÉS del middleware auth (necesita req.usuario).
 * Bloquea el acceso si el usuario no es administrador.
 */
const { ErrorApp } = require('../utils/errores');

module.exports = function soloAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'administrador') {
    return next(new ErrorApp('Acceso permitido solo a administradores', 403));
  }
  next();
};
