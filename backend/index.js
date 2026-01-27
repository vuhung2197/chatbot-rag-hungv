import express from 'express';
import cors from 'cors';
import './bootstrap/env.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/modules/auth/auth.routes.js';
import userRoutes from './src/modules/user/user.routes.js';
import passwordRoutes from './src/modules/user/password.routes.js';
import sessionRoutes from './src/modules/user/session.routes.js';
import chatRoutes from './src/modules/chat/chat.routes.js';
import advancedChatRoutes from './src/modules/chat/advancedChat.routes.js';
import conversationRoutes from './src/modules/chat/conversation.routes.js';
import suggestRoutes from './src/modules/chat/suggestion.routes.js';
import unansweredRoutes from './src/modules/chat/unanswered.routes.js';
import knowledgeRoutes from './src/modules/knowledge/knowledge.routes.js';
import uploadRoutes from './src/modules/upload/upload.routes.js';
import walletRoutes from './src/modules/wallet/routes/wallet.routes.js';
import paymentRoutes from './src/modules/wallet/routes/payment.routes.js';
import subscriptionRoutes from './src/modules/subscription/subscription.routes.js';
import usageRoutes from './src/modules/usage/usage.routes.js';
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
app.use('/wallet', walletRoutes);
app.context = app; // For rare cases passing app context

app.use(errorHandler);

const PORT = 3001;
app.listen(PORT, () =>
  console.log(`Backend running at http://localhost:${PORT}`)
);
