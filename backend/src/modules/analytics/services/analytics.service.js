import db from '#db';

class AnalyticsService {
  /**
   * Log a user mistake into the database.
   * @param {Object} data 
   * @param {number} data.userId
   * @param {string} data.sourceModule - e.g. 'speaking', 'writing', 'roleplay'
   * @param {string} data.errorCategory - e.g. 'pronunciation', 'grammar', 'vocabulary'
   * @param {string} data.errorDetail - e.g. 'phoneme_th', 'present_perfect'
   * @param {string} [data.contextText] - The original text containing the mistake
   * @param {number} [data.sessionId] - Associated practice session ID if any
   * @returns {Promise<Object>} The inserted log record
   */
  async logMistake(data) {
    const { userId, sourceModule, errorCategory, errorDetail, contextText = null, sessionId = null } = data;

    if (!userId || !sourceModule || !errorCategory || !errorDetail) {
      throw new Error('Missing required fields for logging a mistake');
    }

    const query = `
      INSERT INTO user_mistake_logs (
        user_id, source_module, error_category, error_detail, context_text, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [userId, sourceModule, errorCategory, errorDetail, contextText, sessionId];

    const [rows] = await db.query(query, values);
    return rows[0];
  }

  /**
   * Get the top weaknesses of a user over a specific time period.
   * @param {number} userId 
   * @param {number} limit Number of top weaknesses to return (default: 5)
   * @param {number} days Lookback period in days (default: 30)
   * @returns {Promise<Array>} List of weakness statistics
   */
  async getTopWeaknesses(userId, limit = 5, days = 30) {
    const query = `
      SELECT 
        error_category,
        error_detail,
        COUNT(*) as error_count,
        MAX(created_at) as last_occurred
      FROM user_mistake_logs
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY error_category, error_detail
      ORDER BY error_count DESC
      LIMIT $2;
    `;

    // Note: Parameter interpolation for intervals might be tricky with pg driver depending on setup,
    // so we interpolate days directly into string (safe since it's controlled number input)
    // or use parameterization for INTERVAL if driver supports it like: NOW() - ($2 || ' days')::interval
    // Let's use string concatenation carefully since 'days' is expected to be integer
    const safeDays = parseInt(days) || 30;
    const safeQuery = query.replace('${days}', safeDays);

    const [rows] = await db.query(safeQuery, [userId, limit]);
    return rows;
  }

  /**
   * Get recent mistakes (history) for a user
   * @param {number} userId 
   * @param {number} limit 
   * @returns {Promise<Array>} 
   */
  async getRecentMistakes(userId, limit = 20) {
    const query = `
      SELECT *
      FROM user_mistake_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    const [rows] = await db.query(query, [userId, limit]);
    return rows;
  }
}

export default new AnalyticsService();
