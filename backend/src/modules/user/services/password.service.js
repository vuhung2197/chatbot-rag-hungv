import pool from '#db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '#services/emailService.js';

class PasswordService {
    async changePassword(userId, currentPassword, newPassword) {
        // Get current user
        const [rows] = await pool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) throw new Error('User not found');

        const userPasswordHash = rows[0].password_hash;

        if (!userPasswordHash || userPasswordHash.trim() === '') {
            throw new Error('NO_PASSWORD_SET');
        }

        const isValid = await bcrypt.compare(currentPassword, userPasswordHash);
        if (!isValid) {
            throw new Error('Mật khẩu hiện tại không đúng');
        }

        const isSame = await bcrypt.compare(newPassword, userPasswordHash);
        if (isSame) {
            throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại');
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newHash, userId]
        );

        return { message: 'Mật khẩu đã được thay đổi thành công' };
    }

    async requestPasswordReset(email) {
        const [rows] = await pool.execute(
            'SELECT id, email FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return {
                message: 'Nếu email tồn tại, chúng tôi đã gửi link reset mật khẩu đến email của bạn'
            };
        }

        const user = rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Delete old unused tokens
        await pool.execute(
            'DELETE FROM password_reset_tokens WHERE user_id = ? AND used = FALSE',
            [user.id]
        );

        // Save token
        await pool.execute(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, token, expiresAt]
        );

        const emailResult = await sendPasswordResetEmail(user.email, token);

        if (!emailResult.success) {
            const resetUrl = emailResult.resetUrl ||
                `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
            const formattedToken = token.match(/.{1,8}/g)?.join('-') || token;

            return {
                message: 'Reset password email sent (check console for code - email service not configured)',
                resetUrl,
                resetCode: formattedToken,
                serviceConfigured: false
            };
        }

        return {
            message: 'Link reset mật khẩu đã được gửi đến email của bạn',
            serviceConfigured: true
        };
    }

    async resetPassword(token, newPassword) {
        const [rows] = await pool.execute(
            `SELECT prt.user_id, prt.expires_at, prt.used 
       FROM password_reset_tokens prt
       WHERE prt.token = ?`,
            [token]
        );

        if (rows.length === 0) throw new Error('Token không hợp lệ hoặc đã hết hạn');

        const tokenData = rows[0];

        if (tokenData.used) throw new Error('Token đã được sử dụng');
        if (new Date() > new Date(tokenData.expires_at)) throw new Error('Token đã hết hạn');

        const newHash = await bcrypt.hash(newPassword, 10);

        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newHash, tokenData.user_id]
        );

        await pool.execute(
            'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
            [token]
        );

        return { message: 'Mật khẩu đã được reset thành công' };
    }

    async setPasswordForOAuthUser(userId, newPassword) {
        const [rows] = await pool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) throw new Error('User not found');

        const userPasswordHash = rows[0].password_hash;
        if (userPasswordHash && userPasswordHash.trim() !== '') {
            throw new Error('ALREADY_HAS_PASSWORD');
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newHash, userId]
        );

        return { message: 'Mật khẩu đã được thiết lập thành công' };
    }
}

export default new PasswordService();
