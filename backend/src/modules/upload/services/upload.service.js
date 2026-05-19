import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { updateChunksForKnowledge } from '#services/updateChunks.js';
import uploadRepository from '../repositories/upload.repository.js';

class UploadService {
    async processFile(file) {
        if (!file) throw new Error('No file uploaded');

        const ext = path.extname(file.originalname).toLowerCase();
        const filePath = file.path;

        try {
            let content = '';
            if (ext === '.docx') {
                const result = await mammoth.extractRawText({ path: filePath });
                content = result.value;
            } else if (ext === '.txt') {
                content = fs.readFileSync(filePath, 'utf-8');
            } else {
                throw new Error('Unsupported file format');
            }

            const title = Buffer.from(path.basename(file.originalname, ext), 'latin1').toString('utf8');

            const existing = await uploadRepository.findKnowledgeByTitle(title);
            if (existing) throw new Error('File already uploaded and trained');

            const row = await uploadRepository.insertKnowledge(title, content);
            await updateChunksForKnowledge(row.id, title, content);

            return { knowledgeId: row.id, title, sizeMB: file.size / (1024 * 1024) };
        } finally {
            fs.unlink(filePath, err => {
                if (err) console.error('Error deleting temp file:', err);
            });
        }
    }
}

export default new UploadService();
