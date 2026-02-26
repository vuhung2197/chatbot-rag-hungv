import listeningService from '../services/listening.service.js';

export const listeningController = {
    // ==================== LISTENING EXERCISES ==================== //

    /**
     * Get exercises with pagination & filters
     * GET /api/listening/exercises
     */
    async getExercises(req, res) {
        try {
            const { level, type, page = 1, limit = 10 } = req.query;
            const data = await listeningService.getExercises({
                level, type,
                page: parseInt(page),
                limit: parseInt(limit)
            });
            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('Error getting listening exercises:', error);
            res.status(500).json({ success: false, error: 'Cannot fetch exercises' });
        }
    },

    /**
     * Get single exercise
     * GET /api/listening/exercises/:id
     */
    async getExercise(req, res) {
        try {
            const { id } = req.params;
            const exercise = await listeningService.getExerciseById(id);
            res.status(200).json({ success: true, exercise });
        } catch (error) {
            console.error('Error getting listening exercise:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ success: false, error: error.message });
            }
            res.status(500).json({ success: false, error: 'Cannot fetch exercise' });
        }
    },

    /**
     * Stream or generate audio for dictation text
     * GET /api/listening/audio/:id
     */
    async getAudioStream(req, res) {
        try {
            const { id } = req.params;
            const exercise = await listeningService.getExerciseById(id);
            if (!exercise || !exercise.audio_text) {
                return res.status(404).json({ success: false, error: 'Audio text not found' });
            }

            const buffer = await listeningService.generateAudioStream(exercise.audio_text);

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        } catch (error) {
            console.error('Error generating audio stream:', error);
            res.status(500).json({ success: false, error: 'Cannot generate audio stream' });
        }
    },

    // ==================== SUBMISSIONS ==================== //

    /**
     * Submit user dictation text
     * POST /api/listening/submit-dictation
     */
    async submitDictation(req, res) {
        try {
            const userId = req.user.id;
            const { exerciseId, content } = req.body;

            const submissionData = await listeningService.submitDictation(userId, { exerciseId, content });

            res.status(200).json({ success: true, submission: submissionData });
        } catch (error) {
            console.error('Submit listening error:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }
};

export default listeningController;
