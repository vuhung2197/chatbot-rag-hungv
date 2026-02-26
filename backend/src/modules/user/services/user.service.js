import pool from '#db';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { sendVerificationEmail } from '#services/emailService.js';

class UserService {
    getAvatarsDir() {
        return path.join(process.cwd(), 'uploads', 'avatars');
    }

    async getProfile(userId) {
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

        if (rows.length === 0) return null;

        const user = rows[0];
        const hasPassword = user.password_hash && user.password_hash.trim() !== '';

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatar_url,
            displayName: user.display_name || user.name,
            bio: user.bio || '',
            timezone: user.timezone || 'Asia/Ho_Chi_Minh',
            language: user.language || 'vi',
            emailVerified: Boolean(user.email_verified),
            accountStatus: user.account_status || 'active',
            createdAt: user.created_at,
            lastLoginAt: user.last_login_at,
            updatedAt: user.updated_at,
            hasPassword: hasPassword,
        };
    }

    async updateProfile(userId, data) {
        const { displayName, bio, timezone, language, email } = data;

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
            const [currentUser] = await pool.execute(
                'SELECT email FROM users WHERE id = ?',
                [userId]
            );

            if (currentUser.length > 0 && email !== currentUser[0].email) {
                // Check if email already exists
                const [existing] = await pool.execute(
                    'SELECT id FROM users WHERE email = ? AND id != ?',
                    [email, userId]
                );
                if (existing.length > 0) {
                    throw new Error('Email đã được sử dụng bởi tài khoản khác');
                }

                updates.push('email = ?');
                values.push(email);
                updates.push('email_verified = FALSE');
                updates.push('email_verification_token = NULL');
            }
        }

        if (updates.length === 0) return null;

        values.push(userId);
        await pool.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        return { message: 'Profile updated successfully' };
    }

    async uploadAvatar(userId, file) {
        // Create avatars directory if not exists
        const avatarsDir = this.getAvatarsDir();
        if (!fs.existsSync(avatarsDir)) {
            fs.mkdirSync(avatarsDir, { recursive: true });
        }

        // Generate unique filename
        const filename = `${userId}_${Date.now()}.jpg`;
        const outputPath = path.join(avatarsDir, filename);

        // Resize and optimize image using sharp
        await sharp(file.path)
            .resize(200, 200, {
                fit: 'cover',
                position: 'center',
            })
            .jpeg({ quality: 90 })
            .toFile(outputPath);

        // Delete original temp file
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
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
            const oldPath = path.join(process.cwd(), oldAvatarUrl);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        return avatarUrl;
    }

    async deleteAvatar(userId) {
        const [rows] = await pool.execute(
            'SELECT avatar_url FROM users WHERE id = ?',
            [userId]
        );
        const avatarUrl = rows[0]?.avatar_url;

        await pool.execute(
            'UPDATE users SET avatar_url = NULL WHERE id = ?',
            [userId]
        );

        if (avatarUrl && avatarUrl.startsWith('/uploads/avatars/')) {
            const filePath = path.join(process.cwd(), avatarUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        return { message: 'Avatar deleted successfully' };
    }

    async sendEmailVerification(userId) {
        const [rows] = await pool.execute(
            'SELECT email_verified, email FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) throw new Error('User not found');
        if (rows[0].email_verified) throw new Error('Email đã được verify');

        const token = crypto.randomBytes(32).toString('hex');
        await pool.execute(
            'UPDATE users SET email_verification_token = ? WHERE id = ?',
            [token, userId]
        );

        const emailResult = await sendVerificationEmail(rows[0].email, token);

        if (!emailResult.success) {
            const verificationUrl = emailResult.verificationUrl ||
                `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
            const formattedToken = token.match(/.{1,8}/g)?.join('-') || token;

            return {
                message: 'Verification email sent (check console for code - email service not configured)',
                verificationUrl,
                verificationCode: formattedToken,
                serviceConfigured: false
            };
        }

        return {
            message: 'Email verification đã được gửi thành công! Vui lòng kiểm tra email của bạn (bao gồm cả Spam folder).',
            serviceConfigured: true
        };
    }

    async verifyEmail(token) {
        const [rows] = await pool.execute(
            'SELECT id, email_verified FROM users WHERE email_verification_token = ?',
            [token]
        );

        if (rows.length === 0) throw new Error('Token không hợp lệ hoặc đã hết hạn');
        if (rows[0].email_verified) throw new Error('Email đã được verify');

        await pool.execute(
            'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = ?',
            [rows[0].id]
        );

        return { message: 'Email verified successfully' };
    }
}

export default new UserService();
