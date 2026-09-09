const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Se requiere un token de autenticacion.' });
  }

  try {
    const payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'El token no es valido o ha vencido.' });
  }
}

module.exports = { authenticate };
