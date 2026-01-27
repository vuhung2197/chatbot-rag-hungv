const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_DATABASE || 'chatbot',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

async function updatePaymentLimits() {
    const client = await pool.connect();

    try {
        console.log('============================================');
        console.log('Updating Payment Method Limits...');
        console.log('============================================\n');

        // Update VNPay
        await client.query(`
      UPDATE payment_methods 
      SET min_amount = 10000.00,
          max_amount = 50000000.00,
          updated_at = NOW()
      WHERE name = 'vnpay'
    `);
        console.log('✅ Updated VNPay: 10,000 - 50,000,000 VND');

        // Update MoMo
        await client.query(`
      UPDATE payment_methods 
      SET min_amount = 10000.00,
          max_amount = 50000000.00,
          updated_at = NOW()
      WHERE name = 'momo'
    `);
        console.log('✅ Updated MoMo: 10,000 - 50,000,000 VND');

        // Update Stripe
        await client.query(`
      UPDATE payment_methods 
      SET min_amount = 0.50,
          max_amount = 999999.00,
          updated_at = NOW()
      WHERE name = 'stripe'
    `);
        console.log('✅ Updated Stripe: $0.50 - $999,999');

        // Update PayPal
        await client.query(`
      UPDATE payment_methods 
      SET min_amount = 0.50,
          max_amount = 10000.00,
          updated_at = NOW()
      WHERE name = 'paypal'
    `);
        console.log('✅ Updated PayPal: $0.50 - $10,000');

        console.log('\n============================================');
        console.log('Verification: Current Payment Method Limits');
        console.log('============================================\n');

        // Verify changes
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

        console.table(result.rows);

        console.log('\n✅ Done! Payment limits updated successfully.\n');

    } catch (error) {
        console.error('❌ Error updating payment limits:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the update
updatePaymentLimits()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
