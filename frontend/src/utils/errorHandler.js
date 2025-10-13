// Error handling utilities

// Define specific error types
export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed', statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.userMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
}

export class ValidationError extends Error {
  constructor(field, message) {
    super(`Validation failed for ${field}: ${message}`);
    this.name = 'ValidationError';
    this.field = field;
    this.userMessage = message;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
    this.userMessage =
      'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
  }
}

export class ServerError extends Error {
  constructor(message = 'Server error', statusCode = 500) {
    super(message);
    this.name = 'ServerError';
    this.statusCode = statusCode;
    this.userMessage = 'Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
  }
}

// Parse API error response into specific error types
export function parseApiError(error) {
  if (!error.response) {
    // Network error (no response from server)
    return new NetworkError(error.message);
  }

  const { status, data } = error.response;
  const message = data?.message || data?.error || error.message;

  switch (status) {
    case 401:
      return new AuthenticationError(message, status);
    case 400:
      return new ValidationError('request', message);
    case 403:
      return new AuthenticationError('Không có quyền truy cập', status);
    case 404:
      return new ServerError('Không tìm thấy tài nguyên', status);
    case 500:
    default:
      return new ServerError(message, status);
  }
}

// Check if error requires authentication
export function isAuthError(error) {
  if (error instanceof AuthenticationError) return true;

  const status = error.response?.status;
  const message = error.response?.data?.message || error.message || '';

  return (
    status === 401 ||
    message.includes('token') ||
    message.includes('authenticate') ||
    message.includes('expired')
  );
}

// Get user-friendly error message
export function getUserErrorMessage(error) {
  if (error.userMessage) {
    return error.userMessage;
  }

  // Fallback for unknown errors
  return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
}

// Log error for debugging (only in development)
export function logError(error, context = '') {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error ${context ? `in ${context}` : ''}`);
    console.error('Type:', error.name || 'UnknownError');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.response) {
      console.error('Response:', error.response.data);
      console.error('Status:', error.response.status);
    }
    console.groupEnd();
  }
}

// Enhanced error handler for API calls
export function handleApiError(error, context = '', onAuthError = null) {
  const parsedError = parseApiError(error);

  // Log for debugging
  logError(parsedError, context);

  // Handle authentication errors
  if (isAuthError(parsedError) && onAuthError) {
    onAuthError(parsedError);
    return parsedError;
  }

  return parsedError;
}
