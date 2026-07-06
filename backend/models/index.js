/**
 * Punto central de los modelos.
 * Aquí se definen las RELACIONES (foreign keys) entre las tablas y se
 * exportan todos los modelos junto con la instancia de sequelize.
 *
 * Se usan ALIAS explícitos (as: ...) para que las claves de las respuestas
 * JSON sean predecibles al usar include, por ejemplo:
 *    funcion.pelicula, funcion.sala, compra.boletos, boleto.asiento
 *
 * Uso desde otros archivos:
 *    const { Pelicula, Funcion, Sala } = require('./models');
 *    const peliculas = await Pelicula.findAll();
 */
const { sequelize } = require('../config/db');

const Usuario  = require('./Usuario');
const Pelicula = require('./Pelicula');
const Sala     = require('./Sala');
const Asiento  = require('./Asiento');
const Funcion  = require('./Funcion');
const Compra   = require('./Compra');
const Boleto   = require('./Boleto');

// ── Relaciones ────────────────────────────────────────────────

// Una sala tiene muchos asientos
Sala.hasMany(Asiento,   { foreignKey: 'sala_id', as: 'asientos' });
Asiento.belongsTo(Sala, { foreignKey: 'sala_id', as: 'sala' });

// Una película tiene muchas funciones
Pelicula.hasMany(Funcion,   { foreignKey: 'pelicula_id', as: 'funciones' });
Funcion.belongsTo(Pelicula, { foreignKey: 'pelicula_id', as: 'pelicula' });

// Una sala tiene muchas funciones
Sala.hasMany(Funcion,   { foreignKey: 'sala_id', as: 'funciones' });
Funcion.belongsTo(Sala, { foreignKey: 'sala_id', as: 'sala' });

// Un usuario hace muchas compras
Usuario.hasMany(Compra,   { foreignKey: 'usuario_id', as: 'compras' });
Compra.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Una función tiene muchas compras
Funcion.hasMany(Compra,   { foreignKey: 'funcion_id', as: 'compras' });
Compra.belongsTo(Funcion, { foreignKey: 'funcion_id', as: 'funcion' });

// Una compra tiene muchos boletos
Compra.hasMany(Boleto,   { foreignKey: 'compra_id', as: 'boletos' });
Boleto.belongsTo(Compra, { foreignKey: 'compra_id', as: 'compra' });

// Una función tiene muchos boletos
Funcion.hasMany(Boleto,   { foreignKey: 'funcion_id', as: 'boletos' });
Boleto.belongsTo(Funcion, { foreignKey: 'funcion_id', as: 'funcion' });

// Un asiento puede estar en muchos boletos (en distintas funciones)
Asiento.hasMany(Boleto,   { foreignKey: 'asiento_id', as: 'boletos' });
Boleto.belongsTo(Asiento, { foreignKey: 'asiento_id', as: 'asiento' });

module.exports = {
  sequelize,
  Usuario,
  Pelicula,
  Sala,
  Asiento,
  Funcion,
  Compra,
  Boleto,
};
