import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { sendVerificationEmail } from '#services/emailService.js';
import userRepository from '../repositories/user.repository.js';

class UserService {
    getAvatarsDir() {
        return path.join(process.cwd(), 'uploads', 'avatars');
    }

    async getProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) return null;

        const hasPassword = Boolean(user.password_hash && user.password_hash.trim() !== '');

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
            hasPassword,
        };
    }

    async updateProfile(userId, data) {
        const { displayName, bio, timezone, language, email } = data;
        const fields = {};

        if (displayName !== undefined) fields.display_name = displayName || null;
        if (bio !== undefined) fields.bio = bio || null;
        if (timezone !== undefined) fields.timezone = timezone;
        if (language !== undefined) fields.language = language;

        if (email !== undefined) {
            const currentEmail = await userRepository.findEmailById(userId);
            if (currentEmail !== null && email !== currentEmail) {
                const conflict = await userRepository.findByEmail(email, userId);
                if (conflict) throw new Error('Email đã được sử dụng bởi tài khoản khác');
                fields.email = email;
                fields.email_verified = false;
                fields.email_verification_token = null;
            }
        }

        if (Object.keys(fields).length === 0) return null;

        await userRepository.update(userId, fields);
        return { message: 'Profile updated successfully' };
    }

    async uploadAvatar(userId, file) {
        const avatarsDir = this.getAvatarsDir();
        if (!fs.existsSync(avatarsDir)) {
            fs.mkdirSync(avatarsDir, { recursive: true });
        }

        const filename = `${userId}_${Date.now()}.jpg`;
        const outputPath = path.join(avatarsDir, filename);

        await sharp(file.path)
            .resize(200, 200, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 90 })
            .toFile(outputPath);

        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        const oldAvatarUrl = await userRepository.findAvatarUrl(userId);
        const avatarUrl = `/uploads/avatars/${filename}`;
        await userRepository.update(userId, { avatar_url: avatarUrl });

        if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
            const oldPath = path.join(process.cwd(), oldAvatarUrl);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        return avatarUrl;
    }

    async deleteAvatar(userId) {
        const avatarUrl = await userRepository.findAvatarUrl(userId);
        await userRepository.update(userId, { avatar_url: null });

        if (avatarUrl && avatarUrl.startsWith('/uploads/avatars/')) {
            const filePath = path.join(process.cwd(), avatarUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        return { message: 'Avatar deleted successfully' };
    }

    async sendEmailVerification(userId) {
        const row = await userRepository.findEmailVerificationStatus(userId);
        if (!row) throw new Error('User not found');
        if (row.email_verified) throw new Error('Email đã được verify');

        const token = crypto.randomBytes(32).toString('hex');
        await userRepository.update(userId, { email_verification_token: token });

        const emailResult = await sendVerificationEmail(row.email, token);

        if (!emailResult.success) {
            const verificationUrl = emailResult.verificationUrl ||
                `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
            const formattedToken = token.match(/.{1,8}/g)?.join('-') || token;

            return {
                message: 'Verification email sent (check console for code - email service not configured)',
                verificationUrl,
                verificationCode: formattedToken,
                serviceConfigured: false,
            };
        }

        return {
            message: 'Email verification đã được gửi thành công! Vui lòng kiểm tra email của bạn (bao gồm cả Spam folder).',
            serviceConfigured: true,
        };
    }

    async verifyEmail(token) {
        const row = await userRepository.findByVerificationToken(token);
        if (!row) throw new Error('Token không hợp lệ hoặc đã hết hạn');
        if (row.email_verified) throw new Error('Email đã được verify');

        await userRepository.update(row.id, {
            email_verified: true,
            email_verification_token: null,
        });

        return { message: 'Email verified successfully' };
    }
}

export default new UserService();
