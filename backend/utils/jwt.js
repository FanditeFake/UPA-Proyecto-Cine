/**
 * Utilidades para firmar y verificar tokens JWT.
 */
const jwt = require('jsonwebtoken');

const SECRET     = process.env.JWT_SECRET || 'secreto_de_desarrollo_cambiar';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Genera un token con los datos públicos del usuario.
 * @param {{id:number, correo:string, rol:string}} payload
 */
function firmarToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * Verifica un token y devuelve su payload. Lanza error si es inválido/expiró.
 */
function verificarToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { firmarToken, verificarToken };
