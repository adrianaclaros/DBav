const express = require('express');
const { getDashboard } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.get('/', getDashboard);

module.exports = router;
