/**
 * Lógica de negocio de funciones (cartelera) y disponibilidad de asientos.
 */
const { QueryTypes } = require('sequelize');
const { Funcion, Pelicula, Sala } = require('../models');
const { sequelize } = require('../config/db');
const { ErrorApp } = require('../utils/errores');
const { validarFechaISO } = require('../utils/fechas');

// Minutos de limpieza/margen obligatorio entre dos funciones de la MISMA sala.
const BUFFER_LIMPIEZA_MIN = 15;

// Acepta "YYYY-MM-DD HH:mm" o "YYYY-MM-DDTHH:mm" (con segundos opcionales).
const RE_HORARIO = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Normaliza el horario recibido a texto local "YYYY-MM-DD HH:mm:ss".
 * Rechaza formatos con zona horaria (ej: terminados en "Z") para no
 * reintroducir el corrimiento de día/hora por UTC.
 */
function normalizarHorario(valor) {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new ErrorApp('El horario es obligatorio', 400);
  }
  const m = valor.trim().match(RE_HORARIO);
  if (!m) {
    throw new ErrorApp('El horario debe tener el formato "YYYY-MM-DD HH:mm" (hora local, sin zona)', 400);
  }
  const [, fecha, hh, mm, ss] = m;
  validarFechaISO(fecha, 'horario');
  if (Number(hh) > 23 || Number(mm) > 59 || Number(ss || 0) > 59) {
    throw new ErrorApp('La hora del horario no es válida', 400);
  }
  return `${fecha} ${hh}:${mm}:${ss || '00'}`;
}

/**
 * Indica si un horario local "YYYY-MM-DD HH:mm:ss" ya pasó respecto al
 * momento actual. Se interpreta como hora local del servidor (misma zona
 * en la que se guardan y muestran los horarios), para no confundir por UTC.
 */
function horarioYaPaso(fechaHoraLocal) {
  const [fecha, hora] = fechaHoraLocal.split(' ');
  const [y, mo, d] = fecha.split('-').map(Number);
  const [h, mi, s] = hora.split(':').map(Number);
  const candidato = new Date(y, mo - 1, d, h, mi, s);
  return candidato.getTime() < Date.now();
}

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

/**
 * Busca funciones de la MISMA sala que se empalmen con la ventana
 * [inicio, inicio + duracion] de una función (más el buffer de limpieza).
 *
 * Dos funciones A y B se empalman si:  A.inicio < B.fin  Y  B.inicio < A.fin,
 * donde fin = inicio + duración + BUFFER. Así se garantiza al menos
 * BUFFER_LIMPIEZA_MIN minutos de separación entre funciones de una sala.
 *
 * @param {number} salaId    sala donde se proyecta
 * @param {string} inicio    "YYYY-MM-DD HH:mm:ss" (hora local)
 * @param {number} duracion  minutos de la película nueva
 * @param {number} [excluirId] id de función a ignorar (útil al editar)
 * @returns {object|null} la función que choca (o null si no hay empalme)
 */
async function buscarEmpalme(salaId, inicio, duracion, excluirId = null) {
  const filas = await sequelize.query(
    `SELECT f.id, p.titulo, f.horario, p.duracion
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
      WHERE f.sala_id = :salaId
        AND (:excluirId IS NULL OR f.id <> :excluirId)
        AND :inicio < DATE_ADD(f.horario, INTERVAL (p.duracion + :buffer) MINUTE)
        AND f.horario < DATE_ADD(:inicio, INTERVAL (:duracion + :buffer) MINUTE)
      ORDER BY f.horario
      LIMIT 1`,
    {
      replacements: { salaId, inicio, duracion, buffer: BUFFER_LIMPIEZA_MIN, excluirId },
      type: QueryTypes.SELECT,
    }
  );
  return filas[0] || null;
}

/**
 * Crea una función validando que exista la película y la sala, y que NO se
 * empalme con otra función de la misma sala.
 * @param {object} datos { pelicula_id, sala_id, horario }
 */
async function crear({ pelicula_id, sala_id, horario } = {}) {
  const peliculaId = Number(pelicula_id);
  const salaId = Number(sala_id);
  if (!peliculaId) throw new ErrorApp('Falta la película', 400);
  if (!salaId) throw new ErrorApp('Falta la sala', 400);

  const inicio = normalizarHorario(horario);
  if (horarioYaPaso(inicio)) {
    throw new ErrorApp('No se puede programar una función en una fecha u hora que ya pasó', 400);
  }

  const pelicula = await Pelicula.findByPk(peliculaId);
  if (!pelicula) throw new ErrorApp('La película no existe', 404);
  const sala = await Sala.findByPk(salaId);
  if (!sala) throw new ErrorApp('La sala no existe', 404);

  const empalme = await buscarEmpalme(salaId, inicio, Number(pelicula.duracion));
  if (empalme) {
    throw new ErrorApp(
      `Empalme en ${sala.nombre}: choca con "${empalme.titulo}" (inicia ${empalme.horario}, ` +
      `dura ${empalme.duracion} min). Deja al menos ${BUFFER_LIMPIEZA_MIN} min de separación.`,
      409
    );
  }

  // Se inserta el horario como TEXTO literal para conservar la hora local
  // exacta (sin conversión a UTC). Ver regla de fechas del proyecto.
  const [nuevoId] = await sequelize.query(
    `INSERT INTO funciones (pelicula_id, sala_id, horario) VALUES (:peliculaId, :salaId, :inicio)`,
    { replacements: { peliculaId, salaId, inicio }, type: QueryTypes.INSERT }
  );

  return obtener(nuevoId);
}

module.exports = { listar, obtener, asientos, crear, buscarEmpalme };
