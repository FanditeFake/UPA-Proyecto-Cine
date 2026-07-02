const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Mapea la tabla "compras" (cabecera de venta) de cinemax.sql
const Compra = sequelize.define('compras', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo:         { type: DataTypes.STRING(20), allowNull: false, unique: true }, // ej: CMX-1001
  usuario_id:     { type: DataTypes.INTEGER, allowNull: false },
  funcion_id:     { type: DataTypes.INTEGER, allowNull: false },
  cliente_nombre: { type: DataTypes.STRING(100), allowNull: false },
  cantidad:       { type: DataTypes.TINYINT, allowNull: false },
  con_membresia:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  subtotal:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  descuento:      { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  total:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  fecha:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

module.exports = Compra;
