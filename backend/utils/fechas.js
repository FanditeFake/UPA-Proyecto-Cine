/**
 * Utilidades de validación y manejo de fechas.
 *
 * Regla del proyecto: las fechas se manejan siempre como texto en formato
 * ISO "YYYY-MM-DD" (día) para evitar confusiones de zona horaria. Nunca se
 * convierten a Date con UTC, que es lo que "corre" el día.
 */
const { ErrorApp } = require('./errores');

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida que un valor sea una fecha real en formato YYYY-MM-DD.
 * Rechaza formatos incorrectos y fechas que no existen (ej: 2026-02-31).
 * @returns {string} la misma fecha si es válida
 */
function validarFechaISO(valor, campo = 'fecha') {
  if (typeof valor !== 'string' || !RE_FECHA.test(valor)) {
    throw new ErrorApp(`El campo "${campo}" debe tener el formato YYYY-MM-DD`, 400);
  }

  const [anio, mes, dia] = valor.split('-').map(Number);

  // Se construye en UTC para comparar sin que la zona horaria altere el día.
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  const existe =
    d.getUTCFullYear() === anio &&
    d.getUTCMonth() + 1 === mes &&
    d.getUTCDate() === dia;

  if (!existe) {
    throw new ErrorApp(`La fecha "${valor}" no existe en el calendario`, 400);
  }
  return valor;
}

/**
 * Valida un rango opcional { desde, hasta } proveniente de query params.
 * Devuelve solo los campos presentes ya validados.
 * Lanza error si desde > hasta.
 */
function validarRangoFechas({ desde, hasta } = {}) {
  const filtro = {};
  if (desde !== undefined && desde !== '') filtro.desde = validarFechaISO(desde, 'desde');
  if (hasta !== undefined && hasta !== '') filtro.hasta = validarFechaISO(hasta, 'hasta');

  if (filtro.desde && filtro.hasta && filtro.desde > filtro.hasta) {
    throw new ErrorApp('El campo "desde" no puede ser posterior a "hasta"', 400);
  }
  return filtro;
}

module.exports = { validarFechaISO, validarRangoFechas };
