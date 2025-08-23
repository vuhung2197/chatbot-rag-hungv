import EncryptedStorage from 'react-native-encrypted-storage';
import {AuthResponse} from '../types';

// Mock test users for development
const TEST_USERS = [
  {
    username: 'vuhung',
    password: '123456',
    role: 'user',
    token: 'mock_token_vuhung_123'
  },
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    token: 'mock_token_admin_123'
  },
  {
    username: 'test',
    password: 'test123',
    role: 'user',
    token: 'mock_token_test_123'
  }
];

export const mockAuthService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const user = TEST_USERS.find(u => u.username === username && u.password === password);
      
      if (user) {
        await EncryptedStorage.setItem('auth_token', user.token);
        await EncryptedStorage.setItem('user_role', user.role);
        
        return {
          success: true,
          message: 'Login successful',
          token: user.token,
          role: user.role
        };
      } else {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Login failed'
      };
    }
  },

  async register(username: string, password: string): Promise<AuthResponse> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if username already exists
      const existingUser = TEST_USERS.find(u => u.username === username);
      
      if (existingUser) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }
      
      // For mock purposes, just return success
      return {
        success: true,
        message: 'Registration successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await EncryptedStorage.removeItem('auth_token');
      await EncryptedStorage.removeItem('user_role');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getStoredToken(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  },

  async getStoredRole(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem('user_role');
    } catch (error) {
      console.error('Error getting stored role:', error);
      return null;
    }
  },
};