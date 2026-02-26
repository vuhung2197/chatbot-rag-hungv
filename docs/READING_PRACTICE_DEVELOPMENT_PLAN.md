# Kịch Bản Phát Triển: Reading Practice (Luyện Đọc Hiểu Tiếng Anh AI)

**Ngày tạo:** 2026-02-26  
**Trạng thái:** Kế hoạch (Chưa triển khai)  
**Ưu tiên:** Cao — Module thứ 3 trong lộ trình 4 kỹ năng  

---

## 1. Tổng Quan Tính Năng

Tính năng Reading Practice cho phép người dùng luyện đọc hiểu tiếng Anh với các bài báo/đoạn văn được AI tạo tự động theo đúng trình độ CEFR (A1→C2). Điểm nhấn là khả năng **Click-to-Translate** (bấm vào từ lạ để xem nghĩa) và **AI Quiz** (trả lời câu hỏi kiểm tra mức độ hiểu bài).

### Tại sao Reading là module tiếp theo hợp lý nhất?
1. **Chi phí thấp nhất**: Chỉ cần 1 API call GPT (sinh bài đọc), không cần TTS như Listening.
2. **Tận dụng tối đa hạ tầng hiện có**: Sổ Từ Vựng SRS, Streak System đã sẵn sàng.
3. **UX đơn giản**: Không cần xử lý audio/microphone, chỉ cần text rendering + click events.

---

## 2. Thiết Kế Tính Năng Chi Tiết

### 2.1 Luồng Người Dùng (User Flow)

```
[Chọn Level B1] → [Chọn chủ đề: Travel / Science / Daily Life]
       ↓
[AI sinh bài đọc ~200-500 từ theo level + chủ đề]
       ↓
[Hiển thị bài đọc với từng từ có thể click]
       ↓
[User đọc bài, click từ lạ → Popup nghĩa TV + nút "Lưu vào Sổ SRS"]
       ↓
[Hoàn tất đọc → Bấm "Kiểm tra hiểu bài"]
       ↓
[AI sinh 5 câu hỏi True/False/Not Given hoặc Multiple Choice]
       ↓
[User trả lời → AI chấm + giải thích đáp án]
       ↓
[Hiển thị kết quả: Điểm, giải thích, từ vựng đã lưu]
```

### 2.2 Các Dạng Bài Đọc

| Dạng | Mô tả | Level phù hợp |
|------|--------|---------------|
| **Short Passage** | Đoạn văn ngắn 100-200 từ | A1, A2 |
| **Article** | Bài báo 200-400 từ | B1, B2 |
| **Academic Text** | Văn bản học thuật 300-500 từ | C1, C2 |

### 2.3 Các Chủ Đề (Topics)

```javascript
const READING_TOPICS = [
    { id: 'daily_life', label: '🏠 Cuộc sống hàng ngày', icon: '🏠' },
    { id: 'travel',     label: '✈️ Du lịch',             icon: '✈️' },
    { id: 'science',    label: '🔬 Khoa học',             icon: '🔬' },
    { id: 'technology', label: '💻 Công nghệ',            icon: '💻' },
    { id: 'health',     label: '🏥 Sức khỏe',             icon: '🏥' },
    { id: 'culture',    label: '🎭 Văn hóa',              icon: '🎭' },
    { id: 'business',   label: '💼 Kinh doanh',           icon: '💼' },
    { id: 'environment',label: '🌍 Môi trường',           icon: '🌍' },
];
```

---

## 3. Kiến Trúc Kỹ Thuật

### 3.1 Sơ Đồ Kiến Trúc

```
Frontend (React)                          Backend (Node.js Express)
┌─────────────────────┐                   ┌──────────────────────────────────┐
│  ReadingTab.js       │                   │                                  │
│  (Chọn level + topic)│──POST /generate─→│  reading.controller.js           │
│                      │←── JSON ─────────│    ↓                             │
│                      │                   │  reading.service.js              │
│  ReadingViewer.js    │                   │    ↓                             │
│  (Đọc bài + click)  │──POST /lookup───→ │  OpenAI GPT-4o-mini             │
│                      │←── JSON ──────── │  (Sinh bài đọc + tra từ + quiz)  │
│                      │                   │                                  │
│  ReadingQuiz.js      │──POST /submit──→ │    ↓                             │
│  (Trả lời câu hỏi)  │←── JSON ──────── │  reading.repository.js           │
│                      │                   │                                  │
│  ReadingResult.js    │                   │    ↓                             │
│  (Kết quả + từ vựng) │                   │  PostgreSQL Database             │
└─────────────────────┘                   └──────────────────────────────────┘
```

