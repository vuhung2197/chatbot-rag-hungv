import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '#services/emailService.js';
import userRepository from '../repositories/user.repository.js';
import passwordRepository from '../repositories/password.repository.js';

class PasswordService {
    async changePassword(userId, currentPassword, newPassword) {
        const passwordHash = await userRepository.findPasswordHash(userId);
        if (passwordHash === null) throw new Error('User not found');

        if (!passwordHash || passwordHash.trim() === '') {
            throw new Error('NO_PASSWORD_SET');
        }

        const isValid = await bcrypt.compare(currentPassword, passwordHash);
        if (!isValid) throw new Error('Mật khẩu hiện tại không đúng');

        const isSame = await bcrypt.compare(newPassword, passwordHash);
        if (isSame) throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại');

        const newHash = await bcrypt.hash(newPassword, 10);
        await userRepository.update(userId, { password_hash: newHash });

        return { message: 'Mật khẩu đã được thay đổi thành công' };
    }

    async requestPasswordReset(email) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            return { message: 'Nếu email tồn tại, chúng tôi đã gửi link reset mật khẩu đến email của bạn' };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await passwordRepository.deleteUnusedResetTokens(user.id);
        await passwordRepository.createResetToken(user.id, token, expiresAt);

        const emailResult = await sendPasswordResetEmail(email, token);

        if (!emailResult.success) {
            const resetUrl = emailResult.resetUrl ||
                `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
            const formattedToken = token.match(/.{1,8}/g)?.join('-') || token;

            return {
                message: 'Reset password email sent (check console for code - email service not configured)',
                resetUrl,
                resetCode: formattedToken,
                serviceConfigured: false,
            };
        }

        return {
            message: 'Link reset mật khẩu đã được gửi đến email của bạn',
            serviceConfigured: true,
        };
    }

    async resetPassword(token, newPassword) {
        const tokenData = await passwordRepository.findResetToken(token);
        if (!tokenData) throw new Error('Token không hợp lệ hoặc đã hết hạn');
        if (tokenData.used) throw new Error('Token đã được sử dụng');
        if (new Date() > new Date(tokenData.expires_at)) throw new Error('Token đã hết hạn');

        const newHash = await bcrypt.hash(newPassword, 10);
        await userRepository.update(tokenData.user_id, { password_hash: newHash });
        await passwordRepository.markResetTokenUsed(token);

        return { message: 'Mật khẩu đã được reset thành công' };
    }

    async setPasswordForOAuthUser(userId, newPassword) {
        const passwordHash = await userRepository.findPasswordHash(userId);
        if (passwordHash === null) throw new Error('User not found');

        if (passwordHash && passwordHash.trim() !== '') {
            throw new Error('ALREADY_HAS_PASSWORD');
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await userRepository.update(userId, { password_hash: newHash });

        return { message: 'Mật khẩu đã được thiết lập thành công' };
    }
}

export default new PasswordService();
