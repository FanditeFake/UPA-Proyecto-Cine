/**
 * Generación de códigos de compra y folios de boletos.
 */

/**
 * Código de compra tipo CMX-1234 (mismo formato que usa el frontend).
 */
function generarCodigoCompra() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `CMX-${n}`;
}

/**
 * Folio único de un boleto dentro de una compra.
 * @param {string} codigoCompra  ej: CMX-1234
 * @param {string} asiento       ej: A1
 */
function generarFolio(codigoCompra, asiento) {
  return `${codigoCompra}-${asiento}`;
}

/**
 * Contenido de texto que irá dentro del código QR del boleto.
 */
function contenidoQR({ codigo, cliente, pelicula, sala, horario, asiento, total }) {
  return [
    `Codigo: ${codigo}`,
    `Cliente: ${cliente}`,
    `Pelicula: ${pelicula}`,
    `Sala: ${sala}`,
    `Horario: ${horario}`,
    `Asiento: ${asiento}`,
    `Total: $${total}`,
  ].join('\n');
}

module.exports = { generarCodigoCompra, generarFolio, contenidoQR };
