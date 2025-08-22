// Tập trung tất cả config và constants ở đây
export const CONFIG = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  DEFAULT_USER_EMAIL: process.env.REACT_APP_DEFAULT_USER_EMAIL || 'user@example.com',
  
  // OAuth settings
  GOOGLE_OAUTH_START: `${process.env.REACT_APP_API_URL  }/auth/google`,
  
  // UI Constants
  TOAST_DURATION: 2000,
  LOADING_TIMEOUT: 30000,
  
  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
};

export const MESSAGES = {
  AUTH: {
    TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    LOGIN_REQUIRED: 'Bạn cần đăng nhập để sử dụng tính năng này.',
    LOGIN_SUCCESS: 'Đăng nhập thành công!',
    LOGOUT_SUCCESS: 'Đã đăng xuất!'
  },
  EMAIL: {
    LOADING: 'Đang tải danh sách email...',
    EMPTY: 'Không tìm thấy bản tin nào trong hộp thư của bạn.',
    UNSUBSCRIBE_SUCCESS: 'Đã hủy đăng ký thành công!',
    UNSUBSCRIBE_ERROR: 'Có lỗi khi hủy đăng ký.'
  },
  ERRORS: {
    NETWORK: 'Lỗi kết nối mạng. Vui lòng thử lại.',
    SERVER: 'Lỗi máy chủ. Vui lòng liên hệ hỗ trợ.',
    UNKNOWN: 'Đã xảy ra lỗi không xác định.'
  }
};

// Helper function để get user email từ localStorage hoặc context
export function getCurrentUserEmail() {
  // Thứ tự ưu tiên:
  // 1. Từ token đã decode
  // 2. Từ localStorage  
  // 3. Default value
  
  try {
    const token = localStorage.getItem('token');
    if (token) {
      // Decode JWT để lấy email (không verify vì chỉ đọc thông tin)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email || CONFIG.DEFAULT_USER_EMAIL;
    }
  } catch (error) {
    console.warn('Could not decode token for user email:', error);
  }
  
  return CONFIG.DEFAULT_USER_EMAIL;
}

// Helper function để validate email
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}