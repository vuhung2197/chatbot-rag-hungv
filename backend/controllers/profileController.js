import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { sendVerificationEmail } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lấy thông tin profile của user hiện tại
 */
export async function getProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows] = await pool.execute(
      `SELECT 
        id, name, email, role, created_at,
        avatar_url, display_name, bio, timezone, language,
        email_verified, last_login_at, account_status, updated_at,
        password_hash
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const hasPassword = user.password_hash && user.password_hash.trim() !== '';
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatar_url,
      displayName: user.display_name || user.name,
      bio: user.bio || '',
      timezone: user.timezone || 'Asia/Ho_Chi_Minh',
      language: user.language || 'vi',
      // Convert TINYINT(1) to boolean (MySQL returns 0/1, not true/false)
      emailVerified: Boolean(user.email_verified),
      accountStatus: user.account_status || 'active',
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      updatedAt: user.updated_at,
      hasPassword: hasPassword, // Indicate if user has password set
    });
  } catch (error) {
    console.error('❌ Error getting profile:', error);
    res.status(500).json({ message: 'Error getting profile' });
  }
}

/**
 * Cập nhật thông tin profile
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { displayName, bio, timezone, language, email } = req.body;

    // Validate
    if (displayName && displayName.length > 100) {
      return res.status(400).json({ message: 'Display name quá dài (max 100 ký tự)' });
    }
    if (bio && bio.length > 500) {
      return res.status(400).json({ message: 'Bio quá dài (max 500 ký tự)' });
    }
    if (timezone && typeof timezone !== 'string') {
      return res.status(400).json({ message: 'Timezone không hợp lệ' });
    }
    if (language && !['vi', 'en'].includes(language)) {
      return res.status(400).json({ message: 'Language phải là vi hoặc en' });
    }
    
    // Validate email if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }
      
      // Check if email already exists (for another user)
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email đã được sử dụng bởi tài khoản khác' });
      }
    }

    // Get current user email to check if it changed
    let currentEmail = null;
    if (email !== undefined) {
      const [currentUser] = await pool.execute(
        'SELECT email FROM users WHERE id = ?',
        [userId]
      );
      if (currentUser.length > 0) {
        currentEmail = currentUser[0].email;
      }
    }

    // Build update query
    const updates = [];
    const values = [];

    if (displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(displayName || null);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio || null);
    }
    if (timezone !== undefined) {
      updates.push('timezone = ?');
      values.push(timezone);
    }
    if (language !== undefined) {
      updates.push('language = ?');
      values.push(language);
    }
    if (email !== undefined) {
      // Only update email and reset verification if email actually changed
      if (email !== currentEmail) {
        updates.push('email = ?');
        values.push(email);
        // Reset email verification when email changes
        updates.push('email_verified = FALSE');
        updates.push('email_verification_token = NULL');
      }
      // If email is the same, don't update it (preserve email_verified status)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật' });
    }

    values.push(userId);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
}

/**
 * Upload avatar
 */
export async function uploadAvatar(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Chỉ chấp nhận file JPG/PNG' });
    }

    // Validate file size (max 2MB)
    if (req.file.size > 2 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'File quá lớn (max 2MB)' });
    }

    // Create avatars directory if not exists
    const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
      console.log('✅ Created avatars directory:', avatarsDir);
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${userId}_${Date.now()}${ext}`;
    const outputPath = path.join(avatarsDir, filename);

    // Copy file to avatars directory
    // Note: In production, consider using sharp or similar for resizing/optimization
    try {
      fs.copyFileSync(req.file.path, outputPath);
      console.log('✅ File copied to:', outputPath);
    } catch (copyError) {
      console.error('❌ Error copying file:', copyError);
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ message: 'Lỗi khi lưu file avatar' });
    }

    // Delete original temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Get old avatar URL to delete old file
    const [oldRows] = await pool.execute(
      'SELECT avatar_url FROM users WHERE id = ?',
      [userId]
    );
    const oldAvatarUrl = oldRows[0]?.avatar_url;

    // Update database with new avatar URL
    const avatarUrl = `/uploads/avatars/${filename}`;
    await pool.execute(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, userId]
    );

    // Delete old avatar file if exists
    if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', oldAvatarUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    console.log('✅ Avatar uploaded successfully:', avatarUrl);

    res.json({ 
      message: 'Avatar uploaded successfully',
      avatarUrl 
    });
  } catch (error) {
    console.error('❌ Error uploading avatar:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error uploading avatar' });
  }
}

/**
 * Xóa avatar (set về null)
 */
export async function deleteAvatar(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get current avatar URL
    const [rows] = await pool.execute(
      'SELECT avatar_url FROM users WHERE id = ?',
      [userId]
    );
    const avatarUrl = rows[0]?.avatar_url;

    // Update database
    await pool.execute(
      'UPDATE users SET avatar_url = NULL WHERE id = ?',
      [userId]
    );

    // Delete file if exists
    if (avatarUrl && avatarUrl.startsWith('/uploads/avatars/')) {
      const filePath = path.join(__dirname, '..', avatarUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting avatar:', error);
    res.status(500).json({ message: 'Error deleting avatar' });
  }
}

/**
 * Gửi email verification
 */
export async function sendEmailVerification(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if already verified
    const [rows] = await pool.execute(
      'SELECT email_verified, email FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (rows[0].email_verified) {
      return res.status(400).json({ message: 'Email đã được verify' });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    // Save token to database
    await pool.execute(
      'UPDATE users SET email_verification_token = ? WHERE id = ?',
      [token, userId]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(rows[0].email, token);
    
    if (emailResult.success) {
      res.json({ 
        message: 'Email verification đã được gửi thành công! Vui lòng kiểm tra email của bạn (bao gồm cả Spam folder).'
      });
    } else {
      // Email service not configured or failed, return token and URL as fallback
      const verificationUrl = emailResult.verificationUrl || 
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
      const formattedToken = token.match(/.{1,8}/g)?.join('-') || token;
      
      console.log(`📧 Email service not configured. Verification details:`);
      console.log(`   Code: ${formattedToken}`);
      console.log(`   URL: ${verificationUrl}`);
      
      res.json({ 
        message: 'Verification email sent (check console for code - email service not configured)',
        // Return token and URL in development mode or when email service fails
        ...((process.env.NODE_ENV === 'development' || !emailResult.success) && { 
          verificationUrl,
          verificationCode: formattedToken 
        })
      });
    }
  } catch (error) {
    console.error('❌ Error sending email verification:', error);
    res.status(500).json({ message: 'Error sending email verification' });
  }
}

/**
 * Verify email với token
 */
export async function verifyEmail(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Token không hợp lệ' });
    }

    // Find user by token
    const [rows] = await pool.execute(
      'SELECT id, email_verified FROM users WHERE email_verification_token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    if (rows[0].email_verified) {
      return res.status(400).json({ message: 'Email đã được verify' });
    }

    // Update user
    await pool.execute(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = ?',
      [rows[0].id]
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('❌ Error verifying email:', error);
    res.status(500).json({ message: 'Error verifying email' });
  }
}

