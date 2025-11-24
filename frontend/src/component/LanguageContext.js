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
    
    // Avatar
    'avatar.selectImage': 'Chọn ảnh',
    'avatar.selectAgain': 'Chọn lại',
    'avatar.upload': 'Upload',
    'avatar.uploading': 'Đang upload...',
    'avatar.delete': 'Xóa',
    'avatar.fileInfo': 'JPG/PNG, tối đa 2MB, sẽ được resize về 200x200',
    'avatar.invalidFileType': 'Chỉ chấp nhận file JPG/PNG',
    'avatar.fileTooLarge': 'File quá lớn (max 2MB)',
    'avatar.uploadError': 'Lỗi khi upload avatar',
    'avatar.noImageSelected': 'Vui lòng chọn ảnh',
    'avatar.cropTitle': 'Cắt và chỉnh sửa ảnh đại diện',
    'avatar.zoom': 'Phóng to',
    'avatar.cancel': 'Hủy',
    'avatar.save': 'Lưu',
    'avatar.deleteConfirm': 'Bạn có chắc muốn xóa avatar?',
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
    'usage.dashboard': 'Bảng điều khiển sử dụng',
    'usage.todayUsage': 'Sử dụng hôm nay',
    'usage.fileUploads': 'File đã upload',
    'usage.fileSize': 'Kích thước file',
    'usage.nearLimit': 'Gần đạt giới hạn',
    'usage.limitReached': 'Đã đạt giới hạn',
    'usage.statistics': 'Thống kê',
    'usage.totalQueries': 'Tổng câu hỏi',
    'usage.totalFiles': 'Tổng file',
    'usage.totalSize': 'Tổng dung lượng',
    'usage.totalTokens': 'Tổng tokens',
    'usage.last7Days': '7 ngày qua',
    'usage.last30Days': '30 ngày qua',
    'usage.last12Months': '12 tháng qua',
    'usage.loadError': 'Không thể tải thông tin sử dụng',
    'usage.noData': 'Chưa có dữ liệu',
    'usage.usageTrends': 'Xu hướng sử dụng',
    
    // Subscription
    'subscription.title': 'Gói đăng ký',
    'subscription.plans': 'Các gói đăng ký',
    'subscription.current': 'Gói hiện tại',
    'subscription.active': 'Đang hoạt động',
    'subscription.trial': 'Dùng thử',
    'subscription.cancelled': 'Đã hủy',
    'subscription.free': 'Miễn phí',
    'subscription.month': 'tháng',
    'subscription.year': 'năm',
    'subscription.monthly': 'Hàng tháng',
    'subscription.yearly': 'Hàng năm',
    'subscription.save': 'Tiết kiệm',
    'subscription.periodStart': 'Bắt đầu',
    'subscription.periodEnd': 'Kết thúc',
    'subscription.willCancel': 'Sẽ bị hủy khi hết hạn',
    'subscription.features': 'Tính năng',
    'subscription.unlimitedQueries': 'Câu hỏi không giới hạn',
    'subscription.queriesPerDay': 'câu hỏi/ngày',
    'subscription.advancedRAG': 'Advanced RAG',
    'subscription.unlimitedFileUpload': 'Upload file không giới hạn',
    'subscription.fileUpload': 'Upload file',
    'subscription.unlimitedHistory': 'Lịch sử không giới hạn',
    'subscription.daysHistory': 'ngày lịch sử',
    'subscription.prioritySupport': 'Hỗ trợ ưu tiên',
    'subscription.apiAccess': 'Truy cập API',
    'subscription.teamCollaboration': 'Cộng tác nhóm',
    'subscription.upgrade': 'Nâng cấp',
    'subscription.upgrading': 'Đang nâng cấp...',
    'subscription.currentPlan': 'Gói hiện tại',
    'subscription.upgradeConfirm': 'Bạn có chắc muốn nâng cấp gói này?',
    'subscription.cancel': 'Hủy đăng ký',
    'subscription.cancelConfirm': 'Bạn có chắc muốn hủy đăng ký? Gói sẽ hết hạn vào cuối chu kỳ thanh toán.',
    'subscription.renew': 'Gia hạn',
    'subscription.loadError': 'Không thể tải thông tin đăng ký',
    'subscription.upgradeError': 'Lỗi khi nâng cấp gói',
    'subscription.cancelError': 'Lỗi khi hủy đăng ký',
    'subscription.renewError': 'Lỗi khi gia hạn',
    'subscription.downgradeNotAllowed': 'Không thể downgrade',
    'subscription.billingHistory': 'Lịch sử thanh toán',
    'subscription.invoiceNumber': 'Số hóa đơn',
    'subscription.plan': 'Gói',
    'subscription.amount': 'Số tiền',
    'subscription.billingCycle': 'Chu kỳ',
    'subscription.period': 'Kỳ hạn',
    'subscription.status': 'Trạng thái',
    'subscription.date': 'Ngày',
    'subscription.monthly': 'Tháng',
    'subscription.yearly': 'Năm',
    'subscription.noInvoices': 'Chưa có lịch sử thanh toán',
    'subscription.billingNote': 'Lưu ý: Đây là lịch sử thanh toán đơn giản. Trong môi trường production, sẽ tích hợp với Stripe/PayPal.',
    'subscription.nearLimitUpgrade': 'Bạn đang sử dụng {percentage}% giới hạn {limitType}. Hãy nâng cấp để có thêm dung lượng.',
    'subscription.limitReachedUpgrade': 'Bạn đã đạt giới hạn {limitType}. Nâng cấp để tiếp tục sử dụng dịch vụ.',
    
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
    
    // Avatar
    'avatar.selectImage': 'Select Image',
    'avatar.selectAgain': 'Select Again',
    'avatar.upload': 'Upload',
    'avatar.uploading': 'Uploading...',
    'avatar.delete': 'Delete',
    'avatar.fileInfo': 'JPG/PNG, max 2MB, will be resized to 200x200',
    'avatar.invalidFileType': 'Only JPG/PNG files are accepted',
    'avatar.fileTooLarge': 'File too large (max 2MB)',
    'avatar.uploadError': 'Error uploading avatar',
    'avatar.noImageSelected': 'Please select an image',
    'avatar.cropTitle': 'Crop and Edit Avatar',
    'avatar.zoom': 'Zoom',
    'avatar.cancel': 'Cancel',
    'avatar.save': 'Save',
    'avatar.deleteConfirm': 'Are you sure you want to delete the avatar?',
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
    'usage.dashboard': 'Usage Dashboard',
    'usage.todayUsage': "Today's Usage",
    'usage.fileUploads': 'Files Uploaded',
    'usage.fileSize': 'File Size',
    'usage.nearLimit': 'Near Limit',
    'usage.limitReached': 'Limit Reached',
    'usage.statistics': 'Statistics',
    'usage.totalQueries': 'Total Queries',
    'usage.totalFiles': 'Total Files',
    'usage.totalSize': 'Total Size',
    'usage.totalTokens': 'Total Tokens',
    'usage.last7Days': 'Last 7 Days',
    'usage.last30Days': 'Last 30 Days',
    'usage.last12Months': 'Last 12 Months',
    'usage.loadError': 'Unable to load usage information',
    'usage.noData': 'No data available',
    'usage.usageTrends': 'Usage Trends',
    
    // Subscription
    'subscription.title': 'Subscription',
    'subscription.plans': 'Subscription Plans',
    'subscription.current': 'Current',
    'subscription.active': 'Active',
    'subscription.trial': 'Trial',
    'subscription.cancelled': 'Cancelled',
    'subscription.free': 'Free',
    'subscription.month': 'month',
    'subscription.year': 'year',
    'subscription.monthly': 'Monthly',
    'subscription.yearly': 'Yearly',
    'subscription.save': 'Save',
    'subscription.periodStart': 'Period Start',
    'subscription.periodEnd': 'Period End',
    'subscription.willCancel': 'Will cancel at period end',
    'subscription.features': 'Features',
    'subscription.unlimitedQueries': 'Unlimited Queries',
    'subscription.queriesPerDay': 'queries/day',
    'subscription.advancedRAG': 'Advanced RAG',
    'subscription.unlimitedFileUpload': 'Unlimited File Upload',
    'subscription.fileUpload': 'File Upload',
    'subscription.unlimitedHistory': 'Unlimited History',
    'subscription.daysHistory': 'days history',
    'subscription.prioritySupport': 'Priority Support',
    'subscription.apiAccess': 'API Access',
    'subscription.teamCollaboration': 'Team Collaboration',
    'subscription.upgrade': 'Upgrade',
    'subscription.upgrading': 'Upgrading...',
    'subscription.currentPlan': 'Current Plan',
    'subscription.upgradeConfirm': 'Are you sure you want to upgrade to this plan?',
    'subscription.cancel': 'Cancel Subscription',
    'subscription.cancelConfirm': 'Are you sure you want to cancel? Your plan will expire at the end of the billing period.',
    'subscription.renew': 'Renew',
    'subscription.loadError': 'Unable to load subscription information',
    'subscription.upgradeError': 'Error upgrading subscription',
    'subscription.cancelError': 'Error cancelling subscription',
    'subscription.renewError': 'Error renewing subscription',
    'subscription.downgradeNotAllowed': 'Downgrade not allowed',
    'subscription.billingHistory': 'Billing History',
    'subscription.invoiceNumber': 'Invoice #',
    'subscription.plan': 'Plan',
    'subscription.amount': 'Amount',
    'subscription.billingCycle': 'Billing Cycle',
    'subscription.period': 'Period',
    'subscription.status': 'Status',
    'subscription.date': 'Date',
    'subscription.monthly': 'Monthly',
    'subscription.yearly': 'Yearly',
    'subscription.noInvoices': 'No billing history found',
    'subscription.billingNote': 'Note: This is a simplified billing history. In production, this would integrate with Stripe/PayPal for actual payment records.',
    'subscription.nearLimitUpgrade': "You're using {percentage}% of your {limitType} limit. Consider upgrading for more capacity.",
    'subscription.limitReachedUpgrade': "You've reached your {limitType} limit. Upgrade to continue using the service.",
    
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

