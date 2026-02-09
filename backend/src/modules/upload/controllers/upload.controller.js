import { StatusCodes } from 'http-status-codes';
import uploadService from '../services/upload.service.js';
import usageService from '../../usage/services/usage.service.js';

/**
 * Xử lý upload file kiến thức và huấn luyện tự động.
 */
export async function uploadAndTrain(req, res) {
    const file = req.file;

    try {
        const result = await uploadService.processFile(file);

        // Track usage: file upload count and size
        const userId = req.user?.id;
        if (userId) {
            try {
                const fileSizeMB = result.sizeMB;
                console.log(`📊 Tracking usage for user ${userId}: file upload (${fileSizeMB.toFixed(2)} MB)`);

                await usageService.trackUsage(userId, 'file_upload', { value: 1 });
                console.log(`✅ Tracked file_upload count for user ${userId}`);

                await usageService.trackUsage(userId, 'file_size', { value: fileSizeMB });
                console.log(`✅ Tracked file_size (${fileSizeMB.toFixed(2)} MB) for user ${userId}`);
            } catch (usageError) {
                console.error('❌ Error tracking usage (non-fatal):', usageError);
            }
        } else {
            console.warn('⚠️ No user ID found in request, skipping usage tracking');
        }

        res.json({ message: '✅ File đã được huấn luyện thành công!' });
    } catch (err) {
        console.error('❌ Lỗi khi xử lý file:', err);

        if (err.message === 'No file uploaded') {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Không có file được tải lên.' });
        }
        if (err.message === 'Unsupported file format') {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Định dạng file không hỗ trợ.' });
        }
        if (err.message === 'File already uploaded and trained') {
            return res.status(StatusCodes.CONFLICT).json({ error: '❗️ File đã được upload và huấn luyện trước đó.' });
        }

        res.status(500).json({ error: 'Lỗi trong quá trình xử lý file.' });
    }
}
