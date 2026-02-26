
import express from 'express';
import cors from 'cors';
import '#bootstrap/env.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Routes
import authRoutes from '#modules/auth/routes/auth.routes.js';
import userRoutes from '#modules/user/routes/user.routes.js';
import passwordRoutes from '#modules/user/routes/password.routes.js';
import sessionRoutes from '#modules/user/routes/session.routes.js';
import chatRoutes from '#modules/chat/routes/chat.routes.js';
import advancedChatRoutes from '#modules/chat/routes/advancedChat.routes.js';
import conversationRoutes from '#modules/chat/routes/conversation.routes.js';
import suggestRoutes from '#modules/chat/routes/suggestion.routes.js';
import unansweredRoutes from '#modules/chat/routes/unanswered.routes.js';
import knowledgeRoutes from '#modules/knowledge/routes/knowledge.routes.js';
import uploadRoutes from '#modules/upload/routes/upload.routes.js';
import walletRoutes from '#modules/wallet/routes/wallet.routes.js';
import paymentRoutes from '#modules/wallet/routes/payment.routes.js';
import subscriptionRoutes from '#modules/subscription/routes/subscription.routes.js';
import usageRoutes from '#modules/usage/routes/usage.routes.js';
import writingRoutes from '#modules/writing/routes/writing.routes.js';
import listeningRoutes from '#modules/listening/routes/listening.routes.js';
import readingRoutes from '#modules/reading/routes/reading.routes.js';
import speakingRoutes from '#modules/speaking/routes/speaking.routes.js';
import learningRoutes from '#modules/learning/routes/learning.routes.js';
import subscriptionWorker from '#services/subscriptionWorker.js';

import errorHandler from '#middlewares/errorHandler.js';

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

// Register Routes
app.use('/auth', authRoutes);
app.use('/auth/password', passwordRoutes);
app.use('/auth/sessions', sessionRoutes);
app.use('/user', userRoutes);

app.use('/chat', chatRoutes);
app.use('/advanced-chat', advancedChatRoutes);
app.use('/conversations', conversationRoutes);
app.use('/suggest-next-word', suggestRoutes);
app.use('/unanswered', unansweredRoutes);

app.use('/knowledge', knowledgeRoutes);
app.use('/upload', uploadRoutes);

app.use('/wallet', walletRoutes);
app.use('/payment', paymentRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/usage', usageRoutes);
app.use('/writing', writingRoutes);
app.use('/listening', listeningRoutes);
app.use('/reading', readingRoutes);
app.use('/speaking', speakingRoutes);
app.use('/learning', learningRoutes);


app.context = app; // For rare cases passing app context

// Error Handler
app.use(errorHandler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  // Start background tasks
  subscriptionWorker.startSubscriptionWorker();
});
