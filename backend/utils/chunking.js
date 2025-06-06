/**
 * Chia một đoạn văn bản thành các chunk nhỏ hơn dựa trên số lượng từ tối đa.
 * Mỗi chunk sẽ cố gắng giữ nguyên câu (chia theo dấu câu).
 *
 * @param {string} text - Đoạn văn bản cần chia nhỏ
 * @param {number} maxWords - Số lượng từ tối đa cho mỗi chunk (mặc định: 120)
 * @returns {string[]} - Mảng các chunk đã chia
 */
function splitIntoChunks(text, maxWords = 120) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let current = "";

  for (let s of sentences) {
    const next = current + " " + s;
    if (next.split(" ").length <= maxWords) {
      current = next;
    } else {
      chunks.push(current.trim());
      current = s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

module.exports = { splitIntoChunks };