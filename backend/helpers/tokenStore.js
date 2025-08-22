import crypto from 'crypto';
import pool from '../db.js';
import { google } from 'googleapis';

const HMAC_KEY = Buffer.from(process.env.HMAC_KEY, 'hex');

// OAuth2 client for token refresh
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

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
  const accessTokenData = {
    access_token: tokens.access_token,
    scope: tokens.scope,
    token_type: tokens.token_type
  };
  
  const encodedAccessToken = signAndEncode(JSON.stringify(accessTokenData));
  const encodedRefreshToken = tokens.refresh_token ? signAndEncode(tokens.refresh_token) : null;
  
  // Calculate expiry time (default 1 hour if not provided)
  const expiresInMs = (tokens.expires_in || 3600) * 1000;
  const expiryTime = new Date(Date.now() + expiresInMs);

  await pool.execute(
    `INSERT INTO google_tokens (
       email, tokens_encrypted, access_token_expires_at, 
       refresh_token_encrypted, refresh_attempts, last_refresh_at
     ) VALUES (?, ?, ?, ?, 0, NULL)
     ON DUPLICATE KEY UPDATE
       tokens_encrypted = VALUES(tokens_encrypted),
       access_token_expires_at = VALUES(access_token_expires_at),
       refresh_token_encrypted = COALESCE(VALUES(refresh_token_encrypted), refresh_token_encrypted),
       updated_at = CURRENT_TIMESTAMP`,
    [email, encodedAccessToken, expiryTime, encodedRefreshToken]
  );
}

export async function loadTokens(email) {
  const [rows] = await pool.execute(
    `SELECT tokens_encrypted, access_token_expires_at, 
            refresh_token_encrypted, refresh_attempts
       FROM google_tokens
      WHERE email = ?`,
    [email]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  
  try {
    const accessTokenStr = row.tokens_encrypted.toString();
    const accessTokenData = verifyAndDecode(accessTokenStr);
    
    const expiryTime = row.access_token_expires_at;
    const now = new Date();
    const timeUntilExpiry = expiryTime - now;
    
    // Proactive refresh if expiring in less than 60 seconds
    if (timeUntilExpiry < 60000 && row.refresh_token_encrypted) {
      console.log(`🔄 Token expires in ${Math.floor(timeUntilExpiry/1000)}s, refreshing proactively...`);
      return await refreshAccessToken(email);
    }
    
    // Return existing token if still valid
    return {
      access_token: accessTokenData.access_token,
      scope: accessTokenData.scope,
      token_type: accessTokenData.token_type,
      expires_at: expiryTime
    };
  } catch (error) {
    console.error(`❌ Token decode error for ${email}:`, error.message);
    console.log('🗑️ Cleaning up corrupted token data...');
    
    // Clean up corrupted token data
    await pool.execute('DELETE FROM google_tokens WHERE email = ?', [email]);
    
    throw new Error('Token data corrupted. Please re-authenticate via /auth/google');
  }
}

export async function refreshAccessToken(email) {
  const [rows] = await pool.execute(
    `SELECT refresh_token_encrypted, refresh_attempts
     FROM google_tokens
     WHERE email = ?`,
    [email]
  );
  
  if (rows.length === 0 || !rows[0].refresh_token_encrypted) {
    throw new Error('No refresh token found for user');
  }

  const row = rows[0];
  const refreshToken = verifyAndDecode(row.refresh_token_encrypted.toString());
  
  // Increment refresh attempts for monitoring
  await pool.execute(
    `UPDATE google_tokens 
     SET refresh_attempts = refresh_attempts + 1
     WHERE email = ?`,
    [email]
  );

  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    // Request new access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update database with new access token
    const newAccessTokenData = {
      access_token: credentials.access_token,
      scope: credentials.scope,
      token_type: credentials.token_type || 'Bearer'
    };
    
    const encodedAccessToken = signAndEncode(JSON.stringify(newAccessTokenData));
    const expiresInMs = (credentials.expires_in || 3600) * 1000;
    const newExpiryTime = new Date(Date.now() + expiresInMs);

    await pool.execute(
      `UPDATE google_tokens 
       SET tokens_encrypted = ?,
           access_token_expires_at = ?,
           last_refresh_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = ?`,
      [encodedAccessToken, newExpiryTime, email]
    );

    console.log(`✅ Successfully refreshed token for ${email}`);
    
    return {
      access_token: credentials.access_token,
      scope: credentials.scope,
      token_type: credentials.token_type || 'Bearer',
      expires_at: newExpiryTime
    };
    
  } catch (error) {
    console.error(`❌ Token refresh failed for ${email}:`, error.message);
    
    // If refresh fails, mark the refresh token as potentially invalid
    await pool.execute(
      `UPDATE google_tokens 
       SET refresh_token_encrypted = NULL
       WHERE email = ? AND refresh_attempts >= 3`,
      [email]
    );
    
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

// Utility function to check if token needs refresh
export async function checkTokenExpiry(email) {
  const [rows] = await pool.execute(
    `SELECT access_token_expires_at
     FROM google_tokens
     WHERE email = ?`,
    [email]
  );
  
  if (rows.length === 0) return { needsRefresh: true, reason: 'No token found' };
  
  const expiryTime = rows[0].access_token_expires_at;
  const now = new Date();
  const timeUntilExpiry = expiryTime - now;
  
  if (timeUntilExpiry < 0) {
    return { needsRefresh: true, reason: 'Token expired', expiresIn: timeUntilExpiry };
  }
  
  if (timeUntilExpiry < 60000) {
    return { needsRefresh: true, reason: 'Token expiring soon', expiresIn: timeUntilExpiry };
  }
  
  return { needsRefresh: false, expiresIn: timeUntilExpiry };
}

// Function to cleanup expired tokens (can be called by a cron job)
export async function cleanupExpiredTokens() {
  const result = await pool.execute(
    `DELETE FROM google_tokens 
     WHERE access_token_expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
     AND refresh_token_encrypted IS NULL`
  );
  
  console.log(`🗑️ Cleaned up ${result[0].affectedRows} expired tokens`);
  return result[0].affectedRows;
}