const pool = require('../config/db');

async function healthCheck(_req, res, next) {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    return res.status(503).json({ status: 'error', db: 'disconnected' });
  }
}

module.exports = { healthCheck };
