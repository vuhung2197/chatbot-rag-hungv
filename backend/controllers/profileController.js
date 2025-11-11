import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
        email_verified, last_login_at, account_status, updated_at
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
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
      emailVerified: user.email_verified || false,
      accountStatus: user.account_status || 'active',
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      updatedAt: user.updated_at,
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

    const { displayName, bio, timezone, language } = req.body;

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
    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${userId}_${Date.now()}${ext}`;
    const outputPath = path.join(avatarsDir, filename);

    // Copy file to avatars directory
    // Note: In production, consider using sharp or similar for resizing/optimization
    fs.copyFileSync(req.file.path, outputPath);

    // Delete original temp file
    fs.unlinkSync(req.file.path);

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
      const oldPath = path.join(process.cwd(), oldAvatarUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

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
      const filePath = path.join(process.cwd(), avatarUrl);
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

    // TODO: Send email với verification link
    // For now, just return the token (in production, send via email)
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    console.log(`📧 Email verification link for user ${userId}: ${verificationUrl}`);

    res.json({ 
      message: 'Verification email sent (check console for link in development)',
      // In production, don't return the URL
      ...(process.env.NODE_ENV === 'development' && { verificationUrl })
    });
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

