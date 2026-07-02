const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Mapea la tabla "asientos" de cinemax.sql
const Asiento = sequelize.define('asientos', {
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sala_id: { type: DataTypes.INTEGER, allowNull: false },
  fila:    { type: DataTypes.CHAR(1), allowNull: false },   // A, B, C, D
  numero:  { type: DataTypes.TINYINT, allowNull: false },   // 1 a 5
  codigo:  { type: DataTypes.STRING(10), allowNull: false }, // ej: A1, D5
});

module.exports = Asiento;
