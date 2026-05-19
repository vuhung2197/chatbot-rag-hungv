import unansweredRepository from '../repositories/unanswered.repository.js';

class UnansweredService {
    async getUnansweredQuestions() {
        return unansweredRepository.getAll();
    }

    async deleteUnanswered(id) {
        await unansweredRepository.deleteById(id);
        return { message: 'Đã xóa câu hỏi khỏi danh sách chưa trả lời.' };
    }
}

export default new UnansweredService();
