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
  const oauthMode = req.cookies.oauth_mode; // 'link' or undefined (login)
  const linkUserId = req.cookies.oauth_link_user_id;

  console.log('OAuth mode:', oauthMode);
  console.log('Link user ID:', linkUserId);

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

    // Encrypt tokens (simple base64 for now, can improve with proper encryption)
    const accessTokenEncrypted = Buffer.from(tokens.access_token || '').toString('base64');
    const refreshTokenEncrypted = tokens.refresh_token 
      ? Buffer.from(tokens.refresh_token).toString('base64')
      : null;

    // 4️⃣ Xử lý link mode hoặc login mode
    if (oauthMode === 'link' && linkUserId) {
      // Link mode: Link Google account to existing user
      console.log('🔗 Linking Google account to user:', linkUserId);
      res.clearCookie('oauth_link_user_id');
      res.clearCookie('oauth_mode');

      const userId = parseInt(linkUserId);
      
      // Verify user exists
      const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=user_not_found`);
      }

      // Check if this Google account is already linked to another user
      const [existingLink] = await pool.execute(
        'SELECT user_id FROM user_oauth_providers WHERE provider = ? AND provider_user_id = ?',
        ['google', googleId]
      );

      if (existingLink.length > 0 && existingLink[0].user_id !== userId) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=already_linked_to_another_account`);
      }

      // Check if already linked to this user
      const [alreadyLinked] = await pool.execute(
        'SELECT * FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
        [userId, 'google']
      );

      if (alreadyLinked.length > 0) {
        // Update existing link
        await pool.execute(
          `UPDATE user_oauth_providers 
           SET provider_user_id = ?, provider_email = ?, access_token_encrypted = ?, refresh_token_encrypted = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND provider = ?`,
          [googleId, email, accessTokenEncrypted, refreshTokenEncrypted, userId, 'google']
        );
      } else {
        // Create new link
        await pool.execute(
          `INSERT INTO user_oauth_providers 
           (user_id, provider, provider_user_id, provider_email, access_token_encrypted, refresh_token_encrypted)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, 'google', googleId, email, accessTokenEncrypted, refreshTokenEncrypted]
        );
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/profile?oauth_linked=google&success=true`);
    }

    // Login mode: Tìm hoặc tạo user trong database
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
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
    // (accessTokenEncrypted và refreshTokenEncrypted đã được khai báo ở trên)

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
/**
 * Link OAuth provider cho user đã đăng nhập
 * POST /auth/oauth/:provider
 */
export async function linkOAuthProvider(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { provider } = req.params;
    const supportedProviders = ['google', 'github', 'microsoft'];
    
    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ message: 'Provider không được hỗ trợ' });
    }

    // Check if provider already linked
    const [existing] = await pool.execute(
      'SELECT * FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: `${provider} đã được liên kết với tài khoản này` });
    }

    // For now, only Google is implemented
    if (provider === 'google') {
      // Redirect to Google OAuth with link mode
      const state = makeStateCookie(res);
      res.cookie('oauth_link_user_id', userId.toString(), {
        maxAge: 10 * 60 * 1000, // 10 minutes
        httpOnly: true,
        sameSite: 'lax',
      });
      res.cookie('oauth_mode', 'link', {
        maxAge: 10 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
      });

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        state,
      });

      return res.json({ 
        message: 'Redirecting to OAuth provider...',
        redirectUrl: url 
      });
    }

    return res.status(501).json({ message: `Provider ${provider} chưa được triển khai` });
  } catch (error) {
    console.error('❌ Error linking OAuth provider:', error);
    res.status(500).json({ message: 'Error linking OAuth provider' });
  }
}

/**
 * Unlink OAuth provider
 * DELETE /auth/oauth/:provider
 * 
 * Note: Unlinking OAuth provider does NOT affect email verification status.
 * Email verification and OAuth are independent concepts:
 * - Email verification: Confirms email ownership in our system
 * - OAuth: Just an authentication method
 */
