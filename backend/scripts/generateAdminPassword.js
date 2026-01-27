/**
 * Helper Script: Generate Password Hash cho Admin
 * 
 * Sử dụng script này để tạo bcrypt hash từ password
 * cho việc tạo admin trong database
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Generate password hash
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Bcrypt hash
 */
async function generatePasswordHash(password) {
    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        return hash;
    } catch (error) {
        console.error('❌ Error generating hash:', error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    // Lấy password từ command line arguments
    const password = process.argv[2];

    if (!password) {
        console.log(`
📝 HƯỚNG DẪN SỬ DỤNG:
====================

Tạo password hash cho admin:
  node backend/scripts/generateAdminPassword.js "your-password-here"

Ví dụ:
  node backend/scripts/generateAdminPassword.js "Admin@123"

Sau đó copy hash và dùng trong SQL:
  INSERT INTO users (name, email, password_hash, role) 
  VALUES ('Admin', 'admin@example.com', 'HASH_FROM_SCRIPT', 'admin');
`);
        process.exit(0);
    }

    console.log('\n🔐 Generating password hash...\n');

    const hash = await generatePasswordHash(password);

    console.log('✅ Password hash generated successfully!\n');
    console.log('📋 Hash:');
    console.log(hash);
    console.log('\n📝 SQL Query mẫu:\n');
    console.log(`INSERT INTO users (name, email, password_hash, role, email_verified, account_status)`);
    console.log(`VALUES (`);
    console.log(`  'Administrator',`);
    console.log(`  'admin@example.com',  -- ← THAY EMAIL TẠI ĐÂY`);
    console.log(`  '${hash}',`);
    console.log(`  'admin',`);
    console.log(`  TRUE,`);
    console.log(`  'active'`);
    console.log(`);\n`);

    console.log('⚠️  LƯU Ý: Đừng quên tạo wallet cho admin sau khi insert:\n');
    console.log(`INSERT INTO user_wallets (user_id, balance, currency, status)`);
    console.log(`SELECT id, 0.00, 'USD', 'active' FROM users WHERE email = 'admin@example.com';\n`);
}

main().catch(console.error);
