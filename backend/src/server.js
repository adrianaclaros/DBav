require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = require('./app');

const requiredVariables = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = requiredVariables.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`);
}

const port = Number(process.env.PORT || 3307);
app.listen(port, () => console.log(`Backend disponible en http://localhost:${port}`));
