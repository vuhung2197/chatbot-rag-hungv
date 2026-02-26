import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import pool from '../db.js';

async function run() {
    try {
        const sql = `
            INSERT INTO listening_exercises (level, type, title, audio_text, hints, is_active)
            VALUES 
            ('B2', 'dictation', 'Climate Change Discussion', 'The impact of global warming on coastal regions is becoming increasingly severe, leading to frequent flooding and erosion.', '["focus on advanced environmental vocabulary"]', TRUE),
            ('C1', 'dictation', 'Academic Lecture on Neurology', 'Neuroplasticity refers to the brain''s remarkable ability to reorganize itself by forming new neural connections throughout life, fundamentally changing how we understand learning and recovery.', '["pay attention to academic terms and complex sentence structures"]', TRUE),
            ('C2', 'dictation', 'Philosophical Debate', 'The juxtaposition of determinism and free will poses a quintessential conundrum, compelling us to continuously reevaluate the ontological foundations of human agency.', '["expect highly advanced vocabulary and sophisticated phrasing"]', TRUE)
            ON CONFLICT DO NOTHING;
        `;
        await pool.query(sql);
        console.log("Successfully seeded B2, C1, C2 listening exercises!");
    } catch (e) {
        console.error("Seeding failed", e);
    } finally {
        process.exit();
    }
}
run();
