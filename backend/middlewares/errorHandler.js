/**
 * Middleware central de manejo de errores.
 * Cualquier error que llegue aquí se convierte en una respuesta JSON limpia.
 * Va registrado al final de server.js (después de las rutas).
 */
module.exports = function errorHandler(err, req, res, next) {
  // Errores controlados que lanzamos nosotros (ErrorApp)
  let status  = err.statusCode || 500;
  let mensaje = err.message || 'Error interno del servidor';

  // Violación de índice único de Sequelize (ej: asiento ya vendido)
  if (err.name === 'SequelizeUniqueConstraintError') {
    status  = 409;
    mensaje = 'El registro ya existe (posible asiento ocupado o correo duplicado)';
  }

  // Error de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    status  = 400;
    mensaje = err.errors.map(e => e.message).join(', ');
  }

  // Log en servidor solo si es un error inesperado (500)
  if (status === 500) {
    console.error(' Error inesperado:', err);
  }

  res.status(status).json({ ok: false, mensaje });
};
