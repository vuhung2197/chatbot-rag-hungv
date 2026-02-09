import pool from '#db';
import { updateChunksForKnowledge } from '#services/updateChunks.js';
import { getEmbedding } from '#services/embeddingVector.js';

// Helper: Extract keywords
function extractKeywords(text) {
    if (!text) return [];
    text = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const words = text.replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
    const stopWords = new Set([
        'la', 'cua', 'va', 'tren', 'cho', 'mot', 'nhung', 'cac', 'duoc', 'toi',
        'ban', 'day', 'de', 'bao', 've', 'vi', 'se', 'o', 'tinh', 'tai', 'noi',
        'khi', 'nhan', 'vien', 'cong', 'ty', 'lien', 'he', 'so', 'dien', 'thoai',
        'email', 'website',
    ]);
    return Array.from(
        new Set(words.filter((w) => w.length >= 3 && !stopWords.has(w)))
    );
}

class KnowledgeService {
    async updateImportantKeywords(title, content) {
        const titleKeywords = extractKeywords(title);
        const contentKeywords = extractKeywords(content);
        const allKeywords = Array.from(
            new Set([...titleKeywords, ...contentKeywords])
        ).filter(Boolean);

        if (allKeywords.length === 0) return;

        // Construct dynamic values string (?, ?...)
        const placeholders = allKeywords.map(() => '(?)').join(', ');
        const params = allKeywords;

        await pool.execute(
            `INSERT INTO important_keywords (keyword) VALUES ${placeholders} ON CONFLICT (keyword) DO NOTHING`,
            params
        );
    }

    async addKnowledge(title, content) {
        const embedding = await getEmbedding(`${title}\n${content}`);

        // Handle both PostgreSQL (RETURNING id) and MySQL (result.insertId) just in case, 
        // though implementation looks like PostgreSQL
        const [rows] = await pool.execute(
            'INSERT INTO knowledge_base (title, content, embedding) VALUES (?, ?, ?) RETURNING id',
            [title, content, JSON.stringify(embedding)]
        );

        const insertedId = rows[0]?.id;
        if (!insertedId) throw new Error("Failed to retrieve inserted ID");

        await this.updateImportantKeywords(title, content);
        await updateChunksForKnowledge(insertedId, title, content); // This is an external service/helper

        return { id: insertedId, message: 'Đã thêm kiến thức và cập nhật embedding!' };
    }

    async getAllKnowledge() {
        // Query adjusted to be compatible with previous implementation
        const [rows] = await pool.execute(`
            SELECT 
                kb.*, 
                COUNT(kc.id) as chunk_count,
                COALESCE(
                    json_agg(
                        json_build_object('id', kc.id, 'token_count', kc.token_count)
                    ) FILTER (WHERE kc.id IS NOT NULL), 
                    '[]'::json
                ) as chunks_info
            FROM knowledge_base kb
            LEFT JOIN knowledge_chunks kc ON kb.id = kc.parent_id
            GROUP BY kb.id
            ORDER BY kb.id DESC
        `);

        // Process rows if needed (e.g. parse JSON string if driver returns string)
        const processedRows = rows.map(row => ({
            ...row,
            chunks_info: typeof row.chunks_info === 'string' ? JSON.parse(row.chunks_info) : row.chunks_info
        }));

        return processedRows;
    }

    async updateKnowledge(id, title, content) {
        const embedding = await getEmbedding(`${title}\n${content}`);

        await pool.execute(
            'UPDATE knowledge_base SET title=?, content=?, embedding=? WHERE id=?',
            [title, content, JSON.stringify(embedding), id]
        );

        await this.updateImportantKeywords(title, content);
        await updateChunksForKnowledge(id, title, content);

        return { message: 'Đã cập nhật kiến thức!' };
    }

    async deleteKnowledge(id) {
        await pool.execute('DELETE FROM knowledge_chunks WHERE parent_id = ?', [id]);
        await pool.execute('DELETE FROM knowledge_base WHERE id = ?', [id]);
        return { message: '✅ Đã xóa kiến thức và các chunk liên quan!', id };
    }

    async getKnowledgeById(id) {
        const [rows] = await pool.execute('SELECT * FROM knowledge_base WHERE id=?', [id]);
        return rows[0];
    }

    async getChunksByKnowledgeId(id) {
        const [rows] = await pool.execute(
            'SELECT id, content, token_count FROM knowledge_chunks WHERE parent_id = ? ORDER BY id ASC',
            [id]
        );
        return rows;
    }
}

export default new KnowledgeService();
