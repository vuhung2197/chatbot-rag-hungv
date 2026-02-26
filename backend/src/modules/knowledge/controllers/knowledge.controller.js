import knowledgeService from '../services/knowledge.service.js';

// Thêm mới kiến thức
export async function addKnowledge(req, res) {
    const { title, content } = req.body;
    if (!title || !content)
        return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung!' });

    try {
        const result = await knowledgeService.addKnowledge(title, content);
        res.json(result);
    } catch (err) {
        console.error('Lỗi khi thêm kiến thức:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

// Lấy toàn bộ kiến thức
export async function getAllKnowledge(req, res) {
    try {
        const knowledgeList = await knowledgeService.getAllKnowledge();
        res.json(knowledgeList);
    } catch (err) {
        console.error('Lỗi khi lấy danh sách kiến thức:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

// Sửa kiến thức
export async function updateKnowledge(req, res) {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content)
        return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung!' });

    try {
        const result = await knowledgeService.updateKnowledge(id, title, content);
        res.json(result);
    } catch (err) {
        console.error('Lỗi khi cập nhật kiến thức:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

// Xóa kiến thức và các chunk liên quan
export async function deleteKnowledge(req, res) {
    const { id } = req.params;

    try {
        const result = await knowledgeService.deleteKnowledge(id);
        res.json(result);
    } catch (err) {
        console.error('❌ Lỗi khi xóa kiến thức:', err);
        res.status(500).json({ error: 'Lỗi trong quá trình xóa kiến thức.' });
    }
}

// Lấy kiến thức theo ID
export async function getKnowledgeById(req, res) {
    const { id } = req.params;
    try {
        const knowledge = await knowledgeService.getKnowledgeById(id);
        if (!knowledge)
            return res.status(404).json({ message: 'Không tìm thấy!' });
        res.json(knowledge);
    } catch (err) {
        console.error('Lỗi khi lấy kiến thức:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

// Lấy tất cả chunks của kiến thức theo ID
export async function getChunksByKnowledgeId(req, res) {
    const { id } = req.params;
    try {
        const chunks = await knowledgeService.getChunksByKnowledgeId(id);
        res.json(chunks);
    } catch (err) {
        console.error('Lỗi khi lấy chunk:', err);
        res.status(500).json({ error: 'Lỗi khi lấy chunk' });
    }
}
