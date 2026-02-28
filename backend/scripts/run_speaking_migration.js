import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import pool from '../db.js';

async function run() {
    try {
        const sqlPath = path.resolve(__dirname, '../../db/migrations/speaking_practice_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        await pool.query(sql);
        console.log('✅ Speaking practice schema migration successful!');
    } catch (e) {
        console.error('❌ Migration failed:', e);
    } finally {
        process.exit();
    }
}
run();
