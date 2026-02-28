import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        const filePath = path.join(__dirname, '..', 'db', 'migrations', 'add_user_mistake_logs.sql');
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log('Running migration: add_user_mistake_logs.sql...');
        await db.query(sql);
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Error running migration:', error);
    } finally {
        process.exit(0);
    }
}

runMigration();
