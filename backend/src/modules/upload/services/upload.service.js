import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import pool from '../../../../db.js';
import { updateChunksForKnowledge } from '../../../../services/updateChunks.js';

class UploadService {
    async processFile(file) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        const ext = path.extname(file.originalname).toLowerCase();
        let content = '';
        let filePath = file.path;

        try {
            if (ext === '.docx') {
                const result = await mammoth.extractRawText({ path: filePath });
                content = result.value;
            } else if (ext === '.txt') {
                content = fs.readFileSync(filePath, 'utf-8');
            } else {
                throw new Error('Unsupported file format');
            }

            // Chuyển đổi tiêu đề có dấu tiếng Việt
            const rawName = Buffer.from(
                path.basename(file.originalname, ext),
                'latin1'
            ).toString('utf8');
            const title = rawName;

            // 🔍 Kiểm tra xem title đã tồn tại chưa
            const [rows] = await pool.execute(
                'SELECT id FROM knowledge_base WHERE title = ? LIMIT 1',
                [title]
            );
            if (rows.length > 0) {
                throw new Error('File already uploaded and trained');
            }

            // ✅ Lưu vào DB nếu chưa tồn tại
            const [insertRows] = await pool.execute(
                'INSERT INTO knowledge_base (title, content) VALUES (?, ?) RETURNING id',
                [title, content]
            );

            const knowledgeId = insertRows[0].id;

            // This is an external service/helper
            await updateChunksForKnowledge(knowledgeId, title, content);

            // Calculate file size in MB
            const fileSizeMB = file.size / (1024 * 1024);

            return {
                knowledgeId,
                title,
                sizeMB: fileSizeMB
            };

        } finally {
            // Clean up the uploaded file
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });
        }
    }
}

export default new UploadService();
