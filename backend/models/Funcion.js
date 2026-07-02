const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Mapea la tabla "funciones" de cinemax.sql
const Funcion = sequelize.define('funciones', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  pelicula_id: { type: DataTypes.INTEGER, allowNull: false },
  sala_id:     { type: DataTypes.INTEGER, allowNull: false },
  horario:     { type: DataTypes.DATE, allowNull: false },
});

module.exports = Funcion;
