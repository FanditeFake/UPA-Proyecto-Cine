/**
 * Lógica de negocio del dashboard administrativo.
 * Se apoya en las vistas SQL definidas en cinemax.sql.
 */
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { Compra, Funcion, Pelicula, Sala } = require('../models');

/** Indicadores generales (una sola fila). */
async function indicadores() {
  const [fila] = await sequelize.query(
    'SELECT * FROM v_dashboard',
    { type: QueryTypes.SELECT }
  );
  return fila;
}

/** Ventas por película (para la tabla resumen). */
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

/** Ventas por día (para la gráfica). */
async function ventasPorDia() {
  return sequelize.query(
    'SELECT * FROM v_ventas_por_dia',
    { type: QueryTypes.SELECT }
  );
}

/** Listado completo de ventas (tabla de administración). */
async function todasLasVentas() {
  return Compra.findAll({
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
  todasLasVentas,
};
