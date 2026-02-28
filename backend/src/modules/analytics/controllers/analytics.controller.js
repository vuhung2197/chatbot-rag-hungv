import analyticsService from '../services/analytics.service.js';

class AnalyticsController {
    /**
     * Get the user's top weaknesses.
     */
    async getTopWeaknesses(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 5;
            const days = parseInt(req.query.days) || 30;

            const weaknesses = await analyticsService.getTopWeaknesses(userId, limit, days);
            res.status(200).json({ data: weaknesses });
        } catch (error) {
            console.error('Error in getTopWeaknesses controller:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    /**
     * Log a mistake sent from the client or internal services.
     * Useful when we want the client to explicitly log a mistake.
     */
    async logMistake(req, res) {
        try {
            const userId = req.user.id;
            const { sourceModule, errorCategory, errorDetail, contextText, sessionId } = req.body;

            if (!sourceModule || !errorCategory || !errorDetail) {
                return res.status(400).json({ message: 'Missing required fields: sourceModule, errorCategory, errorDetail' });
            }

            const newLog = await analyticsService.logMistake({
                userId,
                sourceModule,
                errorCategory,
                errorDetail,
                contextText,
                sessionId
            });

            res.status(201).json({ message: 'Mistake logged successfully', data: newLog });
        } catch (error) {
            console.error('Error in logMistake controller:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    /**
     * Get recent mistakes of the user.
     */
    async getRecentMistakes(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 20;

            const mistakes = await analyticsService.getRecentMistakes(userId, limit);
            res.status(200).json({ data: mistakes });
        } catch (error) {
            console.error('Error in getRecentMistakes controller:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

export default new AnalyticsController();