### 3.2 Cây Thư Mục Dự Kiến

```
backend/src/modules/reading/
├── controllers/
│   └── reading.controller.js       # HTTP handlers
├── services/
│   ├── reading.service.js          # Business logic
│   └── readingAI.service.js        # AI: sinh bài đọc, tra từ, sinh quiz, chấm quiz
├── repositories/
│   └── reading.repository.js       # SQL queries
└── routes/
    └── reading.routes.js           # Express Router

frontend/src/features/reading/
├── ReadingTab.js                   # Dashboard (chọn level, topic, lịch sử)
├── readingService.js               # API client
└── components/
    ├── ReadingViewer.js            # Hiển thị bài đọc + Click-to-Translate
    ├── ReadingQuiz.js              # Câu hỏi trắc nghiệm
    └── ReadingResult.js            # Kết quả + từ vựng đã lưu
```

---

## 4. Database Schema

### 4.1 Bảng `reading_passages` — Kho bài đọc (AI sinh + cache)

```sql
CREATE TABLE IF NOT EXISTS reading_passages (
    id SERIAL PRIMARY KEY,
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    topic VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,              -- Nội dung bài đọc đầy đủ
    word_count INT,
    summary TEXT,                       -- Tóm tắt ngắn (cho danh sách)
    questions JSONB DEFAULT '[]',       -- Câu hỏi quiz do AI sinh
    difficulty_words JSONB DEFAULT '[]',-- Từ khó AI đánh dấu sẵn
    is_generated BOOLEAN DEFAULT TRUE,  -- TRUE = AI sinh, FALSE = nhập tay
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rp_level ON reading_passages(level);
CREATE INDEX idx_rp_topic ON reading_passages(topic);
```

### 4.2 Bảng `reading_submissions` — Lịch sử đọc + quiz

```sql
CREATE TABLE IF NOT EXISTS reading_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    passage_id INT REFERENCES reading_passages(id) ON DELETE SET NULL,
    quiz_answers JSONB DEFAULT '[]',    -- Câu trả lời của user
    score_total DECIMAL(5,2),           -- Điểm quiz (0-100)
    feedback JSONB DEFAULT '{}',        -- Giải thích từng câu
    words_looked_up JSONB DEFAULT '[]', -- Danh sách từ đã tra
    reading_time_seconds INT,           -- Thời gian đọc (tracking)
    status VARCHAR(20) DEFAULT 'reading' CHECK (status IN ('reading','quiz','completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/reading/generate` | AI sinh bài đọc mới theo level + topic | ✅ |
| `GET` | `/reading/passages` | Lấy bài đọc đã sinh (cache) | ✅ |
| `GET` | `/reading/passages/:id` | Lấy chi tiết 1 bài đọc | ✅ |
| `POST` | `/reading/lookup` | Tra nghĩa 1 từ trong ngữ cảnh bài đọc | ✅ |
| `POST` | `/reading/submit-quiz` | Nộp bài quiz + AI chấm | ✅ |

---

## 6. AI Prompts Thiết Kế

### 6.1 Prompt Sinh Bài Đọc

```javascript
const generatePassagePrompt = (level, topic) => `
You are an English reading content creator for CEFR ${level} learners.

Generate an engaging reading passage about "${topic}" with these requirements:
- Level ${level}: Use appropriate vocabulary and grammar complexity
- Length: ${level <= 'A2' ? '100-200' : level <= 'B2' ? '200-400' : '300-500'} words
- Include a compelling title
- Make the content interesting, informative, and culturally relevant
- Naturally include 5-8 vocabulary words that ${level} learners should learn

Return JSON:
{
  "title": "Article title",
  "content": "Full article text...",
  "summary": "1-2 sentence summary",
  "wordCount": 250,
  "difficultyWords": [
    { "word": "sustainable", "position": 45, "definition": "able to continue over time", "translation": "bền vững" }
  ],
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "What is the main idea of the passage?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "B",
      "explanation": "The passage primarily discusses..."
    },
    {
      "id": 2,
      "type": "true_false_ng",
      "statement": "The author believes technology is harmful.",
      "correctAnswer": "Not Given",
      "explanation": "The passage does not mention..."
    }
  ]
}
`;
```

### 6.2 Prompt Tra Từ Trong Ngữ Cảnh

```javascript
const lookupWordPrompt = (word, sentence, level) => `
The user is reading an English text at CEFR ${level} level.
They clicked on the word "${word}" in this sentence: "${sentence}"

