
require('dotenv').config({ path: '../../.env' });
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const format = require('pg-format');

// Configuration checks
const MYSQL_CONFIG = {
    host: 'localhost', // Assuming running from host machine accessing docker mapped ports
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '123456',
    database: process.env.MYSQL_DATABASE || 'chatbot',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    // Add these specifically for legacy wrapper issues if needed, mostly not for basic connection
};

const PG_CONFIG = {
    host: 'localhost',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres123',
    database: process.env.POSTGRES_DB || 'chatbot',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
};

async function checkConnections() {
    console.log('🔌 Checking connections...');

    // MySQL Check
    try {
        const mConn = await mysql.createConnection(MYSQL_CONFIG);
        console.log('✅ MySQL Connected');
        await mConn.end();
    } catch (err) {
        console.error('❌ MySQL Connection Failed:', err.message);
        console.log('   Please make sure Docker container for MySQL is running and ports are mapped.');
        process.exit(1);
    }

    // Postgres Check
    const pgPool = new Pool(PG_CONFIG);
    try {
        const client = await pgPool.connect();
        console.log('✅ PostgreSQL Connected');
        client.release();
    } catch (err) {
        console.error('❌ PostgreSQL Connection Failed:', err.message);
        process.exit(1);
    }
    await pgPool.end();
}

async function migrateTable(mysqlConn, pgPool, tableName, transformer = (x) => x, pgTableName = null) {
    const targetTable = pgTableName || tableName;
    console.log(`\n📦 Migrating table: ${tableName} -> ${targetTable}`);

    try {
        // 1. Get data from MySQL
        const [rows] = await mysqlConn.execute(`SELECT * FROM ${tableName}`);
        if (rows.length === 0) {
            console.log('   ⚠️ Source table is empty. Skipping.');
            return;
        }
        console.log(`   Found ${rows.length} rows in MySQL.`);

        // 2. Prepare data for Postgres
        // We assume column names match unless transformed
        // We simply get keys from the first row after transformation

        let successCount = 0;
        let errorCount = 0;

        const client = await pgPool.connect();

        try {
            await client.query('BEGIN');

            // Disable triggers temporarily if needed? 
            // In PG, usually we KEEP triggers for updated_at, but we might want to preserve original timestamps
            // A better way is to insert explicitly including timestamps.

            // Allow explicit ID insertion if it's an auto-increment/serial column
            // Unlike SQL Server, PG uses sequences. We can insert IDs explicitly, but we must update sequence later.

            for (const row of rows) {
                const transformedRow = transformer({ ...row }); // copy

                const keys = Object.keys(transformedRow);
                const values = Object.values(transformedRow);

                // Construct INSERT query
                // Using pg-format to safely format keys and values
                const sql = format('INSERT INTO %I (%I) VALUES (%L) ON CONFLICT DO NOTHING', targetTable, keys, values);

                try {
                    await client.query(sql);
                    successCount++;
                } catch (e) {
                    // Ignore duplicate key errors if we run script multiple times?
                    // ON CONFLICT DO NOTHING handles duplicates gracefully usually
                    console.error(`   ❌ Error inserting row ID ${row.id}:`, e.message);
                    errorCount++;
                }
            }

            // Adjust Sequence for Serial ID columns
            // Assuming table has 'id' column
            try {
                // Determine sequence name. Default is usually table_id_seq
                const seqResult = await client.query(`SELECT pg_get_serial_sequence('${targetTable}', 'id')`);
                const seqName = seqResult.rows[0].pg_get_serial_sequence;
                if (seqName) {
                    await client.query(`SELECT setval('${seqName}', (SELECT MAX(id) FROM ${targetTable}))`);
                    console.log(`   🔄 Sequence ${seqName} updated.`);
                }
            } catch (seqIdsErr) {
                // Maybe no id column or not serial, ignore
            }

            await client.query('COMMIT');
            console.log(`   ✅ Imported ${successCount} rows. (Errors: ${errorCount})`);

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('   ❌ Transaction failed:', err.message);
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error(`   ❌ Failed to migrate ${tableName}:`, err.message);
    }
}

// ==========================================
// Transformers
// ==========================================

const boolTransform = (val) => val === 1 || val === true;

// Users Table
const transformUser = (row) => {
    // MySQL: email_verified TINYINT(1) -> PG: BOOLEAN
    row.email_verified = boolTransform(row.email_verified);
    // Remove if there are any columns in MySQL not in PG or rename
    return row;
};

// Subscriptions
const transformSub = (row) => {
    // Handle dates if they are invalid?
    return row;
};

// Wallet 
const transformWallet = (row) => {
    // Decimal types are handled as strings by drivers usually to preserve precision
    // PG driver handles string -> decimal insert fine
    return row;
};

// Transactions
const transformTx = (row) => {
    // JSON fields in MySQL are strings (if using mysql2 default) or objects
    // PG expects object for JSONB or string
    // mysql2 usually returns JSON columns as Objects if type cast is on
    if (typeof row.metadata === 'string') {
        try {
            row.metadata = JSON.parse(row.metadata);
        } catch {
            row.metadata = {};
        }
    }
    return row;
};

// Bank Accounts and Withdrawal Requests are NEW, so they won't have data in MySQL 
// unless we are migrating from a WIP version. Assuming they are empty/new in PG.

// ==========================================
// Main Migration Flow
// ==========================================

async function main() {
    console.log('🚀 Starting Data Migration: MySQL -> PostgreSQL');

    await checkConnections();

    const mConn = await mysql.createConnection(MYSQL_CONFIG);
    const pgPool = new Pool(PG_CONFIG);

    try {
        // Order matters due to Foreign Keys!

        // 1. Users (Base)
        await migrateTable(mConn, pgPool, 'users', transformUser);

        // 2. Core configs
        await migrateTable(mConn, pgPool, 'subscription_tiers'); // Lookup table

        // 3. User related
        await migrateTable(mConn, pgPool, 'user_sessions');
        await migrateTable(mConn, pgPool, 'user_oauth_providers');

        // 4. Subscriptions
        await migrateTable(mConn, pgPool, 'user_subscriptions', transformSub);

        // 5. Wallets
        await migrateTable(mConn, pgPool, 'user_wallets', transformWallet);

        // 6. Transactions
        await migrateTable(mConn, pgPool, 'payment_methods'); // ensure updated methods map
        await migrateTable(mConn, pgPool, 'wallet_transactions', transformTx);

        // 7. Knowledge Base (if needed)
        await migrateTable(mConn, pgPool, 'knowledge_base');
        // knowledge_chunks might be huge, consider batching if fails

        // 8. Feedbacks / Others
        await migrateTable(mConn, pgPool, 'feedbacks');

        console.log('\n✨ Migration Logic Finished.');

    } catch (err) {
        console.error('\n💥 Critical Migration Error:', err);
    } finally {
        await mConn.end();
        await pgPool.end();
        console.log('👋 Connections closed.');
    }
}

main();
