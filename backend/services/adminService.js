/**
 * Operaciones administrativas de mantenimiento.
 *
 * resetearBaseDeDatos(): vuelve la BD a su estado inicial re-ejecutando el
 * script semilla database/cinemax.sql (borra y recrea todas las tablas y
 * vuelve a insertar los datos de ejemplo). Útil para dejar la demo limpia.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { ErrorApp } = require('../utils/errores');

const SQL_PATH = path.join(__dirname, '..', 'database', 'cinemax.sql');

/**
 * Ejecuta el script cinemax.sql completo en una conexión dedicada.
 *
 * - Se usa una conexión mysql2 aparte con `multipleStatements: true` para
 *   correr todo el archivo de una sola vez SIN habilitar multi-statements en
 *   la conexión normal de Sequelize (que queda protegida).
 * - Se quitan las sentencias CREATE DATABASE y USE porque la conexión ya
 *   apunta a la BD y el usuario de la app podría no tener privilegio para
 *   crear bases de datos. El resto del script (DROP/CREATE TABLE, INSERT,
 *   CREATE VIEW) sí está permitido dentro de su propia base.
 */
async function resetearBaseDeDatos() {
  let sql;
  try {
    sql = fs.readFileSync(SQL_PATH, 'utf8');
  } catch (e) {
    throw new ErrorApp('No se encontró el script database/cinemax.sql', 500);
  }

  // Elimina el preámbulo que requiere privilegios de servidor / cambia de BD.
  sql = sql
    .replace(/CREATE\s+DATABASE[\s\S]*?;/i, '')
    .replace(/USE\s+`?cinemax_db`?\s*;/i, '');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'cinemax_user',
    password: process.env.DB_PASSWORD || 'cinemax_pass',
    database: process.env.DB_NAME || 'cinemax_db',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

module.exports = { resetearBaseDeDatos };
