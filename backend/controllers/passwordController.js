import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from '../db.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import '../bootstrap/env.js';

/**
 * Đổi mật khẩu (yêu cầu đăng nhập)
 */
export async function changePassword(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
    }

    // Get current user
    const [rows] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has password (OAuth users might not have password)
    const userPasswordHash = rows[0].password_hash;
    if (!userPasswordHash || userPasswordHash.trim() === '') {
      // User doesn't have password (OAuth user)
      // Redirect them to use setPasswordForOAuthUser endpoint instead
      return res.status(400).json({ 
        message: 'Bạn chưa có mật khẩu. Vui lòng sử dụng chức năng thiết lập mật khẩu.' 
      });
    } else {
      // User has password, verify current password
      const isValid = await bcrypt.compare(currentPassword, userPasswordHash);
      if (!isValid) {
        return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
      }
      
      // Check if new password is same as current
      const isSame = await bcrypt.compare(newPassword, userPasswordHash);
      if (isSame) {
        return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
      }
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newHash, userId]
    );

    res.json({ message: 'Mật khẩu đã được thay đổi thành công' });
  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
}

/**
 * Request reset password (gửi email với reset token)
 */
export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email' });
    }

    // Find user by email
    const [rows] = await pool.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    // Don't reveal if email exists (security best practice)
    if (rows.length === 0) {
      return res.json({ 
        message: 'Nếu email tồn tại, chúng tôi đã gửi link reset mật khẩu đến email của bạn' 
      });
    }

    const user = rows[0];

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Delete old unused tokens for this user
    await pool.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ? AND used = FALSE',
      [user.id]
    );

    // Save token
    await pool.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    // Send reset email
    const emailResult = await sendPasswordResetEmail(user.email, token);

    if (emailResult.success) {
      res.json({ 
        message: 'Link reset mật khẩu đã được gửi đến email của bạn' 
      });
    } else {
      // Email service not configured - return token for development
      const resetUrl = emailResult.resetUrl || 
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      const formattedToken = token.match(/.{1,8}/g)?.join('-') || token;
      
      console.log(`📧 Email service not configured. Reset password details:`);
      console.log(`   Code: ${formattedToken}`);
      console.log(`   URL: ${resetUrl}`);
      
      res.json({ 
        message: 'Reset password email sent (check console for code - email service not configured)',
        ...((process.env.NODE_ENV === 'development' || !emailResult.success) && { 
          resetUrl,
          resetCode: formattedToken 
        })
      });
    }
  } catch (error) {
    console.error('❌ Error requesting password reset:', error);
    res.status(500).json({ message: 'Error requesting password reset' });
  }
}

/**
 * Reset password với token từ email
 */
export async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token không hợp lệ' });
    }

    if (!newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu mới' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }

    // Find token
    const [rows] = await pool.execute(
      `SELECT prt.user_id, prt.expires_at, prt.used 
       FROM password_reset_tokens prt
       WHERE prt.token = ?`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    const tokenData = rows[0];

    // Check if token is used
    if (tokenData.used) {
      return res.status(400).json({ message: 'Token đã được sử dụng' });
    }

    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      return res.status(400).json({ message: 'Token đã hết hạn' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newHash, tokenData.user_id]
    );

    // Mark token as used
    await pool.execute(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
      [token]
    );

    res.json({ message: 'Mật khẩu đã được reset thành công' });
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
}

/**
 * Set password for OAuth users (first time setup)
 * Requires authentication token from OAuth callback
 */
export async function setPasswordForOAuthUser(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu mới' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }

    // Get current user
    const [rows] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has password
    const userPasswordHash = rows[0].password_hash;
    if (userPasswordHash && userPasswordHash.trim() !== '') {
      return res.status(400).json({ message: 'Bạn đã có mật khẩu. Vui lòng sử dụng chức năng đổi mật khẩu.' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newHash, userId]
    );

    res.json({ message: 'Mật khẩu đã được thiết lập thành công' });
  } catch (error) {
    console.error('❌ Error setting password for OAuth user:', error);
    res.status(500).json({ message: 'Error setting password' });
  }
}

