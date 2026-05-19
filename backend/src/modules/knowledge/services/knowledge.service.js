import { updateChunksForKnowledge } from '#services/updateChunks.js';
import { getEmbedding } from '#services/embeddingVector.js';
import knowledgeRepository from '../repositories/knowledge.repository.js';

function extractKeywords(text) {
    if (!text) return [];
    text = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const words = text.replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
    const stopWords = new Set([
        'la', 'cua', 'va', 'tren', 'cho', 'mot', 'nhung', 'cac', 'duoc', 'toi',
        'ban', 'day', 'de', 'bao', 've', 'vi', 'se', 'o', 'tinh', 'tai', 'noi',
        'khi', 'nhan', 'vien', 'cong', 'ty', 'lien', 'he', 'so', 'dien', 'thoai',
        'email', 'website',
    ]);
    return Array.from(new Set(words.filter(w => w.length >= 3 && !stopWords.has(w))));
}

class KnowledgeService {
    async updateImportantKeywords(title, content) {
        const keywords = Array.from(
            new Set([...extractKeywords(title), ...extractKeywords(content)])
        ).filter(Boolean);

        await knowledgeRepository.insertKeywords(keywords);
    }

    async addKnowledge(title, content) {
        const embedding = await getEmbedding(`${title}\n${content}`);
        const row = await knowledgeRepository.insert(title, content, embedding);

        if (!row?.id) throw new Error('Failed to retrieve inserted ID');

        await this.updateImportantKeywords(title, content);
        await updateChunksForKnowledge(row.id, title, content);

        return { id: row.id, message: 'Đã thêm kiến thức và cập nhật embedding!' };
    }

    async getAllKnowledge() {
        return knowledgeRepository.getAll();
    }

    async updateKnowledge(id, title, content) {
        const embedding = await getEmbedding(`${title}\n${content}`);
        await knowledgeRepository.update(id, title, content, embedding);
        await this.updateImportantKeywords(title, content);
        await updateChunksForKnowledge(id, title, content);
        return { message: 'Đã cập nhật kiến thức!' };
    }

    async deleteKnowledge(id) {
        await knowledgeRepository.deleteById(id);
        return { message: '✅ Đã xóa kiến thức và các chunk liên quan!', id };
    }

    async getKnowledgeById(id) {
        return knowledgeRepository.findById(id);
    }

    async getChunksByKnowledgeId(id) {
        return knowledgeRepository.getChunksByKnowledgeId(id);
    }
}

export default new KnowledgeService();