Provide a helpful explanation:
{
  "word": "${word}",
  "pronunciation": "/prəˌnʌnsiˈeɪʃən/",
  "partOfSpeech": "noun/verb/adj...",
  "definition": "Simple English definition suitable for ${level}",
  "translation": "Vietnamese translation",
  "exampleInContext": "How it's used in the passage",
  "synonyms": ["word1", "word2"],
  "note": "Any helpful grammar or usage note"
}
`;
```

---

## 7. Frontend Components Chi Tiết

### 7.1 ReadingViewer — Click-to-Translate (Core Feature)

```
┌─────────────────────────────────────────────────┐
│  📖 The Future of Sustainable Energy     [B1]   │
│─────────────────────────────────────────────────│
│                                                  │
│  As the world faces growing environmental        │
│  challenges, many countries are turning to        │
│  [renewable] energy sources. Solar panels and    │
│  wind turbines have become increasingly          │
│  [affordable], making clean energy accessible    │
│  to more communities than ever before.           │
│                                                  │
│  ┌──────────────────────────┐                    │
│  │ 💡 affordable            │  ← Popup khi click │
│  │ /əˈfɔːrdəbl/ (adj)      │                    │
│  │ 📖 reasonably priced    │                    │
│  │ 🇻🇳 có thể chi trả được │                    │
│  │ [💾 Lưu vào Sổ Từ]      │                    │
│  └──────────────────────────┘                    │
│                                                  │
│  ⏱️ Thời gian đọc: 02:35                        │
│  📝 Đã tra: 3 từ                                │
│                                                  │
│  [Tôi đã đọc xong → Làm Quiz]                   │
└─────────────────────────────────────────────────┘
```

**Kỹ thuật render:**
- Tách `content` thành mảng từ: `content.split(/(\s+|[.,!?;:])/)`.
- Mỗi từ bọc trong `<span className="word" onClick={handleWordClick}>`.
- Từ khó (nằm trong `difficultyWords`) highlight nhẹ màu tím.
- Click vào từ → Gọi API `/reading/lookup` → Hiện popup tooltip.

### 7.2 ReadingQuiz — Trắc Nghiệm Kiểm Tra

```
┌─────────────────────────────────────────────────┐
│  📝 Kiểm tra đọc hiểu (5 câu hỏi)             │
│─────────────────────────────────────────────────│
│                                                  │
│  Câu 1/5: What is the main idea of the passage? │
│                                                  │
│  ○ A. Solar energy is too expensive              │
│  ● B. Countries are adopting clean energy  ← chọn│
│  ○ C. Wind turbines are dangerous                │
│  ○ D. Fossil fuels are still the best option     │
│                                                  │
│  [← Trước]                        [Tiếp theo →]  │
│                                                  │
│  ████████░░░░░░░░░░░░  2/5 câu đã trả lời      │
│                                                  │
│  [Nộp bài]                                       │
└─────────────────────────────────────────────────┘
```

### 7.3 ReadingResult — Kết Quả

```
┌─────────────────────────────────────────────────┐
│  🎉 Kết quả đọc hiểu (Level: B1)               │
│─────────────────────────────────────────────────│
│                                                  │
│              Điểm: 80% (4/5 đúng)               │
│                                                  │
│  ✅ Câu 1: Đúng — Main idea is clean energy      │
│  ✅ Câu 2: Đúng — "affordable" means...          │
│  ❌ Câu 3: Sai — Bạn chọn True, đáp án Not Given │
│     💡 Giải thích: Bài viết không đề cập...      │
│  ✅ Câu 4: Đúng                                  │
│  ✅ Câu 5: Đúng                                  │
│                                                  │
│  📚 Từ vựng đã tra (3 từ — đã lưu vào Sổ SRS):  │
│  • renewable (adj) — có thể tái tạo              │
│  • affordable (adj) — có thể chi trả được        │
│  • sustainable (adj) — bền vững                   │
│                                                  │
│  [← Về danh sách]  [📖 Đọc bài khác]            │
└─────────────────────────────────────────────────┘
```

---

## 8. Chi Phí API Ước Tính

| Hành động | API Call | Model | Chi phí ước tính |
|-----------|---------|-------|-----------------|
| Sinh bài đọc + quiz | 1 call GPT | gpt-4o-mini | ~$0.0005 (~12 VNĐ) |
| Tra từ (mỗi lần click) | 1 call GPT | gpt-4o-mini | ~$0.0001 (~2.5 VNĐ) |
| Chấm quiz | 0 call (đối chiếu đáp án cứng) | — | $0 |
| **Tổng 1 bài đọc (tra 5 từ)** | | | **~$0.001** (~25 VNĐ) |

