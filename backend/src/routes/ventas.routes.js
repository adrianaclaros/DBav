const express = require('express');
const { createVenta, listVentas, getVenta } = require('../controllers/ventas.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.post('/', createVenta);
router.get('/', listVentas);
router.get('/:id', getVenta);

module.exports = router;
