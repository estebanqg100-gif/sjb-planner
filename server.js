require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const { hashPassword, checkPassword, signToken, requireAuth, requireAdmin, genCode } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Registro con código de invitación ----------
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body || {};
    if (!username || !password || !inviteCode) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Usuario o contraseña muy cortos' });
    }

    const code = inviteCode.trim().toUpperCase();
    const invite = await pool.query(
      'SELECT * FROM invite_codes WHERE code = $1 AND used_at IS NULL',
      [code]
    );
    if (invite.rowCount === 0) {
      return res.status(400).json({ error: 'Código de invitación inválido o ya usado' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Ese usuario ya existe' });
    }

    const hash = await hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1,$2) RETURNING id, username, is_admin',
      [username, hash]
    );
    const user = result.rows[0];

    await pool.query('UPDATE invite_codes SET used_by = $1, used_at = now() WHERE code = $2', [user.id, code]);
    await pool.query('INSERT INTO user_data (user_id) VALUES ($1)', [user.id]);

    res.json({ token: signToken(user), username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ---------- Login ----------
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rowCount === 0) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const user = result.rows[0];
    const ok = await checkPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    res.json({ token: signToken(user), username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ---------- El usuario cambia su propia contraseña con el código que le pasó el admin ----------
app.post('/api/reset-password', async (req, res) => {
  try {
    const { username, resetCode, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña nueva es muy corta' });
    }
    const code = (resetCode || '').trim().toUpperCase();
    const reset = await pool.query(
      'SELECT * FROM reset_codes WHERE code = $1 AND username = $2 AND used_at IS NULL',
      [code, username]
    );
    if (reset.rowCount === 0) return res.status(400).json({ error: 'Código inválido o ya usado' });

    const hash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);
    await pool.query('UPDATE reset_codes SET used_at = now() WHERE code = $1', [code]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ---------- Rutas de administrador (solo tú) ----------
app.post('/api/admin/invite-codes', requireAuth, requireAdmin, async (req, res) => {
  const code = genCode();
  await pool.query('INSERT INTO invite_codes (code, created_by) VALUES ($1,$2)', [code, req.user.id]);
  res.json({ code });
});

app.post('/api/admin/reset-codes', requireAuth, requireAdmin, async (req, res) => {
  const { username } = req.body || {};
  const user = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (user.rowCount === 0) return res.status(404).json({ error: 'Ese usuario no existe' });
  const code = genCode();
  await pool.query('INSERT INTO reset_codes (code, username) VALUES ($1,$2)', [code, username]);
  res.json({ code });
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT id, username, created_at FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

app.get('/api/admin/invite-codes', requireAuth, requireAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT ic.code, ic.created_at, ic.used_at, u.username AS used_by
     FROM invite_codes ic LEFT JOIN users u ON u.id = ic.used_by
     ORDER BY ic.created_at DESC`
  );
  res.json(result.rows);
});

// ---------- Datos del usuario autenticado (pendientes + evaluaciones marcadas) ----------
app.get('/api/me/data', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT pendientes, completed FROM user_data WHERE user_id = $1', [req.user.id]);
  res.json(result.rows[0] || { pendientes: [], completed: {} });
});

app.put('/api/me/data', requireAuth, async (req, res) => {
  const { pendientes, completed } = req.body || {};
  await pool.query(
    'UPDATE user_data SET pendientes = $1, completed = $2, updated_at = now() WHERE user_id = $3',
    [JSON.stringify(pendientes || []), JSON.stringify(completed || {}), req.user.id]
  );
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
