import crypto from "crypto";

/**
 * Tạo mã băm (hash) MD5 cho một chuỗi văn bản.
 * Thường dùng để kiểm tra trùng lặp nội dung chunk.
 *
 * @param {string} text - Chuỗi văn bản cần băm
 * @returns {string} - Giá trị hash dạng hex
 */
export function createHash(text) {
  return crypto.createHash("md5").update(text).digest("hex");
}

/**
 * Tạo hash SHA256 cho câu hỏi (dùng để kiểm tra trùng lặp).
 * @param {string} text - Chuỗi văn bản cần băm
 * @returns {string} - Giá trị hash dạng hex
 */
export function hashQuestion(text) {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}