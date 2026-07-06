/**
 * Lógica de negocio de compras (ventas).
 * Una compra genera una fila en "compras" y N filas en "boletos"
 * (una por asiento), todo dentro de una transacción.
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const {
  Compra, Boleto, Funcion, Pelicula, Sala, Asiento, Usuario,
} = require('../models');
const { ErrorApp } = require('../utils/errores');
const {
  generarCodigoCompra, generarFolio, contenidoQR,
} = require('../utils/folio');

const DESCUENTO_MEMBRESIA = 0.20; // 20%
const MAX_BOLETOS = 10;

/**
 * Crea una compra.
 * @param {number} usuarioId  usuario autenticado (del token)
 * @param {object} datos      { funcion_id, asientos:[id], cliente_nombre }
 *
 * El descuento por membresía se aplica según la membresía REAL del usuario
 * en la base de datos (no se puede falsificar desde el cliente).
 */
async function crear(usuarioId, { funcion_id, asientos, cliente_nombre }) {
  // ── Validaciones básicas ────────────────────────────────
  if (!funcion_id) throw new ErrorApp('Falta la función', 400);
  if (!Array.isArray(asientos) || asientos.length === 0) {
    throw new ErrorApp('Debes seleccionar al menos un asiento', 400);
  }
  if (asientos.length > MAX_BOLETOS) {
    throw new ErrorApp(`Máximo ${MAX_BOLETOS} boletos por compra`, 400);
  }
  // Sin asientos repetidos en la misma petición
  if (new Set(asientos).size !== asientos.length) {
    throw new ErrorApp('Hay asientos repetidos en la selección', 400);
  }

  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario) throw new ErrorApp('Usuario no encontrado', 404);

  const funcion = await Funcion.findByPk(funcion_id, {
    include: [
      { model: Pelicula, as: 'pelicula' },
      { model: Sala, as: 'sala' },
    ],
  });
  if (!funcion) throw new ErrorApp('La función no existe', 404);

  // ── Los asientos deben pertenecer a la sala de la función ──
  const asientosSala = await Asiento.findAll({
    where: { id: { [Op.in]: asientos }, sala_id: funcion.sala_id },
  });
  if (asientosSala.length !== asientos.length) {
    throw new ErrorApp('Algún asiento no pertenece a la sala de esta función', 400);
  }

  // ── Ninguno debe estar ya vendido para esta función ────────
  const yaVendidos = await Boleto.findAll({
    where: { funcion_id, asiento_id: { [Op.in]: asientos } },
  });
  if (yaVendidos.length > 0) {
    throw new ErrorApp('Uno o más asientos ya fueron ocupados', 409);
  }

  // ── Cálculo de importes ────────────────────────────────────
  const precio    = Number(funcion.pelicula.precio);
  const cantidad  = asientos.length;
  const subtotal  = precio * cantidad;
  const conMembresia = !!usuario.membresia;
  const descuento = conMembresia ? +(subtotal * DESCUENTO_MEMBRESIA).toFixed(2) : 0;
  const total     = +(subtotal - descuento).toFixed(2);
  const codigo    = generarCodigoCompra();

  // ── Transacción: compra + boletos ──────────────────────────
  const resultado = await sequelize.transaction(async (t) => {
    const compra = await Compra.create({
      codigo,
      usuario_id: usuarioId,
      funcion_id,
      cliente_nombre: cliente_nombre || usuario.nombre,
      cantidad,
      con_membresia: conMembresia,
      subtotal,
      descuento,
      total,
    }, { transaction: t });

    const mapaAsientos = Object.fromEntries(asientosSala.map(a => [a.id, a.codigo]));

    for (const asientoId of asientos) {
      const codigoAsiento = mapaAsientos[asientoId];
      await Boleto.create({
        compra_id:  compra.id,
        funcion_id,
        asiento_id: asientoId,
        folio:      generarFolio(codigo, codigoAsiento),
        codigo_qr:  contenidoQR({
          codigo,
          cliente:  cliente_nombre || usuario.nombre,
          pelicula: funcion.pelicula.titulo,
          sala:     funcion.sala.nombre,
          horario:  funcion.horario,
          asiento:  codigoAsiento,
          total,
        }),
      }, { transaction: t });
    }

    return compra;
  });

  return obtenerPorId(resultado.id, usuarioId, false);
}

/**
 * Devuelve una compra con su detalle (boletos, película, sala).
 * Si esCliente=true, valida que la compra pertenezca al usuario.
 */
async function obtenerPorId(compraId, usuarioId, restringirAlUsuario = true) {
  const compra = await Compra.findByPk(compraId, {
    include: [
      { model: Funcion, as: 'funcion', include: [
        { model: Pelicula, as: 'pelicula' },
        { model: Sala, as: 'sala' },
      ] },
      { model: Boleto, as: 'boletos', include: [{ model: Asiento, as: 'asiento' }] },
    ],
  });
  if (!compra) throw new ErrorApp('Compra no encontrada', 404);
  if (restringirAlUsuario && compra.usuario_id !== usuarioId) {
    throw new ErrorApp('No tienes acceso a esta compra', 403);
  }
  return compra;
}

/** Lista las compras de un usuario (sus boletos). */
async function misCompras(usuarioId) {
  return Compra.findAll({
    where: { usuario_id: usuarioId },
    include: [
      { model: Funcion, as: 'funcion', include: [
        { model: Pelicula, as: 'pelicula' },
        { model: Sala, as: 'sala' },
      ] },
      { model: Boleto, as: 'boletos', include: [{ model: Asiento, as: 'asiento' }] },
    ],
    order: [['fecha', 'DESC']],
  });
}

module.exports = { crear, obtenerPorId, misCompras };
