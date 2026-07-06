/**
 * Envuelve un controlador async para que cualquier error (throw o promesa
 * rechazada) se envíe automáticamente al middleware de manejo de errores,
 * evitando repetir try/catch en cada controlador.
 *
 * Uso:
 *    router.get('/', asyncHandler(async (req, res) => { ... }));
 */
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
