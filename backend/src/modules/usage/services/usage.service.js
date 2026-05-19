import usageRepository from '../repositories/usage.repository.js';

// ─── Helper: Parse features JSON safely ───
function parseFeatures(rawFeatures) {
    if (typeof rawFeatures === 'string') {
        try { return JSON.parse(rawFeatures); }
        catch (e) { console.error('Error parsing features JSON:', e); return {}; }
    }
    if (rawFeatures && typeof rawFeatures === 'object') return rawFeatures;
    return {};
}

// ─── Helper: Build limits object from features + tier row ───
function buildLimits(features, tierRow = {}) {
    return {
        queries_per_day: features.queries_per_day || 50,
        file_size_mb: tierRow.max_file_size_mb || 1,
        chat_history_days: tierRow.max_chat_history_days || 7,
        advanced_rag: features.advanced_rag || false,
        priority_support: features.priority_support || false,
        api_access: features.api_access || false,
        team_collaboration: features.team_collaboration || false,
    };
}

// ─── Helper: Map usage type to DB column ───
const USAGE_TYPE_MAP = {
    query: 'queries_count',
    advanced_rag: 'advanced_rag_count',
    file_upload: 'file_uploads_count',
    file_size: 'file_uploads_size_mb',
    tokens: 'tokens_used',
};

// ─── Helper: Calculate start date for stats period ───
function getStatsStartDate(period) {
    const now = new Date();
    const daysMap = { day: 7, week: 30 };
    const monthsMap = { month: 12 };

    if (daysMap[period]) {
        const d = new Date(now);
        d.setDate(d.getDate() - daysMap[period]);
        return d.toISOString().split('T')[0];
    }
    if (monthsMap[period]) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - monthsMap[period]);
        return d.toISOString().split('T')[0];
    }
    return null;
}

class UsageService {
    async getUserUsage(userId, date) {
        return usageRepository.getUserUsage(userId, date);
    }

    async getSubscriptionLimits(userId) {
        const tierRow = await usageRepository.getActiveSubscriptionWithTier(userId);

        if (tierRow) {
            const features = parseFeatures(tierRow.features);
            return buildLimits(features, tierRow);
        }

        const freeTier = await usageRepository.getFreeTier();
        if (freeTier) {
            const features = parseFeatures(freeTier.features);
            return buildLimits(features, freeTier);
        }

        return buildLimits({});
    }

    async getUsageStats(userId, period) {
        const dateFrom = getStatsStartDate(period);
        return usageRepository.getUsageStats(userId, dateFrom);
    }

    async getUsageHistory(userId, limit = 30) {
        return usageRepository.getUsageHistory(userId, parseInt(limit));
    }

    async incrementUsage(userId, type, value = 1) {
        try {
            const updateField = USAGE_TYPE_MAP[type];
            if (!updateField) return;

            const today = new Date().toISOString().split('T')[0];
            const finalValue = type === 'tokens' ? Math.round(value) : value;

            const existing = await usageRepository.getUserUsage(userId, today);

            if (existing) {
                await usageRepository.incrementUsageField(userId, today, updateField, finalValue);
            } else {
                const initialValues = {
                    queries_count: 0,
                    advanced_rag_count: 0,
                    file_uploads_count: 0,
                    file_uploads_size_mb: 0,
                    tokens_used: 0,
                };
                initialValues[updateField] = finalValue;
                await usageRepository.insertUsageRow(userId, today, initialValues);
            }
        } catch (error) {
            console.error('❌ Error incrementing usage:', error);
        }
    }

    async trackUsage(userId, type, options = {}) {
        try {
            const tokens = options.tokens || 0;
            await this.incrementUsage(userId, type, 1);
            if (tokens > 0) {
                await this.incrementUsage(userId, 'tokens', tokens);
            }
        } catch (error) {
            console.error('Error tracking usage:', error);
        }
    }

    async getWebSearchCount(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            return usageRepository.countWebSearchesToday(userId, today);
        } catch (error) {
            console.warn('⚠️ Error counting web searches:', error.message);
            return 0;
        }
    }
}

export default new UsageService();
