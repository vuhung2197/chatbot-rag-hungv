import analyticsRepository from '../repositories/analytics.repository.js';

class AnalyticsService {
    async logMistake(data) {
        const { userId, sourceModule, errorCategory, errorDetail, contextText = null, sessionId = null } = data;

        if (!userId || !sourceModule || !errorCategory || !errorDetail) {
            throw new Error('Missing required fields for logging a mistake');
        }

        return analyticsRepository.insertMistakeLog({
            userId, sourceModule, errorCategory, errorDetail, contextText, sessionId,
        });
    }

    async getTopWeaknesses(userId, limit = 5, days = 30) {
        const safeDays = parseInt(days) || 30;
        return analyticsRepository.getTopWeaknesses(userId, limit, safeDays);
    }

    async getRecentMistakes(userId, limit = 20) {
        return analyticsRepository.getRecentMistakes(userId, limit);
    }
}

export default new AnalyticsService();
