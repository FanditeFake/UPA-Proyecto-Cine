/**
 * Error de aplicación con código HTTP.
 * Permite lanzar errores controlados desde los servicios, por ejemplo:
 *    throw new ErrorApp('El asiento ya está ocupado', 409);
 * El middleware de errores usa el statusCode para responder correctamente.
 */
class ErrorApp extends Error {
  constructor(mensaje, statusCode = 400) {
    super(mensaje);
    this.statusCode = statusCode;
    this.esErrorApp = true;
  }
}

module.exports = { ErrorApp };
