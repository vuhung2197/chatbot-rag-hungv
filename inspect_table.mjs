
import pool from './backend/db.js';

async function inspectTable() {
    console.log("🔍 Inspecting game_sessions...");
    const connection = await pool.getConnection();

    try {
        // Postgres query to get column details
        const [columns] = await connection.query(`
            SELECT column_name, data_type, udt_name, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'game_sessions';
        `);

        console.table(columns.map(c => ({
            Column: c.column_name,
            Type: c.data_type,
            UDT: c.udt_name,
            MaxLen: c.character_maximum_length
        })));

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

inspectTable();
