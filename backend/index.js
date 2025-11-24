import express from 'express';
import cors from 'cors';
import './bootstrap/env.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import chatRoutes from './routes/chat.js';
import advancedChatRoutes from './routes/advancedChat.js';
import knowledgeRoutes from './routes/knowledge.js';
import suggestRoutes from './routes/suggest.js';
import unansweredRoutes from './routes/unanswered.js';
import uploadRoutes from './routes/upload.js';
import authRoutes from './routes/auth.js';
import usageRoutes from './routes/usage.js';
import subscriptionRoutes from './routes/subscription.js';
import paymentRoutes from './routes/payment.js';
import conversationRoutes from './routes/conversation.js';
import userRoutes from './routes/user.js';
import passwordRoutes from './routes/password.js';
import sessionRoutes from './routes/session.js';
import errorHandler from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration to allow credentials (cookies)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files (avatars)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
app.use('/chat', chatRoutes);
app.use('/advanced-chat', advancedChatRoutes);
app.use('/knowledge', knowledgeRoutes);
app.use('/suggest-next-word', suggestRoutes);
app.use('/unanswered', unansweredRoutes);
app.use('/upload', uploadRoutes);
app.use('/auth', authRoutes);
app.use('/usage', usageRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/payment', paymentRoutes);
app.use('/conversations', conversationRoutes);
app.use('/user', userRoutes);
app.use('/auth/password', passwordRoutes);
app.use('/auth/sessions', sessionRoutes);

app.use(errorHandler);

const PORT = 3001;
app.listen(PORT, () =>
  console.log(`Backend running at http://localhost:${PORT}`)
);
