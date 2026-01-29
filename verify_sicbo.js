/**
 * Tool kiểm tra tính công bằng (Provably Fair Verifier) cho game Sic Bo
 * 
 * Cách sử dụng:
 * 1. Mở terminal tại thư mục gốc dự án.
 * 2. Chạy lệnh: node verify_sicbo.js <ServerSeed> <ClientSeed> <Nonce>
 * 
 * Ví dụ:
 * node verify_sicbo.js b84576329... my_lucky_string 1706500000000
 */

const crypto = require('crypto');

// Lấy tham số từ dòng lệnh
const args = process.argv.slice(2);

const [cmd, arg1, arg2] = args;

if (cmd === 'gen') {
    const seed = crypto.randomBytes(32).toString('hex');
    console.log("\n🎲 ĐÃ TẠO SERVER SEED MỚI (Ngẫu nhiên):");
    console.log("----------------------------------------");
    console.log(seed);
    console.log("----------------------------------------");
    console.log("Lưu lại chuỗi này để làm Server Seed cho việc test.\n");
    process.exit(0);
}

const serverSeed = cmd;
const clientSeed = arg1;
const nonce = arg2;

if (!serverSeed || !clientSeed || !nonce) {
    console.log("❌ Thiếu tham số!");
    console.log("1. Để tạo Seed mới: node verify_sicbo.js gen");
    console.log("2. Để kiểm tra:     node verify_sicbo.js <ServerSeed> <ClientSeed> <Nonce>");
    process.exit(1);
}

console.log("\n🔍 ĐANG KIỂM TRA KẾT QUẢ SIC BO...");
console.log("----------------------------------------");
console.log(`📡 Server Seed: ${serverSeed}`);
console.log(`👤 Client Seed: ${clientSeed}`);
console.log(`🔢 Nonce      : ${nonce}`);
console.log("----------------------------------------");

// --- THUẬT TOÁN (Copy từ backend) ---

const rollDice = (serverSeed, clientSeed, nonce) => {
    // 1. Tạo chuỗi combine
    const message = `${clientSeed}:${nonce}`;

    // 2. Tạo HMAC SHA256 Hash
    const hash = crypto.createHmac('sha256', serverSeed)
        .update(message)
        .digest('hex');

    console.log(`🔑 HMAC Hash  : ${hash.substring(0, 20)}...`); // In rút gọn

    // 3. Tính toán xúc xắc
    const dice = [];
    let index = 0;

    // Lặp cho đến khi đủ 3 viên
    while (dice.length < 3) {
        // Lấy 5 ký tự hex
        const subHash = hash.substring(index, index + 5);
        if (subHash.length < 5) break;

        const decimalValue = parseInt(subHash, 16);

        // Chỉ nhận giá trị < 1,000,000 để đảm bảo phân phối đều
        if (decimalValue < 1000000) {
            const diceValue = (decimalValue % 6) + 1;
            dice.push(diceValue);
            console.log(`   🎲 Dice ${dice.length}: Hex ${subHash} -> Dec ${decimalValue} -> ${diceValue}`);
        } else {
            console.log(`   ⚠️ Skip ${subHash} (Value >= 1,000,000)`);
        }

        index += 5;
    }

    // Fallback (Nếu cực hiếm khi không đủ 3 viên - code backend có, nhưng code verify hiển thị cảnh báo thôi)
    if (dice.length < 3) {
        console.log("⚠️ Cảnh báo: Hash không đủ sinh ra 3 số hợp lệ (Trường hợp cực hiếm!)");
    }

    return dice;
};

// --- CHẠY KIỂM TRA ---

const resultDice = rollDice(serverSeed, clientSeed, nonce);
const total = resultDice.reduce((a, b) => a + b, 0);

let resultType = "TRƯỢT"; // Mặc định
if (resultDice[0] === resultDice[1] && resultDice[1] === resultDice[2]) {
    resultType = "BÃO (TRIPLE) 🌪️";
} else if (total >= 11) {
    resultType = "TÀI (BIG) 🔵";
} else {
    resultType = "XỈU (SMALL) ⚪";
}

console.log("----------------------------------------");
console.log(`✅ KẾT QUẢ: [ ${resultDice.join(', ')} ]`);
console.log(`📊 TỔNG   : ${total}`);
console.log(`🏆 LOẠI   : ${resultType}`);
console.log("----------------------------------------\n");
