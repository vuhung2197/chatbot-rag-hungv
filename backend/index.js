const express = require('express');
const cors = require('cors');
const { getEnglishBotReply, translateSingleWord } = require('./rules');
const pool = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

// Chat API (POST /chat)
app.post('/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "No message!" });
    const reply = await getEnglishBotReply(message);

    // Lưu vào MySQL
    await pool.execute(
        "INSERT INTO chat_history (message, reply) VALUES (?, ?)",
        [message, reply]
    );

    res.json({ reply });
});

// Lấy lịch sử chat (GET /history)
app.get('/history', async (req, res) => {
    const [rows] = await pool.execute(
        "SELECT message, reply, created_at FROM chat_history ORDER BY id DESC LIMIT 50"
    );
    res.json(rows);
});

// Góp ý/training API (POST /feedback)
app.post('/feedback', async (req, res) => {
    const { message, suggested_reply, explanation } = req.body;
    if (!message || !suggested_reply) {
        return res.status(400).json({ message: "Thiếu thông tin góp ý!" });
    }
    await pool.execute(
        "INSERT INTO feedbacks (message, suggested_reply, explanation) VALUES (?, ?, ?)",
        [message, suggested_reply, explanation]
    );
    res.json({ message: "Đã ghi nhận góp ý! Admin sẽ kiểm duyệt sớm." });
});

// Lấy danh sách góp ý (GET /feedbacks)
app.get('/feedbacks', async (req, res) => {
    const [rows] = await pool.execute(
        "SELECT id, message, suggested_reply, explanation, approved, created_at FROM feedbacks ORDER BY id DESC"
    );
    res.json(rows);
});

// Duyệt góp ý (POST /approve-feedback)
app.post('/approve-feedback', async (req, res) => {
    const { id } = req.body;
    const [result] = await pool.execute(
        "UPDATE feedbacks SET approved = 1 WHERE id = ?",
        [id]
    );
    if (result.affectedRows > 0) {
        res.json({ message: "Góp ý đã được duyệt." });
    } else {
        res.status(404).json({ message: "Không tìm thấy góp ý!" });
    }
});

app.get('/suggest', async (req, res) => {
    const query = req.query.query?.trim().toLowerCase();
    if (!query) return res.json([]);
    // Gợi ý theo tiếng Anh, có thể sửa lại cho tiếng Việt nếu cần
    const [rows] = await pool.execute(
        "SELECT DISTINCT word_en FROM dictionary WHERE word_en LIKE ? ORDER BY word_en LIMIT 10",
        [`${query}%`]
    );
    // Trả về danh sách gợi ý
    res.json(rows.map(row => row.word_en));
});

// POST /save-word
app.post('/save-word', async (req, res) => {
    const { word_en, word_vi } = req.body;
    if (!word_en) return res.status(400).json({ message: "Thiếu từ tiếng Anh!" });

    // Kiểm tra trùng từ
    const [rows] = await pool.execute(
        "SELECT id FROM user_words WHERE word_en = ?",
        [word_en.trim().toLowerCase()]
    );
    if (rows.length > 0) {
        return res.status(400).json({ message: "Từ này đã có trong sổ tay!" });
    }

    await pool.execute(
        "INSERT INTO user_words (word_en, word_vi) VALUES (?, ?)",
        [word_en.trim().toLowerCase(), word_vi || null]
    );
    res.json({ message: "Đã lưu từ!" });
});

// GET /user-words
app.get('/user-words', async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM user_words ORDER BY created_at DESC');
    res.json(rows);
});

// POST /approve-word
app.post('/approve-word', async (req, res) => {
    const { id } = req.body;
    // Lấy dữ liệu từ user_words
    const [rows] = await pool.execute('SELECT * FROM user_words WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: "Không tìm thấy từ!" });

    const { word_en, word_vi } = rows[0];
    // Insert vào dictionary (nếu chưa có)
    const [exist] = await pool.execute('SELECT id FROM dictionary WHERE word_en = ?', [word_en]);
    if (exist.length > 0) {
        return res.status(400).json({ message: "Từ đã có trong từ điển!" });
    }
    await pool.execute(
        "INSERT INTO dictionary (word_en, word_vi) VALUES (?, ?)",
        [word_en, word_vi || null]
    );
    // Xoá khỏi user_words nếu muốn (tùy, có thể comment lại nếu chỉ muốn đánh dấu đã duyệt)
    await pool.execute("DELETE FROM user_words WHERE id = ?", [id]);
    res.json({ message: "Đã duyệt vào từ điển!" });
});

app.post('/delete-user-word', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "Thiếu ID!" });
  await pool.execute('DELETE FROM user_words WHERE id = ?', [id]);
  res.json({ message: "Đã xóa từ!" });
});

// Ở app.js hoặc routes file
app.post('/save-highlight', async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0)
    return res.status(400).json({ message: "Thiếu đoạn văn bản!" });

  // Gọi hàm AI bot để dịch EN->VI
  let translatedText = "";
  try {
    // Có thể truyền format message theo dạng: "Dịch sang tiếng Việt: ..."
    translatedText = await translateSingleWord(text);
    // Nếu getEnglishBotReply trả về object {reply}, thì lấy .reply
    if (typeof translatedText === "object" && translatedText.reply) {
      translatedText = translatedText.reply;
    }
  } catch (e) {
    translatedText = "";
  }

  await pool.execute(
    "INSERT INTO user_highlighted_text (text, translated_text) VALUES (?, ?)",
    [text, translatedText]
  );
  res.json({ message: "Đã lưu và dịch đoạn văn bằng AI!", translatedText });
});

// API lấy danh sách các đoạn đã lưu (cho tab mới ở FE)
app.get('/highlights', async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, text, translated_text, created_at FROM user_highlighted_text ORDER BY id DESC"
  );
  res.json(rows);
});

// (Có thể bổ sung API xóa, update, hoặc chuyển thành từ mới nếu cần)

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
