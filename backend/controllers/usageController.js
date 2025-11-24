import pool from '../db.js';

/**
 * Get today's usage for current user
 */
export async function getTodayUsage(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const today = new Date().toISOString().split('T')[0];

    const [usage] = await pool.execute(
      `SELECT * FROM user_usage 
       WHERE user_id = ? AND date = ?`,
      [userId, today]
    );

    // Get user's subscription to get limits
    const [subscriptions] = await pool.execute(
      `SELECT st.features, st.max_file_size_mb
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ? AND us.status IN ('active', 'trial')
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId]
    );

    let limits = {
      queries_per_day: 50,
      file_size_mb: 1
    };

    if (subscriptions.length > 0) {
      // Handle both JSON string and object (MySQL might return object)
      let features = subscriptions[0].features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch (e) {
          console.error('Error parsing features JSON:', e);
          features = {};
        }
      } else if (!features || typeof features !== 'object') {
        features = {};
      }
      
      limits = {
        queries_per_day: features.queries_per_day || 50,
        file_size_mb: subscriptions[0].max_file_size_mb || 1
      };
    } else {
      // Default to free tier
      const [freeTier] = await pool.execute(
        'SELECT features, max_file_size_mb FROM subscription_tiers WHERE name = ?',
        ['free']
      );
      if (freeTier.length > 0) {
        // Handle both JSON string and object
        let features = freeTier[0].features;
        if (typeof features === 'string') {
          try {
            features = JSON.parse(features);
          } catch (e) {
            console.error('Error parsing features JSON:', e);
            features = {};
          }
        } else if (!features || typeof features !== 'object') {
          features = {};
        }
        
        limits = {
          queries_per_day: features.queries_per_day || 50,
          file_size_mb: freeTier[0].max_file_size_mb || 1
        };
      }
    }

    const todayUsage = usage.length > 0 ? usage[0] : {
      queries_count: 0,
      advanced_rag_count: 0,
      file_uploads_count: 0,
      file_uploads_size_mb: 0,
      tokens_used: 0
    };

    res.json({
      usage: todayUsage,
      limits,
      percentage: {
        queries: limits.queries_per_day === -1 ? 0 : 
          Math.min(100, (todayUsage.queries_count / limits.queries_per_day) * 100),
        file_size: limits.file_size_mb === -1 ? 0 :
          Math.min(100, (todayUsage.file_uploads_size_mb / limits.file_size_mb) * 100)
      }
    });
  } catch (error) {
    console.error('Error getting today usage:', error);
    res.status(500).json({ message: 'Error getting usage' });
  }
}

/**
 * Get usage statistics (daily/weekly/monthly)
 */
export async function getUsageStats(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { period = 'week' } = req.query; // 'day', 'week', 'month'

    let dateFilter = '';
    const now = new Date();
    
    if (period === 'day') {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      dateFilter = `AND date >= '${startDate.toISOString().split('T')[0]}'`;
    } else if (period === 'week') {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      dateFilter = `AND date >= '${startDate.toISOString().split('T')[0]}'`;
    } else if (period === 'month') {
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
      dateFilter = `AND date >= '${startDate.toISOString().split('T')[0]}'`;
    }

    const [stats] = await pool.execute(
      `SELECT 
        date,
        SUM(queries_count) as total_queries,
        SUM(advanced_rag_count) as total_advanced_rag,
        SUM(file_uploads_count) as total_file_uploads,
        SUM(file_uploads_size_mb) as total_file_size,
        SUM(tokens_used) as total_tokens
       FROM user_usage
       WHERE user_id = ? ${dateFilter}
       GROUP BY date
       ORDER BY date ASC`,
      [userId]
    );

    res.json({ stats, period });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ message: 'Error getting usage statistics' });
  }
}

/**
 * Get usage limits for current user
 */
export async function getUsageLimits(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get user's subscription
    const [subscriptions] = await pool.execute(
      `SELECT st.features, st.max_file_size_mb, st.max_chat_history_days
       FROM user_subscriptions us
       JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = ? AND us.status IN ('active', 'trial')
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId]
    );

    let limits = {
      queries_per_day: 50,
      file_size_mb: 1,
      chat_history_days: 7,
      advanced_rag: false,
      priority_support: false,
      api_access: false,
      team_collaboration: false
    };

    if (subscriptions.length > 0) {
      // Handle both JSON string and object (MySQL might return object)
      let features = subscriptions[0].features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch (e) {
          console.error('Error parsing features JSON:', e);
          features = {};
        }
      } else if (!features || typeof features !== 'object') {
        features = {};
      }
      
      limits = {
        queries_per_day: features.queries_per_day || 50,
        file_size_mb: subscriptions[0].max_file_size_mb || 1,
        chat_history_days: subscriptions[0].max_chat_history_days || 7,
        advanced_rag: features.advanced_rag || false,
        priority_support: features.priority_support || false,
        api_access: features.api_access || false,
        team_collaboration: features.team_collaboration || false
      };
    } else {
      // Default to free tier
      const [freeTier] = await pool.execute(
        'SELECT features, max_file_size_mb, max_chat_history_days FROM subscription_tiers WHERE name = ?',
        ['free']
      );
      if (freeTier.length > 0) {
        // Handle both JSON string and object
        let features = freeTier[0].features;
        if (typeof features === 'string') {
          try {
            features = JSON.parse(features);
          } catch (e) {
            console.error('Error parsing features JSON:', e);
            features = {};
          }
        } else if (!features || typeof features !== 'object') {
          features = {};
        }
        
        limits = {
          queries_per_day: features.queries_per_day || 50,
          file_size_mb: freeTier[0].max_file_size_mb || 1,
          chat_history_days: freeTier[0].max_chat_history_days || 7,
          advanced_rag: features.advanced_rag || false,
          priority_support: features.priority_support || false,
          api_access: features.api_access || false,
          team_collaboration: features.team_collaboration || false
        };
      }
    }

    res.json({ limits });
  } catch (error) {
    console.error('Error getting usage limits:', error);
    res.status(500).json({ message: 'Error getting usage limits' });
  }
}

