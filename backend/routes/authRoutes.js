const { Router } = require('express');
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');

const router = Router();

router.post('/register', authController.registrar);
router.post('/login', authController.login);
router.get('/me', auth, authController.perfil);

module.exports = router;
