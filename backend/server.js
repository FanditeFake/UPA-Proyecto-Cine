/**
 * Punto de entrada del backend CineMax.
 * Configura Express, CORS, las rutas de la API y el manejo de errores,
 * y arranca el servidor tras verificar la conexión a la base de datos.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { probarConexion } = require('./config/db');
const rutas = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middlewares globales ───────────────────────────────────
app.use(cors());              // permite peticiones desde el frontend
app.use(express.json());      // parsea cuerpos JSON

// ── Ruta de salud ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'API CineMax funcionando', version: '1.0.0' });
});

// ── Rutas de la API ────────────────────────────────────────
app.use('/api', rutas);

// ── 404 para rutas no encontradas ──────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

// ── Manejo central de errores (siempre al final) ───────────
app.use(errorHandler);

// ── Arranque ───────────────────────────────────────────────
async function iniciar() {
  const conectado = await probarConexion();
  if (!conectado) {
    console.error('⚠️  El servidor arrancará, pero la base de datos no responde.');
    console.error('    Verifica que el contenedor esté arriba: docker compose up -d');
  }
  app.listen(PORT, () => {
    console.log(`🚀 Servidor CineMax escuchando en http://localhost:${PORT}`);
  });
}

iniciar();

module.exports = app; // útil para pruebas
