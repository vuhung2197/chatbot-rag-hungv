import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';

// Change this to your backend URL
export const API_BASE_URL = 'http://10.0.2.2:3001'; // Android emulator localhost

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await EncryptedStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and redirect to login
      await EncryptedStorage.removeItem('auth_token');
      await EncryptedStorage.removeItem('user_role');
    }
    return Promise.reject(error);
  },
);

export default api;