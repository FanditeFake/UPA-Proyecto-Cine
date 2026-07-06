/**
 * Controlador del dashboard administrativo.
 */
const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin/dashboard
const resumen = asyncHandler(async (req, res) => {
  const [indicadores, porPelicula, porSala, porDia] = await Promise.all([
    dashboardService.indicadores(),
    dashboardService.ventasPorPelicula(),
    dashboardService.ventasPorSala(),
    dashboardService.ventasPorDia(),
  ]);
  res.json({ ok: true, indicadores, porPelicula, porSala, porDia });
});

// GET /api/admin/ventas
const ventas = asyncHandler(async (req, res) => {
  const ventas = await dashboardService.todasLasVentas();
  res.json({ ok: true, ventas });
});

module.exports = { resumen, ventas };
