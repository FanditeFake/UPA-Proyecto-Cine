const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Mapea la tabla "usuarios" de cinemax.sql
const Usuario = sequelize.define('usuarios', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:     { type: DataTypes.STRING(100), allowNull: false },
  correo:     { type: DataTypes.STRING(150), allowNull: false, unique: true },
  contrasena: { type: DataTypes.STRING(255), allowNull: false }, // hash bcrypt
  rol:        { type: DataTypes.ENUM('cliente', 'administrador'), allowNull: false, defaultValue: 'cliente' },
  membresia:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

module.exports = Usuario;
