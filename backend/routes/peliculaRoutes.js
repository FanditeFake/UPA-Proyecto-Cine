const { Router } = require('express');
const peliculaController = require('../controllers/peliculaController');

const router = Router();

// Catálogo público (no requiere token)
router.get('/', peliculaController.listar);
router.get('/:id', peliculaController.obtener);

module.exports = router;
