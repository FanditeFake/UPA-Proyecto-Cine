/**
 * Rutas administrativas de escritura (crear catálogo y mantenimiento).
 * Todas requieren token (auth) y rol administrador (soloAdmin).
 *
 * Se montan bajo /api/admin junto con dashboardRoutes.
 */
const { Router } = require('express');
const peliculaController = require('../controllers/peliculaController');
const funcionController = require('../controllers/funcionController');
const adminController = require('../controllers/adminController');
const auth = require('../middlewares/auth');
const soloAdmin = require('../middlewares/soloAdmin');

const router = Router();

// Alta de catálogo (la interfaz de admin las consume desde "Programación")
router.post('/peliculas', auth, soloAdmin, peliculaController.crear);
router.delete('/peliculas/:id', auth, soloAdmin, peliculaController.eliminar);
router.post('/funciones', auth, soloAdmin, funcionController.crear);

// Mantenimiento: restablecer la BD al estado inicial
router.post('/reset', auth, soloAdmin, adminController.resetear);

module.exports = router;
