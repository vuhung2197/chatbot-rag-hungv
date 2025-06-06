require("dotenv").config();
const pool = require("../db");
const axios = require("axios");
const { splitIntoChunks } = require("../utils/chunking");

/**
 * Gọi OpenAI API để lấy embedding cho một đoạn văn bản.
 * @param {string} text - Đoạn văn bản cần embedding
 * @returns {Promise<number[]>} - Mảng embedding vector
 */
async function getEmbedding(text) {
  const res = await axios.post(
    "https://api.openai.com/v1/embeddings",
    { input: text, model: "text-embedding-3-small" },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
  );
  return res.data.data[0].embedding;
}

/**
 * Chạy toàn bộ quá trình:
 * - Lấy tất cả bản ghi từ knowledge_base
 * - Chia nhỏ content thành các chunk
 * - Lấy embedding cho từng chunk
 * - Lưu vào bảng knowledge_chunks
 */
(async () => {
  const [rows] = await pool.execute("SELECT id, title, content FROM knowledge_base");
  for (let row of rows) {
    const chunks = splitIntoChunks(row.content);
    for (let chunk of chunks) {
      const emb = await getEmbedding(chunk);
      await pool.execute(
        "INSERT INTO knowledge_chunks (parent_id, title, content, embedding, token_count) VALUES (?, ?, ?, ?, ?)",
        [row.id, row.title, chunk, JSON.stringify(emb), chunk.split(" ").length]
      );
    }
  }
  console.log("✅ Done embedding all chunks.");
})();