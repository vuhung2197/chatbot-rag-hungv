import userService from '../services/user.service.js';
import fs from 'fs';

/**
 * Lấy thông tin profile của user hiện tại
 */
export async function getProfile(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const profile = await userService.getProfile(userId);
        if (!profile) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(profile);
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

        // Validation
        if (displayName && displayName.length > 100) {
            return res.status(400).json({ message: 'Display name quá dài (max 100 ký tự)' });
        }
        if (bio && bio.length > 500) {
            return res.status(400).json({ message: 'Bio quá dài (max 500 ký tự)' });
        }
        if (language && !['vi', 'en'].includes(language)) {
            return res.status(400).json({ message: 'Language phải là vi hoặc en' });
        }
        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Email không hợp lệ' });
            }
        }

        const result = await userService.updateProfile(userId, { displayName, bio, timezone, language, email });

        if (!result) {
            return res.status(400).json({ message: 'Không có thông tin nào để cập nhật' });
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        if (error.message === 'Email đã được sử dụng bởi tài khoản khác') {
            return res.status(400).json({ message: error.message });
        }
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
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Chỉ chấp nhận file JPG/PNG' });
        }

        // Validate file size (max 2MB)
        if (req.file.size > 2 * 1024 * 1024) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'File quá lớn (max 2MB)' });
        }

        const avatarUrl = await userService.uploadAvatar(userId, req.file);

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

        const result = await userService.deleteAvatar(userId);
        res.json(result);
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

        const result = await userService.sendEmailVerification(userId);

        if (!result.serviceConfigured) {
            return res.json({
                message: result.message,
                ...((process.env.NODE_ENV === 'development' || true) && {
                    verificationUrl: result.verificationUrl,
                    verificationCode: result.verificationCode
                })
            });
        }

        res.json({ message: result.message });
    } catch (error) {
        console.error('❌ Error sending email verification:', error);
        if (error.message === 'User not found') return res.status(404).json({ message: error.message });
        if (error.message === 'Email đã được verify') return res.status(400).json({ message: error.message });
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

        const result = await userService.verifyEmail(token);
        res.json(result);
    } catch (error) {
        console.error('❌ Error verifying email:', error);
        if (error.message === 'Token không hợp lệ hoặc đã hết hạn' || error.message === 'Email đã được verify') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error verifying email' });
    }
}

