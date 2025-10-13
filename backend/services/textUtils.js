/**
 * Các utility functions cho xử lý văn bản
 * Tách từ scoreContext.js để tái sử dụng
 */

/**
 * Chuẩn hóa văn bản: chuyển về chữ thường, loại bỏ dấu câu và khoảng trắng thừa.
 * Giúp so sánh và trích xuất từ khóa chính xác hơn.
 * @param {string} text - Văn bản cần chuẩn hóa
 * @returns {string} - Văn bản đã chuẩn hóa
 */
export function normalizeText(text) {
  if (!text) return '';
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trích xuất từ khóa chính từ câu hỏi
 * @param {string} question - Câu hỏi người dùng
 * @returns {Array<string>} - Danh sách từ khóa
 */
export function extractKeywords(question) {
  const normalized = normalizeText(question);
  const words = normalized.split(' ').filter(word => word.length > 2);
  
  // Loại bỏ stop words tiếng Việt
  const stopWords = [
    'là', 'của', 'và', 'có', 'được', 'một', 'các', 'cho', 'với', 'từ', 'như', 
    'về', 'khi', 'nào', 'ở', 'đó', 'này', 'thì', 'sẽ', 'đã', 'không', 'cũng',
    'tôi', 'bạn', 'anh', 'chị', 'em', 'mình', 'họ', 'chúng', 'nó'
  ];
  
  return words.filter(word => !stopWords.includes(word));
}

/**
 * Tính độ tương đồng giữa hai chuỗi văn bản
 * @param {string} str1 - Chuỗi thứ nhất
 * @param {string} str2 - Chuỗi thứ hai  
 * @returns {number} - Điểm tương đồng từ 0 đến 1
 */
export function calculateTextSimilarity(str1, str2) {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);
  
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}