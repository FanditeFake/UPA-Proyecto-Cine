const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Mapea la tabla "boletos" (un asiento por fila) de cinemax.sql
const Boleto = sequelize.define('boletos', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  compra_id:  { type: DataTypes.INTEGER, allowNull: false },
  funcion_id: { type: DataTypes.INTEGER, allowNull: false },
  asiento_id: { type: DataTypes.INTEGER, allowNull: false },
  folio:      { type: DataTypes.STRING(60), allowNull: false, unique: true },
  codigo_qr:  { type: DataTypes.TEXT, allowNull: true },
});

module.exports = Boleto;
