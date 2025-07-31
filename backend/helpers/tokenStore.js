import crypto from 'crypto';
import pool from '../db.js';

const HMAC_KEY = Buffer.from(process.env.HMAC_KEY, 'hex');

function signAndEncode(json) {
  const payload = Buffer.from(json, 'utf8').toString('base64');
  const sig = crypto.createHmac('sha256', HMAC_KEY).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyAndDecode(str) {
  if (typeof str !== 'string' || !str.includes('.')) {
    throw new Error('Invalid token format');
  }

  const [payload, sig] = str.split('.');

  const expectedSig = crypto
    .createHmac('sha256', HMAC_KEY)
    .update(payload)
    .digest('hex');

  if (
    !crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    )
  ) {
    throw new Error('Token HMAC verification failed');
  }

  const json = Buffer.from(payload, 'base64').toString('utf8');
  const data = JSON.parse(json);

  if (data.body) {
    data.body = sanitizeBody(data.body);
  }

  return data;
}

function sanitizeBody(str) {
  return str.trim();
}

export async function saveTokens(email, tokens) {
  const encoded = signAndEncode(JSON.stringify(tokens));

  await pool.execute(
    `INSERT INTO google_tokens (email, tokens_encrypted)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         tokens_encrypted = VALUES(tokens_encrypted),
         updated_at       = CURRENT_TIMESTAMP`,
    [email, encoded]
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

  const str = rows[0].tokens_encrypted.toString();
  return verifyAndDecode(str);
}