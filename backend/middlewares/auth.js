/**
 * Middleware de autenticación.
 * Lee el token del header  Authorization: Bearer <token>,  lo verifica
 * y adjunta los datos del usuario a  req.usuario.
 */
const { verificarToken } = require('../utils/jwt');
const { ErrorApp } = require('../utils/errores');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return next(new ErrorApp('Token no proporcionado', 401));
  }

  try {
    req.usuario = verificarToken(token); // { id, correo, rol, iat, exp }
    next();
  } catch (e) {
    next(new ErrorApp('Token inválido o expirado', 401));
  }
};
