/**
 * Lógica de negocio del dashboard administrativo.
 * Se apoya en las vistas SQL definidas en cinemax.sql y arma los datos
 * listos para las gráficas del panel de administrador (Chart.js).
 *
 * Las fechas de los reportes se devuelven como texto "YYYY-MM-DD" (formateadas
 * en SQL con DATE_FORMAT) para evitar cualquier confusión de zona horaria.
 */
const { QueryTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Compra, Funcion, Pelicula, Sala } = require('../models');

/**
 * Construye el fragmento WHERE para filtrar compras por rango de fechas.
 * @param {{desde?:string, hasta?:string}} filtro  fechas YYYY-MM-DD ya validadas
 */
function whereFecha({ desde, hasta } = {}) {
  const cond = [];
  const repl = {};
  if (desde) { cond.push('DATE(c.fecha) >= :desde'); repl.desde = desde; }
  if (hasta) { cond.push('DATE(c.fecha) <= :hasta'); repl.hasta = hasta; }
  return { where: cond.length ? `WHERE ${cond.join(' AND ')}` : '', repl };
}

/** Indicadores generales (una sola fila). */
async function indicadores() {
  const [fila] = await sequelize.query(
    'SELECT * FROM v_dashboard',
    { type: QueryTypes.SELECT }
  );
  return fila;
}

/** Ventas por película (para la tabla y la gráfica). */
async function ventasPorPelicula() {
  return sequelize.query(
    'SELECT * FROM v_ventas_por_pelicula',
    { type: QueryTypes.SELECT }
  );
}

/** Ventas por sala. */
async function ventasPorSala() {
  return sequelize.query(
    'SELECT * FROM v_ventas_por_sala',
    { type: QueryTypes.SELECT }
  );
}

/**
 * Ventas por día, en orden cronológico (ascendente) y con la fecha como
 * texto "YYYY-MM-DD". Ideal para el eje X de la gráfica de líneas/barras.
 * Acepta un filtro opcional de rango de fechas.
 */
async function ventasPorDia(filtro = {}) {
  const { where, repl } = whereFecha(filtro);
  return sequelize.query(
    `SELECT
        DATE_FORMAT(c.fecha, '%Y-%m-%d')   AS dia,
        COUNT(c.id)                        AS total_compras,
        COALESCE(SUM(c.cantidad), 0)       AS total_boletos,
        COALESCE(SUM(c.total), 0)          AS total_ingresos,
        COALESCE(SUM(c.descuento), 0)      AS total_descuentos
     FROM compras c
     ${where}
     GROUP BY DATE_FORMAT(c.fecha, '%Y-%m-%d')
     ORDER BY dia ASC`,
    { replacements: repl, type: QueryTypes.SELECT }
  );
}

/**
 * A partir de los datos ya consultados, arma la estructura lista para
 * Chart.js: cada gráfica trae { labels, ...datasets numéricos }.
 * Es una función pura (no consulta la BD), para no repetir queries.
 */
function construirGraficas({ porDia = [], porPelicula = [], porSala = [] }) {
  return {
    // Gráfica de barras/líneas: ventas por día
    ventasPorDia: {
      labels:   porDia.map(d => d.dia),
      ingresos: porDia.map(d => Number(d.total_ingresos)),
      boletos:  porDia.map(d => Number(d.total_boletos)),
    },
    // Gráfica de barras: boletos/ingresos por película
    ventasPorPelicula: {
      labels:   porPelicula.map(p => p.pelicula),
      boletos:  porPelicula.map(p => Number(p.boletos_vendidos)),
      ingresos: porPelicula.map(p => Number(p.ingresos_totales)),
    },
    // Gráfica de pastel/barras: ingresos por sala
    ventasPorSala: {
      labels:   porSala.map(s => s.sala),
      boletos:  porSala.map(s => Number(s.boletos_vendidos)),
      ingresos: porSala.map(s => Number(s.ingresos_totales)),
    },
  };
}

/**
 * Listado completo de ventas (tabla de administración), con filtro opcional
 * por rango de fechas. El rango se aplica sobre el día de la compra.
 */
async function todasLasVentas(filtro = {}) {
  const where = {};
  if (filtro.desde || filtro.hasta) {
    where.fecha = {};
    if (filtro.desde) where.fecha[Op.gte] = `${filtro.desde} 00:00:00`;
    if (filtro.hasta) where.fecha[Op.lte] = `${filtro.hasta} 23:59:59`;
  }
  return Compra.findAll({
    where,
    include: [{ model: Funcion, as: 'funcion', include: [
      { model: Pelicula, as: 'pelicula' },
      { model: Sala, as: 'sala' },
    ] }],
    order: [['fecha', 'DESC']],
  });
}

module.exports = {
  indicadores,
  ventasPorPelicula,
  ventasPorSala,
  ventasPorDia,
  construirGraficas,
  todasLasVentas,
};
