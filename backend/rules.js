const pool = require('./db');
const Fuse = require('fuse.js');

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

// Giả sử dùng MySQL và pool đã khai báo
async function translateSingleWord(word_en) {
    const [rows] = await pool.execute(
        "SELECT word_vi FROM dictionary WHERE word_en = ? LIMIT 1", 
        [word_en.trim().toLowerCase()]
    );
    if (rows.length > 0) {
        return rows[0].word_vi; // Trả về nghĩa tiếng Việt
    }
    return null; // Không tìm thấy
}

async function getEnglishBotReply(message) {
    const msg = message.toLowerCase().trim();
    const vocabRows = await getVocabulary();

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

    // --- Dịch Anh-Việt (tra Anh-Việt) ---
    if (en2vi) {
        const founds = vocabRows.filter(row => row.word_en.trim().toLowerCase() === word);

        if (founds.length > 0) {
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

        // Fuzzy search
        const fuseEn = new Fuse(vocabRows.map(r => r.word_en), { threshold: 0.4 });
        const fuzzy = fuseEn.search(word);
        if (fuzzy.length > 0) {
            const w = fuzzy[0].item;
            const frow = vocabRows.find(r => r.word_en === w);
            const examples = await getSentences(frow.word_en);
            let html = `<div>Bạn có hỏi từ "<b>${w}</b>"? Từ này nghĩa là: <b>${frow.word_vi}</b>`;
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

    // --- Dịch Việt-Anh (tra Việt-Anh) ---
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
        // Fuzzy search
        const fuseVi = new Fuse(vocabRows.map(r => r.word_vi), { threshold: 0.4 });
        const fuzzy = fuseVi.search(word);
        if (fuzzy.length > 0) {
            const wvn = fuzzy[0].item;
            const row = vocabRows.find(r => r.word_vi === wvn);
            const examples = await getSentences(row.word_en);
            let html = `<div>Bạn có hỏi từ "<b>${wvn}</b>"? Tiếng Anh là: <b>${row.word_en}</b>`;
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

module.exports = { getEnglishBotReply, translateSingleWord };
