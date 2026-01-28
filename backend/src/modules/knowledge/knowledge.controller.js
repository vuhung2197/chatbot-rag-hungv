import '../../../bootstrap/env.js';
import path from 'path';
import pool from '../../../db.js';
import axios from 'axios';
import { updateChunksForKnowledge } from '../../../services/updateChunks.js';
import { getEmbedding } from '../../../services/embeddingVector.js';

// Hàm extract keywords
function extractKeywords(text) {
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

async function updateImportantKeywords(title, content) {
    const titleKeywords = extractKeywords(title);
    const contentKeywords = extractKeywords(content);
    const allKeywords = Array.from(
        new Set([...titleKeywords, ...contentKeywords])
    ).filter(Boolean);

    if (allKeywords.length === 0) return;

    const values = allKeywords.map(() => '(?)').join(', ');
    const params = allKeywords;

    await pool.execute(
        `INSERT INTO important_keywords (keyword) VALUES ${values} ON CONFLICT (keyword) DO NOTHING`,
        params
    );
}

// Thêm mới kiến thức
export async function addKnowledge(req, res) {
    const { title, content } = req.body;
    if (!title || !content)
        return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung!' });

    const embedding = await getEmbedding(`${title}\n${content}`);

    const [rows] = await pool.execute(
        'INSERT INTO knowledge_base (title, content, embedding) VALUES (?, ?, ?) RETURNING id',
        [title, content, JSON.stringify(embedding)]
    );
    const insertedId = rows[0].id;

    await updateImportantKeywords(title, content);

    await updateChunksForKnowledge(insertedId, title, content);
    res.json({ message: 'Đã thêm kiến thức và cập nhật embedding!' });
}

// Lấy toàn bộ kiến thức
export async function getAllKnowledge(req, res) {
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

    // In PostgreSQL with pg node driver, json_agg returns object directly
    const processedRows = rows.map(row => ({
        ...row,
        chunks_info: typeof row.chunks_info === 'string' ? JSON.parse(row.chunks_info) : row.chunks_info
    }));

    res.json(processedRows);
}

// Sửa kiến thức
export async function updateKnowledge(req, res) {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content)
        return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung!' });

    const embedding = await getEmbedding(`${title}\n${content}`);

    await pool.execute(
        'UPDATE knowledge_base SET title=?, content=?, embedding=? WHERE id=?',
        [title, content, JSON.stringify(embedding), id]
    );

    await updateImportantKeywords(title, content);

    await updateChunksForKnowledge(id, title, content);
    res.json({ message: 'Đã cập nhật kiến thức!' });
}

// Xóa kiến thức và các chunk liên quan
export async function deleteKnowledge(req, res) {
    const { id } = req.params;

    try {
        await pool.execute('DELETE FROM knowledge_chunks WHERE parent_id = ?', [
            id,
        ]);

        await pool.execute('DELETE FROM knowledge_base WHERE id = ?', [id]);

        res.json({ message: '✅ Đã xóa kiến thức và các chunk liên quan!', id });
    } catch (err) {
        console.error('❌ Lỗi khi xóa kiến thức:', err);
        res.status(500).json({ error: 'Lỗi trong quá trình xóa kiến thức.' });
    }
}

// Lấy kiến thức theo ID
export async function getKnowledgeById(req, res) {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM knowledge_base WHERE id=?', [
        id,
    ]);
    if (rows.length === 0)
        return res.status(404).json({ message: 'Không tìm thấy!' });
    res.json(rows[0]);
}

// Lấy tất cả chunks của kiến thức theo ID
export async function getChunksByKnowledgeId(req, res) {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT id, content, token_count FROM knowledge_chunks WHERE parent_id = ? ORDER BY id ASC',
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Lỗi khi lấy chunk:', err);
        res.status(500).json({ error: 'Lỗi khi lấy chunk' });
    }
}
