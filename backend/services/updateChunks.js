// services/updateChunks.js
const { splitIntoSemanticChunks } = require("../utils/chunking");
const { createHash } = require("../utils/hash");
const pool = require("../db");
const { getEmbedding } = require("./embeddingVector");

/**
 * Cập nhật các chunk cho một bản ghi kiến thức.
 * - Chia content thành các đoạn nhỏ (chunk) theo số lượng từ.
 * - Sinh embedding cho từng chunk.
 * - Lưu vào bảng knowledge_chunks nếu chưa tồn tại (theo hash).
 *
 * @param {number|string} id - ID của bản ghi kiến thức cha
 * @param {string} title - Tiêu đề kiến thức
 * @param {string} content - Nội dung kiến thức
 */
async function updateChunksForKnowledge(id, title, content) {
  // 100 context words per chunk
  const chunks = splitIntoSemanticChunks(content, 100);

  for (const chunk of chunks) {
    const hash = createHash(chunk);

    // Kiểm tra nếu đã tồn tại chunk này thì bỏ qua
    const [exists] = await pool.execute(
      "SELECT id FROM knowledge_chunks WHERE hash = ? LIMIT 1",
      [hash]
    );
    if (exists.length > 0) continue;

    const embedding = await getEmbedding(chunk);
    const tokenCount = chunk.split(/\s+/).length;

    await pool.execute(
      `INSERT INTO knowledge_chunks 
        (parent_id, title, content, embedding, token_count, hash) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, chunk, JSON.stringify(embedding), tokenCount, hash]
    );
  }
}

module.exports = { updateChunksForKnowledge };