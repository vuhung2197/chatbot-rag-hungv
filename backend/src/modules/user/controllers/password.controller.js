import passwordService from '../services/password.service.js';

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

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
        }

        const result = await passwordService.changePassword(userId, currentPassword, newPassword);
        res.json(result);
    } catch (error) {
        console.error('❌ Error changing password:', error);
        if (error.message === 'NO_PASSWORD_SET') {
            return res.status(400).json({ message: 'Bạn chưa có mật khẩu. Vui lòng sử dụng chức năng thiết lập mật khẩu.' });
        }
        if (error.message === 'User not found') return res.status(404).json({ message: error.message });
        if (['Mật khẩu hiện tại không đúng', 'Mật khẩu mới phải khác mật khẩu hiện tại'].includes(error.message)) {
            return res.status(400).json({ message: error.message });
        }
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

        const result = await passwordService.requestPasswordReset(email);

        if (result.serviceConfigured === false) {
            return res.json({
                message: result.message,
                ...((process.env.NODE_ENV === 'development' || true) && {
                    resetUrl: result.resetUrl,
                    resetCode: result.resetCode
                })
            });
        }

        res.json({ message: result.message });
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
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự' });
        }

        const result = await passwordService.resetPassword(token, newPassword);
        res.json(result);
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        if (['Token không hợp lệ hoặc đã hết hạn', 'Token đã được sử dụng', 'Token đã hết hạn'].includes(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error resetting password' });
    }
}

/**
 * Set password for OAuth users (first time setup)
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
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự' });
        }

        const result = await passwordService.setPasswordForOAuthUser(userId, newPassword);
        res.json(result);
    } catch (error) {
        console.error('❌ Error setting password for OAuth user:', error);
        if (error.message === 'ALREADY_HAS_PASSWORD') {
            return res.status(400).json({ message: 'Bạn đã có mật khẩu. Vui lòng sử dụng chức năng đổi mật khẩu.' });
        }
        if (error.message === 'User not found') return res.status(404).json({ message: error.message });
        res.status(500).json({ message: 'Error setting password' });
    }
}

