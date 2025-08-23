export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  token: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface Knowledge {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  role?: 'admin' | 'user';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}