/**
 * Get usage history
 */
export async function getUsageHistory(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { limit = 30 } = req.query;

    const [history] = await pool.execute(
      `SELECT * FROM user_usage
       WHERE user_id = ?
       ORDER BY date DESC
       LIMIT ?`,
      [userId, parseInt(limit)]
    );

    res.json({ history });
  } catch (error) {
    console.error('Error getting usage history:', error);
    res.status(500).json({ message: 'Error getting usage history' });
  }
}

/**
 * Track usage with optional tokens (called from chat controllers)
 * @param {number} userId - User ID
 * @param {string} type - Type: 'query' or 'advanced_rag'
 * @param {object} options - Options object with tokens, etc.
 */
export async function trackUsage(userId, type, options = {}) {
  try {
    const tokens = options.tokens || 0;
    
    // Track query/advanced_rag count
    await incrementUsage(userId, type, 1);
    
    // Track tokens if provided
    if (tokens > 0) {
      await incrementUsage(userId, 'tokens', tokens);
    }
  } catch (error) {
    console.error('Error tracking usage:', error);
    // Don't throw error, just log it
  }
}

/**
 * Helper function to increment usage (called from other controllers)
 */
export async function incrementUsage(userId, type, value = 1) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create today's usage record
    const [existing] = await pool.execute(
      'SELECT * FROM user_usage WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    if (existing.length > 0) {
      // Update existing record
      const updateField = type === 'query' ? 'queries_count' :
                         type === 'advanced_rag' ? 'advanced_rag_count' :
                         type === 'file_upload' ? 'file_uploads_count' :
                         type === 'file_size' ? 'file_uploads_size_mb' :
                         type === 'tokens' ? 'tokens_used' : null;

      if (updateField) {
        await pool.execute(
          `UPDATE user_usage 
           SET ${updateField} = ${updateField} + ? 
           WHERE user_id = ? AND date = ?`,
          [value, userId, today]
        );
      }
    } else {
      // Create new record
      const initialValues = {
        queries_count: type === 'query' ? value : 0,
        advanced_rag_count: type === 'advanced_rag' ? value : 0,
        file_uploads_count: type === 'file_upload' ? value : 0,
        file_uploads_size_mb: type === 'file_size' ? value : 0,
        tokens_used: type === 'tokens' ? value : 0
      };

      await pool.execute(
        `INSERT INTO user_usage 
         (user_id, date, queries_count, advanced_rag_count, file_uploads_count, file_uploads_size_mb, tokens_used)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, today, initialValues.queries_count, initialValues.advanced_rag_count, 
         initialValues.file_uploads_count, initialValues.file_uploads_size_mb, initialValues.tokens_used]
      );
    }
  } catch (error) {
    console.error('❌ Error incrementing usage:', error);
    console.error('   User ID:', userId);
    console.error('   Type:', type);
    console.error('   Value:', value);
    console.error('   Today:', new Date().toISOString().split('T')[0]);
    // Don't throw error, just log it
  }
}
