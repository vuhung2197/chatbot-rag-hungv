import exportImportRepository from '../repositories/export-import.repository.js';

class ExportImportService {
    async exportUserData(userId) {
        const raw = await exportImportRepository.getUserExportData(userId);

        return {
            export_version: '1.0',
            exported_at: new Date().toISOString(),
            user: raw.user,
            vocabulary: raw.vocabulary,
            listening: {
                total_completed: raw.listening.length,
                average_score: this._calculateAvg(raw.listening, 'score_total'),
                submissions: raw.listening,
            },
            reading: {
                total_completed: raw.reading.length,
                average_score: this._calculateAvg(raw.reading, 'score_total'),
                submissions: raw.reading,
            },
            speaking: {
                total_completed: raw.speaking.length,
                average_score: this._calculateAvg(raw.speaking, 'score_total'),
                submissions: raw.speaking,
            },
            writing: {
                total_completed: raw.writing.length,
                average_score: this._calculateAvg(raw.writing, 'score_total'),
                submissions: raw.writing,
            },
            learning_history: raw.learningHistory,
            learning_streaks: raw.learningStreaks,
        };
    }

    _calculateAvg(rows, field) {
        if (rows.length === 0) return 0;
        const sum = rows.reduce((acc, row) => acc + (row[field] || 0), 0);
        return Math.round((sum / rows.length) * 10) / 10;
    }

    async importUserData(userId, data) {
        return exportImportRepository.importUserData(userId, data);
    }
}

export default new ExportImportService();
