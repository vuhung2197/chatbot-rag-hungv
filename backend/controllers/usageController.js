import pool from '../db.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

/**
 * Track usage for a user
 * Called after each query/action
 */
export async function trackUsage(userId, usageType = 'query', metadata = {}) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create today's usage record
    const [rows] = await pool.execute(
      `SELECT * FROM user_usage WHERE user_id = ? AND date = ?`,
      [userId, today]
    );

    if (rows.length === 0) {
      // Create new record
      await pool.execute(
        `INSERT INTO user_usage (user_id, date, queries_count, advanced_rag_count, tokens_used) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          today,
          usageType === 'query' ? 1 : 0,
          usageType === 'advanced_rag' ? 1 : 0,
          metadata.tokens || 0
        ]
      );
    } else {
      // Update existing record
      const updateFields = [];
      const updateValues = [];

      if (usageType === 'query') {
        updateFields.push('queries_count = queries_count + 1');
      } else if (usageType === 'advanced_rag') {
        updateFields.push('advanced_rag_count = advanced_rag_count + 1');
      }

      if (metadata.tokens) {
        updateFields.push('tokens_used = tokens_used + ?');
        updateValues.push(metadata.tokens);
      }

      if (updateFields.length > 0) {
        updateValues.push(userId, today);
        await pool.execute(
          `UPDATE user_usage SET ${updateFields.join(', ')}, updated_at = NOW() 
           WHERE user_id = ? AND date = ?`,
          updateValues
        );
      }
    }
  } catch (error) {
    console.error('❌ Error tracking usage:', error);
    // Don't throw - usage tracking shouldn't break the main flow
  }
}

/**
 * Get today's usage for a user
 */
export async function getTodayUsage(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const today = new Date().toISOString().split('T')[0];
    const [rows] = await pool.execute(
      `SELECT * FROM user_usage WHERE user_id = ? AND date = ?`,
      [userId, today]
    );

    const usage = rows[0] || {
      queries_count: 0,
      advanced_rag_count: 0,
      file_uploads_count: 0,
      tokens_used: 0
    };

    // Default limits (can be moved to subscription tiers later)
    const limits = {
      queries_per_day: 50,
      advanced_rag_per_day: 20,
      file_uploads_per_day: 5
    };

    res.json({
      usage: {
        queries: usage.queries_count || 0,
        advanced_rag: usage.advanced_rag_count || 0,
        file_uploads: usage.file_uploads_count || 0,
        tokens: usage.tokens_used || 0
      },
      limits,
      percentage: {
        queries: Math.min(100, ((usage.queries_count || 0) / limits.queries_per_day) * 100),
        advanced_rag: Math.min(100, ((usage.advanced_rag_count || 0) / limits.advanced_rag_per_day) * 100)
      }
    });
  } catch (error) {
    console.error('❌ Error getting usage:', error);
    res.status(500).json({ message: 'Error getting usage' });
  }
}

/**
 * Get usage statistics (last 7 days)
 */
export async function getUsageStats(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows] = await pool.execute(
      `SELECT date, queries_count, advanced_rag_count, tokens_used 
       FROM user_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY date DESC`,
      [userId]
    );

    res.json({ stats: rows });
  } catch (error) {
    console.error('❌ Error getting usage stats:', error);
    res.status(500).json({ message: 'Error getting usage stats' });
  }
}

export default {
  trackUsage,
  getTodayUsage,
  getUsageStats
};

