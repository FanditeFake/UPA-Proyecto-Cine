const { Router } = require('express');
const compraController = require('../controllers/compraController');
const auth = require('../middlewares/auth');

const router = Router();

// Todas requieren usuario autenticado
router.post('/', auth, compraController.crear);
router.get('/mias', auth, compraController.misCompras);
router.get('/:id', auth, compraController.obtener);

module.exports = router;
