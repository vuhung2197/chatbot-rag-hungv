
import pool from './backend/db.js';

async function migrateWalletEnum() {
    console.log("🛠️ Adding values to transaction_type ENUM (PostgreSQL)...");
    const connection = await pool.getConnection();

    try {
        // Postgres: ALTER TYPE enum_name ADD VALUE 'new_value';
        // We assume the ENUM type name is 'transaction_type' based on previous error "enum transaction_type"

        const newValues = ['bet_baucua', 'win_baucua'];

        for (const val of newValues) {
            try {
                console.log(`👉 Adding '${val}' to transaction_type...`);
                await connection.query(`ALTER TYPE transaction_type ADD VALUE '${val}'`);
                console.log(`✅ Added '${val}'`);
            } catch (err) {
                // If value already exists, Postgres throws error "enum label ... already exists", ignore it
                if (err.message.includes('already exists')) {
                    console.log(`⚠️ '${val}' already exists, skipping.`);
                } else {
                    console.error(`❌ Failed to add '${val}':`, err.message);
                }
            }
        }

        console.log("🎉 Migration Enums Completed!");

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrateWalletEnum();
