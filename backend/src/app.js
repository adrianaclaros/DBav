const express = require('express');
const cors = require('cors');
const { healthCheck } = require('./controllers/health.controller');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

app.get('/api/health', healthCheck);
app.use('/api/auth', authRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada.' }));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'El JSON enviado no es valido.' });
  }
  return res.status(500).json({ message: 'Ocurrio un error interno del servidor.' });
});

module.exports = app;
