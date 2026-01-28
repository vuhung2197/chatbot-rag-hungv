
import './bootstrap/env.js';
import pool from './db.js';
import bcrypt from 'bcrypt';

const email = 'admin@gmail.com';
const password = 'password123';
const name = 'Admin User';

async function createAdmin() {
    try {
        console.log(`Checking for user with email: ${email}`);
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

        const passwordHash = await bcrypt.hash(password, 10);

        if (users.length > 0) {
            console.log('User exists. Updating to admin role...');
            await pool.execute(
                'UPDATE users SET role = ?, password_hash = ? WHERE email = ?',
                ['admin', passwordHash, email]
            );
            console.log(`✅ User ${email} promoted to ADMIN. Password updated to '${password}'.`);
        } else {
            console.log('User does not exist. Creating new admin user...');
            await pool.execute(
                `INSERT INTO users (name, email, password_hash, role, email_verified, account_status) 
                 VALUES (?, ?, ?, 'admin', true, 'active')`,
                [name, email, passwordHash]
            );
            console.log(`✅ Admin user created: ${email} / ${password}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();
