/**
 * Punto central de los modelos.
 * Aquí se definen las RELACIONES (foreign keys) entre las tablas y se
 * exportan todos los modelos junto con la instancia de sequelize.
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
Sala.hasMany(Asiento,  { foreignKey: 'sala_id' });
Asiento.belongsTo(Sala, { foreignKey: 'sala_id' });

// Una película tiene muchas funciones
Pelicula.hasMany(Funcion,  { foreignKey: 'pelicula_id' });
Funcion.belongsTo(Pelicula, { foreignKey: 'pelicula_id' });

// Una sala tiene muchas funciones
Sala.hasMany(Funcion,  { foreignKey: 'sala_id' });
Funcion.belongsTo(Sala, { foreignKey: 'sala_id' });

// Un usuario hace muchas compras
Usuario.hasMany(Compra,  { foreignKey: 'usuario_id' });
Compra.belongsTo(Usuario, { foreignKey: 'usuario_id' });

// Una función tiene muchas compras
Funcion.hasMany(Compra,  { foreignKey: 'funcion_id' });
Compra.belongsTo(Funcion, { foreignKey: 'funcion_id' });

// Una compra tiene muchos boletos
Compra.hasMany(Boleto,  { foreignKey: 'compra_id' });
Boleto.belongsTo(Compra, { foreignKey: 'compra_id' });

// Una función tiene muchos boletos
Funcion.hasMany(Boleto,  { foreignKey: 'funcion_id' });
Boleto.belongsTo(Funcion, { foreignKey: 'funcion_id' });

// Un asiento puede estar en muchos boletos (en distintas funciones)
Asiento.hasMany(Boleto,  { foreignKey: 'asiento_id' });
Boleto.belongsTo(Asiento, { foreignKey: 'asiento_id' });

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
