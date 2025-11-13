import axios from 'axios';

/**
 * Setup axios interceptor to handle 401 errors (session expired/revoked)
 * This will automatically logout users when their session is revoked from another device
 */
export function setupAxiosInterceptor(onLogout) {
  // Response interceptor
  axios.interceptors.response.use(
    (response) => {
      // If response is successful, just return it
      return response;
    },
    (error) => {
      // Handle 401 errors
      if (error.response?.status === 401) {
        const errorMessage = error.response?.data?.message || '';
        
        // Check if error is related to session (expired, revoked, etc.)
        // Only auto-logout for specific session-related errors, not all 401s
        const sessionErrors = [
          'Session expired or revoked',
          'Session expired or revoked. Please login again.',
          'Session expired',
          'Token expired',
          'Token expired. Please login again.',
          'Session user mismatch',
          'Invalid token',
          'Token not found',
        ];
        
        const isSessionError = sessionErrors.some(msg => 
          errorMessage.toLowerCase().includes(msg.toLowerCase())
        );
        
        // Check if error message explicitly mentions token/session issues
        // Only logout if error message clearly indicates session problem
        // Don't logout for generic "Unauthorized" or permission errors
        // Also exclude "Token missing" - this is usually a client-side error, not session expired
        const hasExplicitSessionError = errorMessage && (
          errorMessage.toLowerCase().includes('token expired') ||
          errorMessage.toLowerCase().includes('session expired') ||
          errorMessage.toLowerCase().includes('session revoked') ||
          errorMessage.toLowerCase().includes('invalid token') ||
          errorMessage.toLowerCase().includes('token not found') ||
          errorMessage.toLowerCase().includes('session user mismatch') ||
          (errorMessage.toLowerCase().includes('please login again') && 
           !errorMessage.toLowerCase().includes('token missing'))
        );
        
        // Exclude "Token missing" - this is usually a client-side error (component forgot to send token)
        // not a session expiration issue
        const isTokenMissing = errorMessage.toLowerCase().includes('token missing');
        
        // Only auto-logout if error message explicitly indicates session/token problem
        // Generic "Unauthorized" (empty or just "Unauthorized") should NOT trigger logout
        // "Token missing" should NOT trigger logout (client-side error)
        // This prevents logout on permission errors (e.g., file upload permission issues)
        if ((isSessionError || hasExplicitSessionError) && !isTokenMissing) {
          console.log('🔐 Session expired or revoked. Auto-logging out...');
          
          // Clear localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          
          // Call logout callback if provided
          if (onLogout && typeof onLogout === 'function') {
            onLogout();
          } else {
            // Fallback: reload page to login
            window.location.reload();
          }
        }
        // If it's just "Unauthorized" without session error, let component handle it
      }
      
      // Return error to be handled by component
      return Promise.reject(error);
    }
  );
}

