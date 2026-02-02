
import pool from './backend/db.js';

async function dropConstraints() {
    console.log("🛠️ Dropping Old Constraints (PostgreSQL)...");
    const connection = await pool.getConnection();

    try {
        // 1. Xóa constraint kiểm tra result_type của bảng game_sessions
        console.log("👉 Dropping constraint 'game_sessions_result_type_check'...");
        try {
            await connection.query("ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_result_type_check;");
            console.log("✅ Dropped 'game_sessions_result_type_check'");
        } catch (e) {
            console.log("⚠️ Could not drop result constraint: " + e.message);
        }

        // 2. Xóa constraint kiểm tra bet_type của bảng game_bets (dự đoán sẽ bị lỗi tương tự)
        console.log("👉 Dropping constraint 'game_bets_bet_type_check'...");
        try {
            await connection.query("ALTER TABLE game_bets DROP CONSTRAINT IF EXISTS game_bets_bet_type_check;");
            console.log("✅ Dropped 'game_bets_bet_type_check'");
        } catch (e) {
            console.log("⚠️ Could not drop bet constraint: " + e.message);
        }

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

dropConstraints();