**So sánh chi phí 3 module:**
| Module | Chi phí/bài | Ghi chú |
|--------|------------|---------|
| Writing | ~$0.0005 | 1 GPT call |
| Listening | ~$0.0023 | 1 TTS + 1 GPT |
| **Reading** | **~$0.001** | 1 GPT + N tra từ |

---

## 9. Kế Hoạch Triển Khai (Step-by-step)

### Phase 1: Backend Core (Ngày 1-2)
- [ ] Tạo migration SQL (`reading_passages`, `reading_submissions`)
- [ ] Tạo `reading.repository.js` (CRUD passages, submissions)
- [ ] Tạo `readingAI.service.js` (sinh bài đọc, tra từ)
- [ ] Tạo `reading.service.js` (business logic)
- [ ] Tạo `reading.controller.js` + `reading.routes.js`
- [ ] Mount route `/reading` trong `index.js`

### Phase 2: Frontend Dashboard (Ngày 2-3)
- [ ] Tạo `ReadingTab.js` (chọn level + topic + lịch sử)
- [ ] Tạo `readingService.js` (API client)
- [ ] Thêm nút "📖 Reading Practice" trong `App.js`

### Phase 3: Reading Viewer + Click-to-Translate (Ngày 3-4)
- [ ] Tạo `ReadingViewer.js` (render từng từ clickable)
- [ ] Implement popup tra từ (gọi API `/reading/lookup`)
- [ ] Nút "Lưu vào Sổ SRS" trong popup → Reuse `user_vocabulary`
- [ ] Timer đếm thời gian đọc

### Phase 4: Quiz + Kết Quả (Ngày 4-5)
- [ ] Tạo `ReadingQuiz.js` (hiển thị câu hỏi MCQ / True-False-NG)
- [ ] Tạo `ReadingResult.js` (kết quả + giải thích + từ vựng)
- [ ] Tích hợp Streak chung
- [ ] Test end-to-end

### Phase 5: Polish (Ngày 5-6)
- [ ] Caching bài đọc đã sinh (tránh gọi API lại)
- [ ] Responsive mobile
- [ ] Dark mode support
- [ ] Viết tài liệu `READING_PRACTICE_TECHNICAL_FLOW.md`

---

## 10. Điểm Khác Biệt So Với Writing & Listening

| Tiêu chí | Writing | Listening | Reading |
|----------|---------|-----------|---------|
| Nguồn nội dung | DB sẵn (đề bài) | DB sẵn (audio_text) | **AI sinh realtime** |
| Input user | Viết tự do | Gõ lại audio | Click từ + trả lời quiz |
| Output AI | Chấm 4 tiêu chí | Đối chiếu text | Sinh bài + tra từ + quiz |
| Tương tác chính | Textarea | Audio Player + Textarea | **Click-to-Translate** |
| Chấm điểm | AI phân tích sâu | AI đối chiếu | Đối chiếu đáp án cứng |
| Chi phí/bài | ~12 VNĐ | ~50 VNĐ | ~25 VNĐ |
| Độ phức tạp code | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 11. Rủi Ro & Giải Pháp

| Rủi Ro | Xác suất | Giải pháp |
|--------|----------|-----------|
| AI sinh bài quá dài/ngắn | Trung bình | Validate word_count, retry nếu lệch >20% |
| Tra từ quá nhiều → tốn API | Cao | Cache kết quả tra từ theo (word + passage_id), giới hạn 20 tra/bài |
| Quiz đáp án sai | Thấp | AI sinh đáp án + giải thích cùng lúc, cross-check |
| Bài đọc lặp chủ đề | Trung bình | Truyền history vào prompt: "Avoid topics: [đã đọc]" |

---

## 12. Tổng Kết

Module Reading Practice là mảnh ghép thứ 3 hoàn hảo trong bộ 4 kỹ năng vì:
1. **Chi phí thấp nhất** (~25 VNĐ/bài) — Không cần TTS.
2. **Tận dụng 80% hạ tầng hiện có** — Sổ SRS, Streak, Clean Architecture.
3. **UX độc đáo** — Click-to-Translate tạo trải nghiệm "đọc mượt mà không cần rời app".
4. **Bổ trợ hoàn hảo** — Từ vựng thu thập từ Reading → Ôn trong Flashcard → Nhận diện khi Listening → Sử dụng khi Writing. Vòng lặp 4 kỹ năng khép kín!