export async function unlinkOAuthProvider(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { provider } = req.params;
    const supportedProviders = ['google', 'github', 'microsoft'];
    
    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ message: 'Provider không được hỗ trợ' });
    }

    console.log(`🔗 Attempting to unlink OAuth provider: ${provider} for user ${userId}`);

    // Check if provider is linked
    const [existing] = await pool.execute(
      'SELECT * FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    if (existing.length === 0) {
      console.log(`⚠️ Provider ${provider} not linked to user ${userId}`);
      return res.status(404).json({ message: `${provider} chưa được liên kết với tài khoản này` });
    }

    // Get user info for validation and logging
    const [user] = await pool.execute(
      'SELECT id, email, password_hash, email_verified FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userEmail = user[0].email;
    const hasPassword = user[0].password_hash && user[0].password_hash.trim() !== '';
    const emailVerified = Boolean(user[0].email_verified);

    // Count linked providers (before unlink)
    const [linkedProviders] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_oauth_providers WHERE user_id = ?',
      [userId]
    );

    const providerCount = linkedProviders[0].count;

    console.log(`📊 User ${userId} (${userEmail}) authentication status:`, {
      hasPassword,
      linkedProvidersCount: providerCount,
      emailVerified,
      providerToUnlink: provider
    });

    // Prevent unlinking if user has no password and this is the only provider
    if (!hasPassword && providerCount === 1) {
      console.warn(`⚠️ Cannot unlink ${provider}: User ${userId} has no password and this is the only auth method`);
      return res.status(400).json({ 
        message: 'Không thể hủy liên kết. Bạn cần có mật khẩu hoặc ít nhất một phương thức đăng nhập khác.',
        suggestion: 'Vui lòng tạo mật khẩu trước khi hủy liên kết OAuth provider này.'
      });
    }

    // Delete OAuth provider link
    await pool.execute(
      'DELETE FROM user_oauth_providers WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    // Check remaining authentication methods after unlink
    const [remainingProviders] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_oauth_providers WHERE user_id = ?',
      [userId]
    );
    const remainingProviderCount = remainingProviders[0].count;

    // Log successful unlink with details
    console.log(`✅ OAuth provider ${provider} unlinked successfully from user ${userId}`);
    console.log(`   User: ${userEmail}`);
    console.log(`   Remaining auth methods:`, {
      hasPassword,
      remainingOAuthProviders: remainingProviderCount,
      emailVerified: emailVerified // Email verification unchanged (as expected)
    });

    // Warning if user has no authentication methods remaining (should not happen due to validation above)
    if (!hasPassword && remainingProviderCount === 0) {
      console.error(`🚨 WARNING: User ${userId} has no authentication methods remaining after unlink!`);
      // This should not happen due to validation above, but log it for safety
    }

    // Prepare response
    const response = {
      message: `${provider} đã được hủy liên kết thành công`,
      remainingAuthMethods: {
        hasPassword,
        oauthProvidersCount: remainingProviderCount
      }
    };

    // Add warning if user only has one auth method left
    if (!hasPassword && remainingProviderCount === 0) {
      response.warning = 'Bạn nên tạo mật khẩu để đảm bảo có thể đăng nhập.';
    } else if ((!hasPassword && remainingProviderCount === 1) || (hasPassword && remainingProviderCount === 0)) {
      response.info = 'Bạn vẫn có thể đăng nhập bằng phương thức còn lại.';
    }

    res.json(response);
  } catch (error) {
    console.error('❌ Error unlinking OAuth provider:', error);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error unlinking OAuth provider' });
  }
}

/**
 * Logout user - Delete current session from database
 * POST /auth/logout
 * 
 * Requires authentication (verifyToken middleware)
 * Deletes the session associated with the current token
 */
export async function logout(req, res) {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionId; // From verifyToken middleware
    
    if (!userId || !sessionId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get token from header to hash and verify
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    // Hash token to find session
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Verify session belongs to user and delete it
    const [sessions] = await pool.execute(
      'SELECT id FROM user_sessions WHERE id = ? AND user_id = ? AND token_hash = ?',
      [sessionId, userId, tokenHash]
    );

    if (sessions.length === 0) {
      // Session already deleted or doesn't exist
      return res.json({ message: 'Logged out successfully' });
    }

    // Delete session from database
    await pool.execute(
      'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    console.log(`✅ User ${userId} logged out. Session ${sessionId} deleted.`);

    res.json({ 
      message: 'Logged out successfully',
      sessionDeleted: true
    });
  } catch (error) {
    console.error('❌ Error in logout:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
}

/**
 * Get linked OAuth providers for current user
 * GET /auth/oauth
 * 
 * Returns OAuth providers and authentication methods summary
 */
export async function getLinkedOAuthProviders(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get OAuth providers
    const [providers] = await pool.execute(
      'SELECT provider, provider_email, created_at, updated_at FROM user_oauth_providers WHERE user_id = ?',
      [userId]
    );

    // Get user authentication methods info
    const [user] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    const hasPassword = user.length > 0 && user[0].password_hash && user[0].password_hash.trim() !== '';
    const oauthProvidersCount = providers.length;

    // Calculate total authentication methods
    const totalAuthMethods = (hasPassword ? 1 : 0) + oauthProvidersCount;

    res.json({ 
      providers,
      authenticationMethods: {
        hasPassword,
        oauthProvidersCount,
        totalAuthMethods,
        // Warning if user has only one auth method
        canUnlinkAll: totalAuthMethods > 1,
        warning: totalAuthMethods === 1 
          ? 'Bạn chỉ có một phương thức đăng nhập. Vui lòng tạo mật khẩu trước khi hủy liên kết OAuth provider.'
          : null
      }
    });
  } catch (error) {
    console.error('❌ Error getting linked OAuth providers:', error);
    res.status(500).json({ message: 'Error getting linked OAuth providers' });
  }
}

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
