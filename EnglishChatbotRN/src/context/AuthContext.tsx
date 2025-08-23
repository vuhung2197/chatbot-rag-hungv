import React, {createContext, useContext, useEffect, useState} from 'react';
import {authService} from '../services/authService';
import {mockAuthService} from '../services/mockAuthService';

// Toggle between mock and real auth service for testing
const USE_MOCK_AUTH = __DEV__; // Use mock auth in development mode
const authServiceInstance = USE_MOCK_AUTH ? mockAuthService : authService;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await authServiceInstance.getStoredToken();
      const role = await authServiceInstance.getStoredRole();
      
      if (token && role) {
        setIsAuthenticated(true);
        setUserRole(role);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const result = await authServiceInstance.login(username, password);
      if (result.success && result.role) {
        setIsAuthenticated(true);
        setUserRole(result.role);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (username: string, password: string): Promise<boolean> => {
    try {
      const result = await authServiceInstance.register(username, password);
      return result.success;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authServiceInstance.logout();
      setIsAuthenticated(false);
      setUserRole(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        login,
        register,
        logout,
        loading,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};