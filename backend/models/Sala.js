const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Mapea la tabla "salas" de cinemax.sql
const Sala = sequelize.define('salas', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:    { type: DataTypes.STRING(80), allowNull: false },
  capacidad: { type: DataTypes.SMALLINT, allowNull: false },
});

module.exports = Sala;
