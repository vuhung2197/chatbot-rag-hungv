import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const LanguageContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Translation files
const translations = {
  vi: {
    // Common
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.delete': 'Xóa',
    'common.edit': 'Chỉnh sửa',
    'common.close': 'Đóng',
    'common.loading': 'Đang tải...',
    'common.error': 'Lỗi',
    'common.success': 'Thành công',
    'common.confirm': 'Xác nhận',
    'common.required': 'là bắt buộc',
    
    // Auth
    'auth.login': 'Đăng nhập',
    'auth.register': 'Đăng ký',
    'auth.logout': 'Đăng xuất',
    'auth.email': 'Email',
    'auth.password': 'Mật khẩu',
    'auth.noAccount': 'Chưa có tài khoản?',
    'auth.hasAccount': 'Đã có tài khoản?',
    'auth.loginWithGoogle': 'Đăng nhập bằng Google',
    'auth.or': 'hoặc',
    
    // Profile
    'profile.title': 'Cài đặt Profile',
    'profile.displayName': 'Tên hiển thị',
    'profile.displayNameHint': 'Tên hiển thị có thể khác với email',
    'profile.bio': 'Giới thiệu (Bio)',
    'profile.bioPlaceholder': 'Giới thiệu về bản thân...',
    'profile.timezone': 'Múi giờ',
    'profile.language': 'Ngôn ngữ',
    'profile.avatar': 'Ảnh đại diện',
    'profile.accountStatus': 'Trạng thái tài khoản',
    'profile.createdAt': 'Ngày tạo',
    'profile.lastLogin': 'Đăng nhập lần cuối',
    'profile.saveChanges': 'Lưu thay đổi',
    'profile.saving': 'Đang lưu...',
    'profile.updateSuccess': 'Đã cập nhật profile thành công!',
    'profile.updateError': 'Lỗi khi cập nhật profile',
    'profile.loadError': 'Không thể tải thông tin profile',
    
    // Email Verification
    'email.verify': 'Xác thực Email',
    'email.verified': 'Email đã được xác thực',
    'email.notVerified': 'Email chưa được xác thực',
    'email.sendVerification': 'Gửi email xác thực',
    'email.verificationSent': 'Email xác thực đã được gửi',
    'email.enterCode': 'Nhập mã xác thực',
    'email.verifyButton': 'Xác thực',
    'email.verifying': 'Đang xác thực...',
    
    // Chat
    'chat.title': 'Tra cứu kiến thức',
    'chat.inputPlaceholder': 'Nhập câu hỏi của bạn...',
    'chat.send': 'Gửi',
    'chat.clear': 'Xóa',
    'chat.conversations': 'Cuộc trò chuyện',
    'chat.newConversation': 'Cuộc trò chuyện mới',
    'chat.noMessages': 'Chưa có tin nhắn nào',
    
    // Knowledge Admin
    'knowledge.title': 'Knowledge Admin',
    'knowledge.add': 'Thêm',
    'knowledge.edit': 'Chỉnh sửa',
    'knowledge.delete': 'Xóa',
    
    // Usage Counter
    'usage.title': 'Sử dụng hôm nay',
    'usage.queries': 'Câu hỏi',
    'usage.advancedRAG': 'Advanced RAG',
    'usage.tokens': 'Tokens',
    'usage.limit': 'Giới hạn',
    
    // Password Management
    'password.change': 'Đổi mật khẩu',
    'password.current': 'Mật khẩu hiện tại',
    'password.new': 'Mật khẩu mới',
    'password.confirm': 'Xác nhận mật khẩu mới',
    'password.currentPlaceholder': 'Nhập mật khẩu hiện tại',
    'password.newPlaceholder': 'Nhập mật khẩu mới (tối thiểu 8 ký tự)',
    'password.confirmPlaceholder': 'Nhập lại mật khẩu mới',
    'password.strength': 'Độ mạnh mật khẩu',
    'password.strength.veryWeak': 'Rất yếu',
    'password.strength.weak': 'Yếu',
    'password.strength.medium': 'Trung bình',
    'password.strength.strong': 'Mạnh',
    'password.strength.veryStrong': 'Rất mạnh',
    'password.minLength': 'Tối thiểu 8 ký tự',
    'password.addCase': 'Thêm chữ hoa và chữ thường',
    'password.addNumber': 'Thêm số',
    'password.addSpecial': 'Thêm ký tự đặc biệt',
    'password.mismatch': 'Mật khẩu xác nhận không khớp',
    'password.changeSuccess': 'Mật khẩu đã được thay đổi thành công!',
    'password.changeError': 'Lỗi khi thay đổi mật khẩu',
    'password.fillAll': 'Vui lòng điền đầy đủ thông tin',
    'password.sameAsCurrent': 'Mật khẩu mới phải khác mật khẩu hiện tại',
    'password.reset': 'Đặt lại mật khẩu',
    'password.resetSuccess': 'Đặt lại mật khẩu thành công!',
    'password.resetSuccessMessage': 'Mật khẩu của bạn đã được đặt lại thành công. Bạn sẽ được chuyển đến trang đăng nhập trong giây lát...',
    'password.resetError': 'Token không hợp lệ hoặc đã hết hạn',
    'password.noToken': 'Token không hợp lệ',
    'password.backToLogin': 'Về trang đăng nhập',
    'password.forgot': 'Quên mật khẩu?',
    'password.forgotTitle': 'Quên mật khẩu?',
    'password.forgotEmailSent': 'Email đã được gửi',
    'password.forgotMessage': 'Nếu email tồn tại, chúng tôi đã gửi link reset mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm cả Spam folder).',
    'password.forgotPlaceholder': 'Nhập email của bạn',
    'password.forgotButton': 'Gửi link reset mật khẩu',
    'password.forgotSending': 'Đang gửi...',
    'password.backToLoginLink': '← Quay lại đăng nhập',
    
    // Session Management
    'session.title': 'Quản lý Sessions',
    'session.current': 'Hiện tại',
    'session.revoke': 'Đăng xuất',
    'session.revokeAll': 'Đăng xuất tất cả khác',
    'session.revoking': 'Đang xử lý...',
    'session.revokeConfirm': 'Bạn có chắc chắn muốn đăng xuất session này?',
    'session.revokeAllConfirm': 'Bạn có chắc chắn muốn đăng xuất tất cả các session khác? (Session hiện tại sẽ được giữ lại)',
    'session.noSessions': 'Không có session nào',
    'session.loading': 'Đang tải...',
    'session.loadError': 'Không thể tải danh sách sessions',
    'session.tip': 'Mẹo: Đăng xuất các session không sử dụng để bảo mật tài khoản của bạn.',
    
    // OAuth Providers
    'oauth.title': 'Tài khoản đã liên kết',
    'oauth.description': 'Liên kết tài khoản của bạn với các dịch vụ bên thứ ba để đăng nhập nhanh hơn.',
    'oauth.link': 'Liên kết',
    'oauth.unlink': 'Hủy liên kết',
    'oauth.linking': 'Đang liên kết...',
    'oauth.linked': 'Đã liên kết',
    'oauth.unlinkConfirm': 'Bạn có chắc chắn muốn hủy liên kết với {provider}?',
    'oauth.unlinkSuccess': '{provider} đã được hủy liên kết thành công',
    'oauth.unlinkError': 'Lỗi khi hủy liên kết',
    'oauth.linkError': 'Lỗi khi liên kết',
    'oauth.loadError': 'Không thể tải danh sách tài khoản đã liên kết',
    'oauth.loading': 'Đang tải',
    'oauth.noRedirectUrl': 'Không có URL chuyển hướng',
    'oauth.noProviders': 'Chưa có tài khoản nào được liên kết',
    'oauth.linkSuccess': '{provider} đã được liên kết thành công',
  },
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.confirm': 'Confirm',
    'common.required': 'is required',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.hasAccount': 'Already have an account?',
    'auth.loginWithGoogle': 'Login with Google',
    'auth.or': 'or',
    
    // Profile
    'profile.title': 'Profile Settings',
    'profile.displayName': 'Display Name',
    'profile.displayNameHint': 'Display name can be different from email',
    'profile.bio': 'Bio',
    'profile.bioPlaceholder': 'Tell us about yourself...',
    'profile.timezone': 'Timezone',
    'profile.language': 'Language',
    'profile.avatar': 'Avatar',
    'profile.accountStatus': 'Account Status',
    'profile.createdAt': 'Created At',
    'profile.lastLogin': 'Last Login',
    'profile.saveChanges': 'Save Changes',
    'profile.saving': 'Saving...',
    'profile.updateSuccess': 'Profile updated successfully!',
    'profile.updateError': 'Error updating profile',
    'profile.loadError': 'Unable to load profile information',
    
    // Email Verification
    'email.verify': 'Email Verification',
    'email.verified': 'Email verified',
    'email.notVerified': 'Email not verified',
    'email.sendVerification': 'Send verification email',
    'email.verificationSent': 'Verification email sent',
    'email.enterCode': 'Enter verification code',
    'email.verifyButton': 'Verify',
    'email.verifying': 'Verifying...',
    
    // Chat
    'chat.title': 'Knowledge Search',
    'chat.inputPlaceholder': 'Enter your question...',
    'chat.send': 'Send',
    'chat.clear': 'Clear',
    'chat.conversations': 'Conversations',
    'chat.newConversation': 'New Conversation',
    'chat.noMessages': 'No messages yet',
    
    // Knowledge Admin
    'knowledge.title': 'Knowledge Admin',
    'knowledge.add': 'Add',
    'knowledge.edit': 'Edit',
    'knowledge.delete': 'Delete',
    
    // Usage Counter
    'usage.title': 'Usage Today',
    'usage.queries': 'Queries',
    'usage.advancedRAG': 'Advanced RAG',
    'usage.tokens': 'Tokens',
    'usage.limit': 'Limit',
    
    // Password Management
    'password.change': 'Change Password',
    'password.current': 'Current Password',
    'password.new': 'New Password',
    'password.confirm': 'Confirm New Password',
    'password.currentPlaceholder': 'Enter current password',
    'password.newPlaceholder': 'Enter new password (minimum 8 characters)',
    'password.confirmPlaceholder': 'Re-enter new password',
    'password.strength': 'Password Strength',
    'password.strength.veryWeak': 'Very Weak',
    'password.strength.weak': 'Weak',
    'password.strength.medium': 'Medium',
    'password.strength.strong': 'Strong',
    'password.strength.veryStrong': 'Very Strong',
    'password.minLength': 'Minimum 8 characters',
    'password.addCase': 'Add uppercase and lowercase letters',
    'password.addNumber': 'Add numbers',
    'password.addSpecial': 'Add special characters',
    'password.mismatch': 'Passwords do not match',
    'password.changeSuccess': 'Password changed successfully!',
    'password.changeError': 'Error changing password',
    'password.fillAll': 'Please fill in all fields',
    'password.sameAsCurrent': 'New password must be different from current password',
    'password.reset': 'Reset Password',
    'password.resetSuccess': 'Password reset successful!',
    'password.resetSuccessMessage': 'Your password has been reset successfully. You will be redirected to the login page shortly...',
    'password.resetError': 'Invalid or expired token',
    'password.noToken': 'Invalid token',
    'password.backToLogin': 'Back to Login',
    'password.forgot': 'Forgot Password?',
    'password.forgotTitle': 'Forgot Password?',
    'password.forgotEmailSent': 'Email Sent',
    'password.forgotMessage': 'If the email exists, we have sent a password reset link to your email. Please check your inbox (including Spam folder).',
    'password.forgotPlaceholder': 'Enter your email',
    'password.forgotButton': 'Send Reset Link',
    'password.forgotSending': 'Sending...',
    'password.backToLoginLink': '← Back to Login',
    
    // Session Management
    'session.title': 'Session Management',
    'session.current': 'Current',
    'session.revoke': 'Sign Out',
    'session.revokeAll': 'Sign Out All Others',
    'session.revoking': 'Processing...',
    'session.revokeConfirm': 'Are you sure you want to sign out this session?',
    'session.revokeAllConfirm': 'Are you sure you want to sign out all other sessions? (Current session will be kept)',
    'session.noSessions': 'No sessions',
    'session.loading': 'Loading...',
    'session.loadError': 'Unable to load sessions',
    'session.tip': 'Tip: Sign out unused sessions to secure your account.',
    
    // OAuth Providers
    'oauth.title': 'Connected Accounts',
    'oauth.description': 'Link your account with third-party services for faster login.',
    'oauth.link': 'Link',
    'oauth.unlink': 'Unlink',
    'oauth.linking': 'Linking...',
    'oauth.linked': 'Linked',
    'oauth.unlinkConfirm': 'Are you sure you want to unlink {provider}?',
    'oauth.unlinkSuccess': '{provider} has been unlinked successfully',
    'oauth.unlinkError': 'Error unlinking account',
    'oauth.linkError': 'Error linking account',
    'oauth.loadError': 'Unable to load connected accounts',
    'oauth.loading': 'Loading',
    'oauth.noRedirectUrl': 'No redirect URL available',
    'oauth.noProviders': 'No accounts linked yet',
    'oauth.linkSuccess': '{provider} has been linked successfully',
  },
};

