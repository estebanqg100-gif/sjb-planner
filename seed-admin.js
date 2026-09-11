require('dotenv').config();
const pool = require('./db');
const { hashPassword } = require('./auth');

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];
  if (!username || !password) {
    console.log('Uso: node seed-admin.js tu_usuario tu_contraseña');
    process.exit(1);
  }

  const hash = await hashPassword(password);
  await pool.query(
    `INSERT INTO users (username, password_hash, is_admin)
     VALUES ($1, $2, true)
     ON CONFLICT (username) DO UPDATE SET is_admin = true, password_hash = $2`,
    [username, hash]
  );
  const user = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  await pool.query('INSERT INTO user_data (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.rows[0].id]);

  console.log(`Cuenta admin creada/actualizada: ${username}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
