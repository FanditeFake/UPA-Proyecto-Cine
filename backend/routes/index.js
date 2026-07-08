/**
 * Enrutador principal: agrupa todas las rutas bajo /api.
 */
const { Router } = require('express');

const authRoutes      = require('./authRoutes');
const peliculaRoutes  = require('./peliculaRoutes');
const funcionRoutes   = require('./funcionRoutes');
const compraRoutes    = require('./compraRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const adminRoutes     = require('./adminRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/peliculas', peliculaRoutes);
router.use('/funciones', funcionRoutes);
router.use('/compras', compraRoutes);
router.use('/admin', dashboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
