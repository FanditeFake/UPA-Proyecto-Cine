const { Router } = require('express');
const funcionController = require('../controllers/funcionController');

const router = Router();

// Cartelera pública
router.get('/', funcionController.listar);
router.get('/:id', funcionController.obtener);
router.get('/:id/asientos', funcionController.asientos);

module.exports = router;
