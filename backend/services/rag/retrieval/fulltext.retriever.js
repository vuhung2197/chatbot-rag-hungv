import pool from '#db';
import { RAG_CONFIG } from '../config.js';

export async function retrieveChunksByFullText(query, limit = RAG_CONFIG.fullText.defaultLimit) {
    try {
        const cleanQuery = query.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).join(' | ');
        if (!cleanQuery) return [];

        const [rows] = await pool.execute(`
            SELECT id, title, content, embedding::text as embedding,
                   ts_rank(to_tsvector('english', title || ' ' || content), to_tsquery('english', $1)) as text_score
            FROM knowledge_chunks
            WHERE to_tsvector('english', title || ' ' || content) @@ to_tsquery('english', $1)
            ORDER BY text_score DESC
            LIMIT $2
        `, [cleanQuery, limit]);

        return rows.map(r => ({
            ...r,
            embedding: typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding,
            score: 0,
            retrieval_stage: 'full_text_search',
            source_type: 'text'
        }));
    } catch (error) {
        console.warn('⚠️ Full-Text Search failed:', error.message);
        return [];
    }
}
