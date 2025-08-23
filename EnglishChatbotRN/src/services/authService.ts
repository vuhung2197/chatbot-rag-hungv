import api from '../config/api';
import EncryptedStorage from 'react-native-encrypted-storage';
import {AuthResponse} from '../types';

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/login', {username, password});
      
      if (response.data.success && response.data.token) {
        await EncryptedStorage.setItem('auth_token', response.data.token);
        await EncryptedStorage.setItem('user_role', response.data.role);
      }
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  },

  async register(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/register', {username, password});
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
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