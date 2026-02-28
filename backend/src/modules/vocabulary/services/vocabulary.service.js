import vocabularyRepository from '../repositories/vocabulary.repository.js';

class VocabularyService {
    async getSystemVocabulary(userId, level) {
        return vocabularyRepository.getSystemVocabulary(userId, level);
    }

    async getRecommendWords(userId, count = 5) {
        return vocabularyRepository.getRecommendWords(userId, count);
    }

    async addSystemWordToUser(userId, wordId) {
        return vocabularyRepository.addSystemWordToUser(userId, wordId);
    }

    async addMultipleSystemWords(userId, wordIds = []) {
        const added = [];
        for (const id of wordIds) {
            const word = await vocabularyRepository.addSystemWordToUser(userId, id);
            added.push(word);
        }
        return added;
    }

    async getUserVocabulary(userId, itemType = 'vocabulary') {
        const words = await vocabularyRepository.getUserVocabulary(userId, itemType);
        const stats = await vocabularyRepository.getVocabularyStats(userId);

        return {
            words,
            stats
        };
    }

    async getWordsDueForReview(userId) {
        return vocabularyRepository.getWordsDueForReview(userId);
    }

    async updateMastery(userId, wordId, isCorrect) {
        return vocabularyRepository.updateMastery(userId, wordId, isCorrect);
    }
}

export default new VocabularyService();
