import api from '../config/api';
import {ApiResponse, Knowledge} from '../types';

export const knowledgeService = {
  async getKnowledge(): Promise<ApiResponse<Knowledge[]>> {
    try {
      const response = await api.get('/knowledge');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch knowledge',
      };
    }
  },

  async addKnowledge(title: string, content: string): Promise<ApiResponse> {
    try {
      const response = await api.post('/knowledge', {title, content});
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add knowledge',
      };
    }
  },

  async updateKnowledge(id: string, title: string, content: string): Promise<ApiResponse> {
    try {
      const response = await api.put(`/knowledge/${id}`, {title, content});
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update knowledge',
      };
    }
  },

  async deleteKnowledge(id: string): Promise<ApiResponse> {
    try {
      const response = await api.delete(`/knowledge/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete knowledge',
      };
    }
  },

  async chunkKnowledge(id: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/knowledge/${id}/chunk`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to chunk knowledge',
      };
    }
  },
};