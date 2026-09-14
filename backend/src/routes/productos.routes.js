const express = require('express');
const { listProductosDisponibles } = require('../controllers/productos.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', listProductosDisponibles);

module.exports = router;