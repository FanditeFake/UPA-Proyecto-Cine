/**
 * Controlador del dashboard administrativo.
 */
const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../utils/asyncHandler');
const { validarRangoFechas } = require('../utils/fechas');

// GET /api/admin/dashboard
// Devuelve indicadores, tablas resumen y los datos listos para las gráficas.
const resumen = asyncHandler(async (req, res) => {
  const [indicadores, porPelicula, porSala, porDia] = await Promise.all([
    dashboardService.indicadores(),
    dashboardService.ventasPorPelicula(),
    dashboardService.ventasPorSala(),
    dashboardService.ventasPorDia(),
  ]);

  // Datos listos para Chart.js (labels + datasets). Sin consultar de nuevo.
  const graficas = dashboardService.construirGraficas({ porDia, porPelicula, porSala });

  res.json({ ok: true, indicadores, porPelicula, porSala, porDia, graficas });
});

// GET /api/admin/ventas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// El rango de fechas es opcional y se valida (formato, fecha real, desde<=hasta).
const ventas = asyncHandler(async (req, res) => {
  const filtro = validarRangoFechas(req.query);
  const ventas = await dashboardService.todasLasVentas(filtro);
  res.json({ ok: true, filtro, total: ventas.length, ventas });
});

module.exports = { resumen, ventas };
