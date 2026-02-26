import readingService from '../services/reading.service.js';

export const readingController = {

    // GET /reading/passages
    async getPassages(req, res) {
        try {
            const { level, topic, page = 1, limit = 10 } = req.query;
            const data = await readingService.getPassages({
                level, topic,
                page: parseInt(page),
                limit: parseInt(limit)
            });
            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('Error getting reading passages:', error);
            res.status(500).json({ success: false, error: 'Cannot fetch passages' });
        }
    },

    // GET /reading/passages/:id
    async getPassage(req, res) {
        try {
            const passage = await readingService.getPassageById(req.params.id);
            res.status(200).json({ success: true, passage });
        } catch (error) {
            console.error('Error getting passage:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    },

    // POST /reading/generate
    async generatePassage(req, res) {
        try {
            const { level, topic } = req.body;
            if (!level || !topic) {
                return res.status(400).json({ success: false, error: 'Level and topic are required' });
            }
            const passage = await readingService.generatePassage(level, topic);
            res.status(200).json({ success: true, passage });
        } catch (error) {
            console.error('Error generating passage:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // POST /reading/lookup
    async lookupWord(req, res) {
        try {
            const { word, sentence, level } = req.body;
            if (!word) {
                return res.status(400).json({ success: false, error: 'Word is required' });
            }
            const result = await readingService.lookupWord(word, sentence || '', level || 'B1');
            res.status(200).json({ success: true, result });
        } catch (error) {
            console.error('Error looking up word:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // POST /reading/submit-quiz
    async submitQuiz(req, res) {
        try {
            const userId = req.user.id;
            const { passageId, answers, wordsLookedUp, readingTimeSeconds } = req.body;
            const submission = await readingService.submitQuiz(userId, {
                passageId, answers, wordsLookedUp, readingTimeSeconds
            });
            res.status(200).json({ success: true, submission });
        } catch (error) {
            console.error('Submit quiz error:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }
};

export default readingController;
