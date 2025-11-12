import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db.js';
import { google } from 'googleapis';
import { saveTokens } from '../helpers/tokenStore.js';
import '../bootstrap/env.js';
import { makeStateCookie, verifyStateCookie } from '../helpers/cookieState.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/google/callback`
);

export function authGoogle(req, res) {
  // sinh CSRF token & set cookie
  const state = makeStateCookie(res);

  // Lưu redirect URL vào session cookie nếu có
  const redirectBack = req.query.redirect;
  if (redirectBack) {
    res.cookie('oauth_redirect', redirectBack, {
      maxAge: 10 * 60 * 1000, // 10 minutes
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    state,
  });
  // redirect tới trang Google OAuth
  res.redirect(url);
}

export async function googleCallback(req, res) {
  console.log('🔐 Google OAuth callback received');
  console.log('Query params:', req.query);
  console.log('Cookies:', req.cookies);
  
  const { code, state } = req.query;

  // 1️⃣ Xác thực state bằng cookie chống CSRF
  if (!verifyStateCookie(req, state)) {
    console.error('❌ CSRF verification failed');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=csrf`);
  }
  res.clearCookie('oauth_state');
  console.log('✅ CSRF verification passed');

  try {
    console.log('🔄 Exchanging code for tokens...');
    // 2️⃣ Đổi code ⇢ tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('✅ Tokens received');

    console.log('🔄 Fetching user profile from Google...');
    // 3️⃣ Lấy thông tin người dùng từ Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();
    console.log('✅ Profile received:', { email: profile.email, name: profile.name });

    const email = profile.email;
    const name = profile.name || profile.email.split('@')[0];
    const googleId = profile.id;
    const picture = profile.picture;

    if (!email) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=no_email`);
    }

    // 4️⃣ Tìm hoặc tạo user trong database
    let [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    let user = users[0];

    if (!user) {
      console.log('🆕 Creating new user from Google OAuth:', { email, name });
      // Tạo user mới nếu chưa có
      // Note: password_hash có thể NULL cho OAuth users
      try {
        const [result] = await pool.execute(
          `INSERT INTO users (name, email, password_hash, role, email_verified, avatar_url, last_login_at) 
           VALUES (?, ?, NULL, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [name, email, 'user', true, picture]
        );
        user = {
          id: result.insertId,
          name,
          email,
          role: 'user',
          email_verified: true,
          avatar_url: picture,
        };
        console.log('✅ New user created successfully:', { id: user.id, email: user.email });
      } catch (insertError) {
        console.error('❌ Error creating new user:', insertError);
        // Nếu lỗi do password_hash NOT NULL, thử với empty string
        if (insertError.code === 'ER_BAD_NULL_ERROR' && insertError.sqlMessage?.includes('password_hash')) {
          console.log('🔄 Retrying with empty password_hash...');
          const [result] = await pool.execute(
            `INSERT INTO users (name, email, password_hash, role, email_verified, avatar_url, last_login_at) 
             VALUES (?, ?, '', ?, ?, ?, CURRENT_TIMESTAMP)`,
            [name, email, 'user', true, picture]
          );
          user = {
            id: result.insertId,
            name,
            email,
            role: 'user',
            email_verified: true,
            avatar_url: picture,
          };
          console.log('✅ New user created with empty password_hash:', { id: user.id, email: user.email });
        } else {
          throw insertError;
        }
      }
    } else {
      console.log('✅ Existing user found:', { id: user.id, email: user.email });
      // Update last_login_at
      await pool.execute(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
      
      // Update avatar if available and user doesn't have one
      if (picture && !user.avatar_url) {
        await pool.execute(
          'UPDATE users SET avatar_url = ? WHERE id = ?',
          [picture, user.id]
        );
      }
    }

    // 5️⃣ Lưu OAuth provider info vào user_oauth_providers
    // Encrypt tokens (simple base64 for now, can improve with proper encryption)
    const accessTokenEncrypted = Buffer.from(tokens.access_token || '').toString('base64');
    const refreshTokenEncrypted = tokens.refresh_token 
      ? Buffer.from(tokens.refresh_token).toString('base64')
      : null;

    // Check if OAuth provider already linked
    const [existingProviders] = await pool.execute(
      'SELECT * FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
      [user.id, 'google']
    );

    if (existingProviders.length === 0) {
      // Insert new OAuth provider link
      await pool.execute(
        `INSERT INTO user_oauth_providers 
         (user_id, provider, provider_user_id, provider_email, access_token_encrypted, refresh_token_encrypted)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, 'google', googleId, email, accessTokenEncrypted, refreshTokenEncrypted]
      );
    } else {
      // Update existing OAuth provider link
      await pool.execute(
        `UPDATE user_oauth_providers 
         SET provider_user_id = ?, provider_email = ?, access_token_encrypted = ?, refresh_token_encrypted = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND provider = ?`,
        [googleId, email, accessTokenEncrypted, refreshTokenEncrypted, user.id, 'google']
      );
    }

    // 6️⃣ Kiểm tra nếu user mới (chưa có password) - yêu cầu set password
    const [userCheck] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [user.id]
    );
    const hasPassword = userCheck[0]?.password_hash && userCheck[0].password_hash.trim() !== '';
    const isNewUser = !hasPassword;

    // 7️⃣ Tạo JWT token
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 8️⃣ Save session to database
    const tokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

    await pool.execute(
      `INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, tokenHash, deviceInfo, ipAddress, req.headers['user-agent'] || null, expiresAt]
    );

    // 9️⃣ Redirect về frontend
    const redirectUrl = req.cookies.oauth_redirect || '/';
    res.clearCookie('oauth_redirect');
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Nếu user mới (chưa có password), redirect đến trang set password
    if (isNewUser) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      const redirectTo = `${frontendUrl}/set-password${separator}token=${jwtToken}&role=${user.role}&id=${user.id}&newUser=true`;
      console.log('🆕 New OAuth user - Redirecting to set password page:', redirectTo);
      console.log('User:', { id: user.id, email: user.email, role: user.role });
      return res.redirect(redirectTo);
    }
    
    // User đã có password, redirect bình thường
    const separator = redirectUrl.includes('?') ? '&' : '?';
    const redirectTo = `${frontendUrl}${separator}token=${jwtToken}&role=${user.role}&id=${user.id}`;
    
    console.log('✅ OAuth successful! Redirecting to:', redirectTo);
    console.log('User:', { id: user.id, email: user.email, role: user.role });
    
    res.redirect(redirectTo);
  } catch (error) {
    console.error('❌ Error in Google OAuth callback:', error);
    console.error('Error stack:', error.stack);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
  }
}

/**
 * Đăng ký tài khoản người dùng mới.
 * Nhận thông tin username, password từ request body và tạo tài khoản mới nếu chưa tồn tại.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function register(req, res) {
  const { name, email, password, role = 'user' } = req.body;

  // ✅ Chỉ cho phép 'user' hoặc 'admin'
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role không hợp lệ' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, role]
    );
    res.json({ message: 'Registered' });
  } catch (err) {
    console.error('❌ Lỗi khi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server khi đăng ký' });
  }
}

/**
 * Đăng nhập tài khoản người dùng.
 * Kiểm tra username, password từ request body, trả về token hoặc thông báo lỗi nếu sai thông tin.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function login(req, res) {
  const { email, password } = req.body;
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [
    email,
  ]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Login failed' });
  }
  
  // Update last_login_at
  await pool.execute(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );
  
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' } // 30 days expiry
  );

  // Save session to database
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  // Get device info from request
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

  await pool.execute(
    `INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, tokenHash, deviceInfo, ipAddress, req.headers['user-agent'] || null, expiresAt]
  );

  res.json({ token, role: user.role, id: user.id });
}