export function LanguageProvider({ children }) {
  // Get initial language from localStorage or default to 'vi'
  const getInitialLanguage = () => {
    const saved = localStorage.getItem('language');
    if (saved && ['vi', 'en'].includes(saved)) {
      return saved;
    }
    return 'vi';
  };

  const [language, setLanguage] = useState(getInitialLanguage);

  // Load language from user profile on mount (if logged in)
  useEffect(() => {
    const loadUserLanguage = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await axios.get(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userLanguage = res.data.language;
        if (userLanguage && ['vi', 'en'].includes(userLanguage)) {
          setLanguage(userLanguage);
          localStorage.setItem('language', userLanguage);
        }
      } catch (err) {
        // User not logged in or error - use saved preference
        console.log('Could not load user language preference');
      }
    };

    loadUserLanguage();
  }, []);

  const changeLanguage = (newLanguage) => {
    if (!['vi', 'en'].includes(newLanguage)) return;
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    
    // Update user profile if logged in
    const token = localStorage.getItem('token');
    if (token) {
      axios.put(
        `${API_URL}/user/profile`,
        { language: newLanguage },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(err => {
        console.error('Error updating language preference:', err);
      });
    }
  };

  const t = (key, fallback = key) => {
    return translations[language]?.[key] || fallback;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

