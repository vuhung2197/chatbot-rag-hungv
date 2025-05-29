const pool = require('./db');
const Fuse = require('fuse.js');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Trả về toàn bộ dictionary với type, example (giúp tra theo loại từ)
async function getVocabulary() {
    const [rows] = await pool.execute(
        'SELECT word_en, word_vi, type, example_en, example_vi FROM dictionary'
    );
    return rows;
}

async function getSentences(word) {
    const [rows] = await pool.execute(
        'SELECT sentence_en, sentence_vi FROM sentence_examples WHERE word_en = ? LIMIT 3', [word]);
    return rows;
}

async function logUnknownQuery(message) {
    await pool.execute('INSERT INTO unknown_queries (user_message) VALUES (?)', [message]);
}

async function translateWordByWord(sentence) {
  // Tách từ, loại bỏ dấu câu
  const words = sentence
    .replace(/[.,!?;:()"]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  // Dịch từng từ, chỉ lấy nghĩa thuần Việt, bỏ nghĩa không hợp lệ
  const translations = await Promise.all(
    words.map(async (word) => {
      let vi = await translateSingleWord(word.toLowerCase());
      // Loại bỏ kí tự không mong muốn, chỉ giữ chữ cái tiếng Việt, số và dấu cách
      vi = vi.replace(/[^a-zA-ZÀ-ỹà-ỹ0-9\s]/g, '').trim();
      return vi;
    })
  );

  // Lọc bỏ nghĩa rỗng hoặc toàn kí tự lạ (nếu có)
  const filtered = translations.filter(vi => vi && vi.length > 0);

  // Ghép lại thành một chuỗi, cách nhau bởi dấu cách
  return filtered.join(' ');
}

async function translateSingleWord(word) {
  const prompt = `Translate the English word '${word}' to Vietnamese. Only return the Vietnamese word, nothing else.`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0,
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI error:", err.response ? err.response.data : err);
    return "(lỗi)";
  }
}

// Helper: Format kết quả tra từ Anh-Việt
async function formatEnViResult(word, founds) {
    let html = `<div><b>Các loại từ và nghĩa của "<span style='color:#7137ea'>${word}</span>":</b><ul style="margin-left:1em;">`;
    for (const found of founds) {
        html += `<li style="margin-bottom:0.7em;">
          <b>${found.type || "Loại từ không xác định"}</b><br/>
          <span>• Nghĩa:</span> ${found.word_vi ? `<span>${found.word_vi}</span>` : "<i>Chưa có</i>"}
        `;
        let hasExample = false;
        if (found.example_en || found.example_vi) {
            html += `<br/><span>• Ví dụ:</span>
                <ul style="margin-left:1.3em; margin-bottom:0.3em;">
                  <li><i>${found.example_en || ""}</i> ${found.example_vi ? `<span style="color:#666;">(${found.example_vi})</span>` : ""}</li>
                </ul>`;
            hasExample = true;
        }
        if (!hasExample) {
            const examples = await getSentences(found.word_en);
            if (examples.length) {
                html += `<br/><span>• Một số ví dụ khác:</span>
                  <ul style="margin-left:1.3em; margin-bottom:0.3em;">` +
                    examples.map(ex =>
                        `<li><i>${ex.sentence_en}</i> <span style="color:#666;">(${ex.sentence_vi || "?"})</span></li>`
                    ).join('') +
                    `</ul>`;
            }
        }
        html += `</li>`;
    }
    html += `</ul></div>`;
    return html;
}

// Helper: Fuzzy search
function getFuzzyResult(word, vocabRows, field = 'word_en') {
    const fuse = new Fuse(vocabRows.map(r => r[field]), { threshold: 0.4 });
    const fuzzy = fuse.search(word);
    if (fuzzy.length > 0) {
        const w = fuzzy[0].item;
        return vocabRows.find(r => r[field] === w);
    }
    return null;
}

async function getEnglishBotReply(message) {
    const msg = message.toLowerCase().trim();
    const vocabRows = await getVocabulary();

    // 1. Nhận diện intent
    let word = null, en2vi = false, vi2en = false, match;

    const patternsEnVi = [
        /dịch từ ([\w\s\-]+) sang tiếng việt/i,
        /dịch sang tiếng việt từ ([\w\s\-]+)/i,
        /nghĩa của ([\w\s\-]+) là gì/i,
        /từ ([\w\s\-]+) nghĩa (?:tiếng việt )?là gì/i,
        /what does ([\w\s\-]+) mean/i,
        /translate ([\w\s\-]+) to vietnamese/i,
        /([\w\s\-]+)/i
    ];
    for (const pattern of patternsEnVi) {
        match = msg.match(pattern);
        if (match) {
            word = match[1].trim().toLowerCase();
            en2vi = true;
            break;
        }
    }
    if (!word) {
        const patternsViEn = [
            /dịch từ ([\w\s\-à-ỹ]+) sang tiếng anh/i,
            /dịch sang tiếng anh từ ([\w\s\-à-ỹ]+)/i,
            /([\w\s\-à-ỹ]+) nghĩa tiếng anh là gì/i,
            /nghĩa tiếng anh của ([\w\s\-à-ỹ]+)/i
        ];
        for (const pattern of patternsViEn) {
            match = msg.match(pattern);
            if (match) {
                word = match[1].trim().toLowerCase();
                vi2en = true;
                break;
            }
        }
    }
    if (!word) {
        await logUnknownQuery(message);
        return `<div>Xin lỗi, tôi chưa hiểu từ/câu này. Bạn có thể góp ý hoặc chờ admin cập nhật thêm!</div>`;
    }

    // 2. Dịch Anh-Việt (tra từ)
    if (en2vi) {
        const founds = vocabRows.filter(row => row.word_en.trim().toLowerCase() === word);
        if (founds.length > 0) {
            return await formatEnViResult(word, founds);
        }
        // Fuzzy
        const frow = getFuzzyResult(word, vocabRows, 'word_en');
        if (frow) {
            const examples = await getSentences(frow.word_en);
            let html = `<div>Bạn có hỏi từ "<b>${frow.word_en}</b>"? Từ này nghĩa là: <b>${frow.word_vi}</b>`;
            if (examples.length) {
                html += `<br/>Ví dụ:<ul style="margin-left:1.3em;">` +
                    examples.map(ex => `<li><i>${ex.sentence_en}</i> <span style="color:#666;">(${ex.sentence_vi || "?"})</span></li>`).join('') +
                    `</ul>`;
            }
            html += `</div>`;
            return html;
        }
        await logUnknownQuery(message);
        return `<div>Xin lỗi, tôi chưa biết nghĩa của từ "<b>${word}</b>". Bạn có thể góp ý để tôi học thêm!</div>`;
    }

    // 3. Dịch Việt-Anh (tra từ)
    if (vi2en) {
        const found = vocabRows.find(row => row.word_vi.trim().toLowerCase() === word);
        if (found) {
            const examples = await getSentences(found.word_en);
            let html = `<div>Từ "<b>${word}</b>" tiếng Anh là: <b>${found.word_en}</b>`;
            if (examples.length) {
                html += `<br/>Ví dụ:<ul style="margin-left:1.3em;">` +
                    examples.map(ex => `<li><i>${ex.sentence_en}</i> <span style="color:#666;">(${ex.sentence_vi || "?"})</span></li>`).join('') +
                    `</ul>`;
            }
            html += `</div>`;
            return html;
        }
        // Fuzzy
        const row = getFuzzyResult(word, vocabRows, 'word_vi');
        if (row) {
            const examples = await getSentences(row.word_en);
            let html = `<div>Bạn có hỏi từ "<b>${row.word_vi}</b>"? Tiếng Anh là: <b>${row.word_en}</b>`;
            if (examples.length) {
                html += `<br/>Ví dụ:<ul style="margin-left:1.3em;">` +
                    examples.map(ex => `<li><i>${ex.sentence_en}</i> <span style="color:#666;">(${ex.sentence_vi || "?"})</span></li>`).join('') +
                    `</ul>`;
            }
            html += `</div>`;
            return html;
        }
        await logUnknownQuery(message);
        return `<div>Xin lỗi, tôi chưa biết nghĩa tiếng Anh của "<b>${word}</b>". Bạn có thể góp ý để tôi học thêm!</div>`;
    }
}

module.exports = { getEnglishBotReply, translateWordByWord };
