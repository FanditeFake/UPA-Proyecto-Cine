/**
 * Conexión a la base de datos MySQL usando Sequelize.
 *
 * Lee la configuración desde las variables de entorno (.env).
 * Copia backend/.env.example a backend/.env y ajusta los valores si es necesario.
 *
 * Uso desde otros archivos:
 *    const { sequelize } = require('./config/db');
 *    await sequelize.authenticate();   // probar conexión
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'cinemax_db',
  process.env.DB_USER || 'cinemax_user',
  process.env.DB_PASSWORD || 'cinemax_pass',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // pon console.log para ver las queries que genera Sequelize

    // Zona horaria del centro de México. Se usa al ESCRIBIR fechas para que
    // NOW()/CURRENT_TIMESTAMP queden en hora local y no en UTC.
    timezone: process.env.DB_TIMEZONE || '-06:00',

    dialectOptions: {
      // Devuelve DATETIME/DATE/TIMESTAMP como TEXTO tal cual está guardado
      // (ej: "2026-07-06 19:30:00"). Evita que JavaScript los convierta a UTC
      // y "corra" el día u hora. Así el horario que se guarda es el que se
      // muestra, sin confusiones de zona horaria.
      dateStrings: true,
      typeCast: true,
    },

    define: {
      // Nuestras tablas NO usan las columnas createdAt/updatedAt de Sequelize.
      // El esquema lo define cinemax.sql, así que desactivamos los timestamps
      // automáticos y usamos los nombres de tabla tal cual.
      timestamps: false,
      freezeTableName: true,
    },
  }
);

/**
 * Prueba la conexión. Devuelve true si conecta, false si falla.
 */
async function probarConexion() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a MySQL:', error.message);
    return false;
  }
}

module.exports = { sequelize, probarConexion };
