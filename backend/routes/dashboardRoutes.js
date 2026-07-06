const { Router } = require('express');
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middlewares/auth');
const soloAdmin = require('../middlewares/soloAdmin');

const router = Router();

// Solo administradores: primero auth (identifica), luego soloAdmin (autoriza)
router.get('/dashboard', auth, soloAdmin, dashboardController.resumen);
router.get('/ventas', auth, soloAdmin, dashboardController.ventas);

module.exports = router;
