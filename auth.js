const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { customAlphabet } = require('nanoid');

// Alfabeto sin caracteres que se confunden (0/O, 1/I/L)
const genCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 8);

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-esto-antes-de-produccion';

async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

async function checkPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.is_admin },
    JWT_SECRET,
    { expiresIn: '60d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Solo el administrador puede hacer esto' });
  }
  next();
}

module.exports = { hashPassword, checkPassword, signToken, requireAuth, requireAdmin, genCode };
