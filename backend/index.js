import express from 'express';
import cors from 'cors';
import './bootstrap/env.js'; // Ensure environment variables are loaded

import chatRoutes from './routes/chat.js';
import feedbackRoutes from './routes/feedback.js';
import highlightsRoutes from './routes/highlights.js';
import knowledgeRoutes from './routes/knowledge.js';
import suggestRoutes from './routes/suggest.js';
import unansweredRoutes from './routes/unanswered.js';
import uploadRoutes from './routes/upload.js';
import authRoutes from './routes/auth.js';
import writingRoutes from './routes/writing.js';

const app = express();

app.use(cors());
app.use(express.json());

// Import routes
app.use('/chat', chatRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/highlights', highlightsRoutes);
app.use('/knowledge', knowledgeRoutes);
app.use('/suggest-next-word', suggestRoutes);
app.use('/unanswered', unansweredRoutes);
app.use('/upload', uploadRoutes);
app.use('/auth', authRoutes);
app.use('/writing', writingRoutes);

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
