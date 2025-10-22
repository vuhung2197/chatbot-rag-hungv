import express from 'express';
import cors from 'cors';
import './bootstrap/env.js';
import cookieParser from 'cookie-parser';

import chatRoutes from './routes/chat.js';
import feedbackRoutes from './routes/feedback.js';
import highlightsRoutes from './routes/highlights.js';
import knowledgeRoutes from './routes/knowledge.js';
import suggestRoutes from './routes/suggest.js';
import unansweredRoutes from './routes/unanswered.js';
import uploadRoutes from './routes/upload.js';
import authRoutes from './routes/auth.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Import routes
app.use('/chat', chatRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/highlights', highlightsRoutes);
app.use('/knowledge', knowledgeRoutes);
app.use('/suggest-next-word', suggestRoutes);
app.use('/unanswered', unansweredRoutes);
app.use('/upload', uploadRoutes);
app.use('/auth', authRoutes);

app.use(errorHandler);

const PORT = 3001;
app.listen(PORT, () =>
  console.log(`Backend running at http://localhost:${PORT}`)
);
