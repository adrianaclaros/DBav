const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 12;

function validateCredentials(email, password, minimumPasswordLength = 8) {
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return 'Ingrese un correo electronico valido.';
  }
  if (typeof password !== 'string' || password.length < minimumPasswordLength) {
    return minimumPasswordLength === 1
      ? 'La contrasena es obligatoria.'
      : `La contrasena debe tener al menos ${minimumPasswordLength} caracteres.`;
  }
  return null;
}

function publicUser(user) {
  return { id: user.id, email: user.email, created_at: user.created_at };
}

async function register(req, res, next) {
  const { email, password } = req.body || {};
  const validationError = validateCredentials(email, password, 1);
  if (validationError) return res.status(400).json({ message: validationError });

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const [existing] = await pool.execute('SELECT id FROM Usuario WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (existing.length > 0) return res.status(409).json({ message: 'El correo ya esta registrado.' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      'INSERT INTO Usuario (email, password_hash) VALUES (?, ?)',
      [normalizedEmail, passwordHash]
    );
    const [users] = await pool.execute(
      'SELECT id, email, created_at FROM Usuario WHERE id = ?',
      [result.insertId]
    );
    return res.status(201).json({ user: publicUser(users[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El correo ya esta registrado.' });
    return next(error);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, created_at FROM Usuario WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Correo o contrasena incorrectos.' });
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });
    return res.status(200).json({ token, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, created_at FROM Usuario WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!users[0]) return res.status(404).json({ message: 'Usuario no encontrado.' });
    return res.status(200).json({ user: publicUser(users[0]) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, me };
