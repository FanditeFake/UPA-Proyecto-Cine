/**
 * Lógica de negocio de funciones (cartelera) y disponibilidad de asientos.
 */
const { QueryTypes } = require('sequelize');
const { Funcion, Pelicula, Sala } = require('../models');
const { sequelize } = require('../config/db');
const { ErrorApp } = require('../utils/errores');

/** Cartelera: todas las funciones con su película y sala, ordenadas por horario. */
async function listar() {
  return Funcion.findAll({
    include: [
      { model: Pelicula, as: 'pelicula' },
      { model: Sala, as: 'sala' },
    ],
    order: [['horario', 'ASC']],
  });
}

/** Obtiene una función por id con su película y sala. */
async function obtener(id) {
  const funcion = await Funcion.findByPk(id, {
    include: [
      { model: Pelicula, as: 'pelicula' },
      { model: Sala, as: 'sala' },
    ],
  });
  if (!funcion) throw new ErrorApp('Función no encontrada', 404);
  return funcion;
}

/**
 * Asientos de una función indicando cuáles están ocupados.
 * Devuelve TODOS los asientos de la sala con un campo "ocupado" (0/1),
 * para que el frontend pinte el mapa de asientos.
 */
async function asientos(funcionId) {
  // Verifica que la función exista
  await obtener(funcionId);

  return sequelize.query(
    `SELECT
        a.id        AS asiento_id,
        a.codigo    AS codigo,
        a.fila      AS fila,
        a.numero    AS numero,
        CASE WHEN b.id IS NULL THEN 0 ELSE 1 END AS ocupado
     FROM funciones f
     JOIN asientos a ON a.sala_id = f.sala_id
     LEFT JOIN boletos b
        ON b.funcion_id = f.id AND b.asiento_id = a.id
     WHERE f.id = :funcionId
     ORDER BY a.fila, a.numero`,
    { replacements: { funcionId }, type: QueryTypes.SELECT }
  );
}

module.exports = { listar, obtener, asientos };
