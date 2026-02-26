import { StatusCodes } from 'http-status-codes';
import writingService from '../services/writing.service.js';

// =============================================================================
// Writing Controller - API Request/Response Handler
// =============================================================================

// ==================== EXERCISES ====================

export async function getExercises(req, res) {
    try {
        const { level, type, page, limit } = req.query;
        const result = await writingService.getExercises({
            level, type,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('❌ Error getting exercises:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function getExerciseById(req, res) {
    try {
        const exercise = await writingService.getExerciseById(parseInt(req.params.id));
        res.json({ success: true, exercise });
    } catch (err) {
        const status = err.message === 'Exercise not found' ? 404 : 500;
        res.status(status).json({ success: false, error: err.message });
    }
}

// ==================== SUBMISSIONS ====================

export async function submitWriting(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const { exerciseId, content } = req.body;
        if (!content || content.trim().length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Content is required' });
        }

        // TODO: Get user plan from subscription service
        const userPlan = 'free';

        const submission = await writingService.submitWriting(userId, {
            exerciseId, content, userPlan
        });

        res.status(StatusCodes.CREATED).json({ success: true, submission });
    } catch (err) {
        const isClientError = err.message.includes('Daily limit') || err.message.includes('AI system failed') || err.message.includes('least 5 words');
        const status = isClientError ? 400 : 500;
        res.status(status).json({ success: false, error: err.message });
    }
}

export async function getSubmissions(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const { page, limit } = req.query;
        const submissions = await writingService.getSubmissions(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.json({ success: true, submissions });
    } catch (err) {
        console.error('❌ Error getting submissions:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function getSubmissionDetail(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const submission = await writingService.getSubmissionDetail(userId, parseInt(req.params.id));
        res.json({ success: true, submission });
    } catch (err) {
        const status = err.message === 'Submission not found' ? 404 : 500;
        res.status(status).json({ success: false, error: err.message });
    }
}

// ==================== STREAK ====================

export async function getStreak(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const streak = await writingService.getStreak(userId);
        res.json({ success: true, streak });
    } catch (err) {
        console.error('❌ Error getting streak:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function useStreakFreeze(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const streak = await writingService.useStreakFreeze(userId);
        res.json({ success: true, streak });
    } catch (err) {
        const status = err.message.includes('No streak freezes') ? 400 : 500;
        res.status(status).json({ success: false, error: err.message });
    }
}

// ==================== VOCABULARY ====================

export async function getVocabulary(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const { page, limit, sort, order } = req.query;
        const result = await writingService.getVocabulary(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
            sort, order
        });

        res.json({ success: true, ...result });
    } catch (err) {
        console.error('❌ Error getting vocabulary:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function addVocabulary(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const { word, definition, exampleSentence, level } = req.body;
        const vocab = await writingService.addVocabulary(userId, { word, definition, exampleSentence, level });

        res.status(StatusCodes.CREATED).json({ success: true, vocabulary: vocab });
    } catch (err) {
        const status = err.message === 'Word is required' ? 400 : 500;
        res.status(status).json({ success: false, error: err.message });
    }
}

export async function getVocabularyForReview(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const words = await writingService.getVocabularyForReview(userId);
        res.json({ success: true, words });
    } catch (err) {
        console.error('❌ Error getting review words:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function reviewVocabulary(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const { quality } = req.body; // 0-5
        const result = await writingService.reviewVocabulary(userId, parseInt(req.params.id), quality);

        res.json({ success: true, vocabulary: result });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
}

export async function deleteVocabulary(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        await writingService.deleteVocabulary(userId, parseInt(req.params.id));
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        const status = err.message === 'Vocabulary not found' ? 404 : 500;
        res.status(status).json({ success: false, error: err.message });
    }
}

// ==================== STATS ====================

export async function getStats(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Login required' });

        const stats = await writingService.getStats(userId);
        res.json({ success: true, stats });
    } catch (err) {
        console.error('❌ Error getting stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}
