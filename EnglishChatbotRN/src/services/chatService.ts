import api from '../config/api';
import {ApiResponse, ChatMessage} from '../types';

export const chatService = {
  async sendMessage(message: string): Promise<ApiResponse<{response: string}>> {
    try {
      const response = await api.post('/chat/ask', {question: message});
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send message',
      };
    }
  },

  async getSuggestions(): Promise<ApiResponse<string[]>> {
    try {
      const response = await api.get('/suggest');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get suggestions',
      };
    }
  },

  async translate(text: string): Promise<ApiResponse<{translation: string}>> {
    try {
      const response = await api.post('/chat/translate', {text});
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Translation failed',
      };
    }
  },
};