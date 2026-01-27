const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_DATABASE || 'chatbot',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

async function checkPaymentLimits() {
    const client = await pool.connect();

    try {
        const result = await client.query(`
      SELECT 
          name,
          display_name,
          min_amount,
          max_amount,
          supported_currencies,
          is_active
      FROM payment_methods
      ORDER BY name
    `);

        console.log('\n========================================');
        console.log('📋 Payment Method Limits (Updated)');
        console.log('========================================\n');

        result.rows.forEach(row => {
            console.log(`${row.display_name}:`);
            console.log(`  Min: ${row.min_amount}`);
            console.log(`  Max: ${row.max_amount}`);
            console.log(`  Currencies: ${row.supported_currencies}`);
            console.log(`  Active: ${row.is_active ? '✅' : '❌'}`);
            console.log('');
        });

        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkPaymentLimits();
