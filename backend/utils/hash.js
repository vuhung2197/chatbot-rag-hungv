const crypto = require("crypto");

/**
 * Tạo mã băm (hash) MD5 cho một chuỗi văn bản.
 * Thường dùng để kiểm tra trùng lặp nội dung chunk.
 *
 * @param {string} text - Chuỗi văn bản cần băm
 * @returns {string} - Giá trị hash dạng hex
 */
function createHash(text) {
  return crypto.createHash("md5").update(text).digest("hex");
}

module.exports = { createHash };