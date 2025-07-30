// helpers/tokenStore.js
import crypto from 'crypto';
import pool from '../db.js';

const AES_KEY = Buffer.from(process.env.AES_KEY, 'hex'); // 32-byte (AES-256)

/* ---------- helpers ---------- */
function encrypt(json) {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const enc    = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(b64) {
  const buf      = Buffer.from(b64, 'base64');
  const iv       = buf.slice(0, 16);
  const tag      = buf.slice(16, 32);
  const enc      = buf.slice(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc, null, 'utf8') + decipher.final('utf8');
}

/* ---------- API ---------- */
export async function saveTokens(email, tokens) {
  const enc = encrypt(JSON.stringify(tokens));

  await pool.execute(
    `INSERT INTO google_tokens (email, tokens_encrypted)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         tokens_encrypted = VALUES(tokens_encrypted),
         updated_at       = CURRENT_TIMESTAMP`,
    [email, enc]
  );
}

export async function loadTokens(email) {
  const [rows] = await pool.execute(
    `SELECT tokens_encrypted
       FROM google_tokens
      WHERE email = ?`,
    [email]
  );
  if (rows.length === 0) return null;
  return JSON.parse(decrypt(rows[0].tokens_encrypted));
}
