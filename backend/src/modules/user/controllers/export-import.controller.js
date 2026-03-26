import exportImportService from '../services/export-import.service.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export const uploadMiddleware = upload.single('file');

export async function exportData(req, res) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const data = await exportImportService.exportUserData(userId);
        const filename = `english-learning-data-${userId}-${Date.now()}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(data);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
}

export async function importData(req, res) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const jsonData = JSON.parse(req.file.buffer.toString('utf-8'));
        await exportImportService.importUserData(userId, jsonData);

        res.json({ message: 'Import thành công!' });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message || 'Import failed' });
    }
}
