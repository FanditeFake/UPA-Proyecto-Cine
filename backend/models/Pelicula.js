const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Mapea la tabla "peliculas" de cinemax.sql
const Pelicula = sequelize.define('peliculas', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  titulo:        { type: DataTypes.STRING(150), allowNull: false },
  sinopsis:      { type: DataTypes.TEXT, allowNull: true },
  duracion:      { type: DataTypes.SMALLINT, allowNull: false }, // minutos
  clasificacion: { type: DataTypes.ENUM('AA', 'A', 'B', 'B15', 'C', 'D'), allowNull: false, defaultValue: 'B' },
  genero:        { type: DataTypes.STRING(80), allowNull: false },
  precio:        { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  activa:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
});

module.exports = Pelicula;
