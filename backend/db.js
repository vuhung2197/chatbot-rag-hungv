import pkg from 'pg';
const { Pool } = pkg;
import './bootstrap/env.js';

// ============================================
// PostgreSQL Connection Pool
// ============================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_DATABASE || 'chatbot',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================
// MySQL Compatibility Wrapper
// Wraps PostgreSQL pool to work with existing MySQL code
// ============================================

// Convert MySQL placeholders (?) to PostgreSQL ($1, $2, etc.)
function convertPlaceholders(sql, params) {
  if (!params || params.length === 0) return { sql, params };

  // pg driver doesn't support undefined, convert those to null automatically
  const sanitizedParams = params.map(p => p === undefined ? null : p);

  let index = 1;
  const newSql = sql.replace(/\?/g, () => `$${index++}`);
  return { sql: newSql, params: sanitizedParams };
}

// Wrap pool.query to mimic mysql2's pool.execute behavior
const originalQuery = pool.query.bind(pool);

pool.execute = async function (sql, params) {
  const { sql: newSql, params: newParams } = convertPlaceholders(sql, params);

  try {
    const result = await originalQuery(newSql, newParams);

    // For DML commands (INSERT, UPDATE, DELETE)
    if (['INSERT', 'UPDATE', 'DELETE'].includes(result.command)) {
      // If the query used RETURNING, rows will NOT be empty.
      // In this case, we return the rows directly to support rows[0].id style.
      if (result.rows && result.rows.length > 0) {
        const rows = result.rows;
        // Attach metadata to the rows array for compatibility
        rows.affectedRows = result.rowCount;
        rows.insertId = rows[0]?.id || null;
        return [rows, result.fields];
      }

      // Standard DML without RETURNING - return mysql2 style single object
      const dmlResult = {
        affectedRows: result.rowCount,
        insertId: null,
        rows: [],
        fields: result.fields
      };
      return [dmlResult, result.fields];
    }

    // For SELECT and others, return [rows, fields]
    return [result.rows, result.fields];
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', newSql);
    console.error('Params:', newParams);
    throw error;
  }
};

// Override query to also support MySQL format
pool.query = pool.execute;

// ============================================
// Connection Management
// ============================================

pool.getConnection = async function () {
  const client = await pool.connect();

  // Wrap client to match MySQL interface
  const wrappedClient = {
    ...client,

    async execute (sql, params) {
      const { sql: newSql, params: newParams } = convertPlaceholders(sql, params);
      try {
        const result = await client.query(newSql, newParams);
        if (['INSERT', 'UPDATE', 'DELETE'].includes(result.command)) {
          if (result.rows && result.rows.length > 0) {
            const rows = result.rows;
            rows.affectedRows = result.rowCount;
            rows.insertId = rows[0]?.id || null;
            return [rows, result.fields];
          }
          return [{
            affectedRows: result.rowCount,
            insertId: null,
            rows: [],
            fields: result.fields
          }, result.fields];
        }
        return [result.rows, result.fields];
      } catch (error) {
        console.error('Client query error:', error);
        throw error;
      }
    },

    async query (sql, params) {
      return this.execute(sql, params);
    },

    async beginTransaction () {
      await client.query('BEGIN');
    },

    async commit () {
      await client.query('COMMIT');
    },

    async rollback () {
      await client.query('ROLLBACK');
    },

    release () {
      client.release();
    }
  };

  return wrappedClient;
};

// ============================================
// Error Handling
// ============================================

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGINT', async () => {
  console.log('Closing PostgreSQL pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing PostgreSQL pool...');
  await pool.end();
  process.exit(0);
});

// ============================================
// Export
// ============================================

console.log('PostgreSQL pool created successfully');
console.log(`Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);

export default pool;
