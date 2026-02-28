import vocabularyService from '../services/vocabulary.service.js';

class VocabularyController {
    // 1. Get system words library
    async getSystemVocabulary(req, res) {
        try {
            const userId = req.user.id;
            const level = req.query.level || null;
            console.log(`[VOCAB-API] getSystemVocabulary fetched by user ${userId} with level ${level}`);
            const data = await vocabularyService.getSystemVocabulary(userId, level);
            console.log(`[VOCAB-API] getSystemVocabulary fetched ${data.length} words.`);
            res.status(200).json({ success: true, count: data.length, data });
        } catch (error) {
            console.error('Error fetching system vocabulary:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    // 2. Daily Word Recommendations (words user hasn't added yet)
    async getRecommendWords(req, res) {
        try {
            const count = parseInt(req.query.count) || 5;
            const data = await vocabularyService.getRecommendWords(req.user.id, count);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error fetching recommended words:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    // 3. User adding a single system word to their deck
    async addSystemWord(req, res) {
        try {
            const { wordId } = req.body;
            if (!wordId) return res.status(400).json({ success: false, message: 'Missing wordId' });
            const word = await vocabularyService.addSystemWordToUser(req.user.id, wordId);
            res.status(201).json({ success: true, data: word });
        } catch (error) {
            console.error('Error adding system word to user list:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 3b. Add multiple
    async addMultipleSystemWords(req, res) {
        try {
            const { wordIds } = req.body;
            if (!wordIds || !Array.isArray(wordIds)) return res.status(400).json({ success: false, message: 'Missing array wordIds' });
            const added = await vocabularyService.addMultipleSystemWords(req.user.id, wordIds);
            res.status(201).json({ success: true, count: added.length, data: added });
        } catch (error) {
            console.error('Error adding multiple system words:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 4. Get User's dictionary (mixed with collected errors)
    async getUserVocabulary(req, res) {
        try {
            console.log(`[VOCAB-API] getUserVocabulary called for user ${req.user.id}`);
            const itemType = req.query.type || 'vocabulary'; // vocabulary, pronunciation, grammar (or empty for all)
            const result = await vocabularyService.getUserVocabulary(req.user.id, itemType);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error('Error getting user dictionary:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    // 5. Spaced Repetition Logic - Get Due Reviews
    async getReviewWords(req, res) {
        try {
            const data = await vocabularyService.getWordsDueForReview(req.user.id);
            res.status(200).json({ success: true, count: data.length, data });
        } catch (error) {
            console.error('Error fetching review words:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    // 6. SRS: Mark correct/incorrect -> Calculate next review
    async updateWordMastery(req, res) {
        try {
            const wordId = req.params.id;
            const { isCorrect } = req.body;

            if (isCorrect === undefined) {
                return res.status(400).json({ success: false, message: 'Missing isCorrect boolean' });
            }

            const data = await vocabularyService.updateMastery(req.user.id, wordId, isCorrect);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error updating word mastery:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new VocabularyController();
