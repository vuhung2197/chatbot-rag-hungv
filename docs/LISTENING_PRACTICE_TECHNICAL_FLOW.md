# Luồng Xử Lý Kỹ Thuật: Listening Practice (Luyện Nghe Tiếng Anh AI - Dictation)

Tài liệu này mô tả chi tiết luồng xử lý (Data Flow) và kiến trúc từ Frontend đến Backend, tích hợp AI Text-to-Speech (TTS) và AI Grading cho tính năng luyện nghe chép chính tả trong dự án English Chatbot.

---

## 1. Giới Thiệu Tổng Quan

Tính năng Listening Practice cung cấp môi trường luyện kỹ năng nghe hiểu (Listening Comprehension) dựa trên mô hình **Dictation** (Nghe chép chính tả). Người dùng nghe file âm thanh do AI Text-to-Speech (OpenAI TTS-1) phát, gõ lại chính xác những gì nghe được, rồi hệ thống AI (GPT-4o-mini) sẽ đối chiếu từng chữ, chấm điểm % chính xác, chỉ ra lỗi nghe, gợi ý cải thiện, và trích xuất từ vựng hay lưu vào Sổ Tay SRS chung.

### Các thành phần chính từ Frontend (React) tới Backend (Node.js/PostgreSQL/GPT/TTS):
1. **Lựa chọn Đề Nghe & Cấp Độ (Frontend: ListeningTab)**
2. **Phát Âm Thanh TTS & Gõ Lại (Frontend: ListeningEditor)**
3. **Chấm Bài Dictation qua AI (Backend: ListeningAI.Service)**
4. **Phân Tích Phiếu Điểm & Lỗi Nghe (Frontend: ListeningFeedbackPanel)**
5. **Tích Hợp Từ Vựng Chung (SRS Vocabulary - Dùng chung với Writing)**

---

## 2. Kiến Trúc Module (Architecture)

```
Frontend (React)                          Backend (Node.js Express)
┌────────────────────┐                    ┌─────────────────────────────────┐
│  ListeningTab.js   │ ──GET /exercises─→ │  listening.controller.js        │
│  (Danh sách đề)    │ ←── JSON ─────────  │    ↓                            │
│                    │                    │  listening.service.js            │
│  ListeningEditor.js│ ──GET /audio/:id─→ │    ↓                            │
│  (Player + Input)  │ ←── MP3 Blob ──── │  OpenAI TTS-1 API               │
│                    │                    │  (Text → Speech)                │
│                    │ ──POST /submit───→ │    ↓                            │
│                    │                    │  listeningAI.service.js          │
│  ListeningFeedback │ ←── JSON ──────── │    ↓                            │
│  Panel.js          │                    │  OpenAI GPT-4o-mini             │
│  (Kết quả chấm)    │                    │  (So sánh text → Chấm điểm)    │
└────────────────────┘                    └─────────────────────────────────┘
                                                       ↓
                                          ┌─────────────────────────┐
                                          │  PostgreSQL Database     │
                                          │  • listening_exercises   │
                                          │  • listening_submissions │
                                          │  • user_vocabulary       │
                                          └─────────────────────────┘
```

---

## 3. Chi Tiết Luồng Xử Lý (End-to-End Flow)

### Bước 1: Chọn Đề Nghe (Fetching Exercises)
- **Frontend `ListeningTab.js`**: Khi người dùng vào tab "🎧 Listening Practice" và chọn một Level (vd: B1), App gọi `listeningService.getExercises('B1', 'dictation')`.
- **Backend `listening.controller.js → listening.service.js → listening.repository.js`**: Truy vấn bảng `listening_exercises` lọc theo `level` và `type = 'dictation'`, trả về danh sách bài tập.
- **Frontend**: Render danh sách thẻ bài tập, mỗi thẻ hiển thị tiêu đề bài nghe + gợi ý (hints). Có nút **"▶️ Nghe & Viết"** để vào bài.

### Bước 2: Phát Âm Thanh TTS (Audio Generation & Playback)
Đây là điểm khác biệt lớn nhất so với Writing: **Tạo âm thanh thời gian thực từ AI**.

- **Frontend `ListeningEditor.js`**: Khi component mount, gọi `fetch(GET /listening/audio/:id)` kèm header `Authorization: Bearer <token>`.
- **Backend `listening.controller.js → listening.service.js`**:
  1. Lấy `audio_text` (đoạn văn bản gốc) từ bảng `listening_exercises`.
  2. Gọi **OpenAI TTS-1 API** (`openai.audio.speech.create()`) với tham số:
     - `model: "tts-1"` — Mô hình Text-to-Speech nhanh.
     - `voice: "alloy"` — Giọng đọc chuẩn Mỹ trung tính.
     - `input: audio_text` — Đoạn văn bản cần phát âm.
  3. Nhận về `ArrayBuffer` chứa dữ liệu MP3, chuyển sang `Buffer` Node.js.
  4. Trả response với `Content-Type: audio/mpeg`.
- **Frontend**: Nhận blob MP3, tạo `URL.createObjectURL(blob)` gán vào thẻ `<audio>`.
- **UX**: Hiển thị trạng thái "⏳ Đang tạo file âm thanh từ AI... (3-5 giây)" trong khi chờ.

**Lưu ý kỹ thuật quan trọng:** Thẻ HTML `<audio src="url">` **không thể gửi header Authorization**. Do đó phải dùng `fetch()` với header rồi tạo Blob URL nội bộ. Đây là pattern bắt buộc khi API yêu cầu xác thực mà trình phát media không hỗ trợ.

### Bước 3: Người Dùng Nghe & Gõ Lại (User Input)
- Người dùng bấm Play trên audio player, nghe đi nghe lại không giới hạn.
- Gõ lại nội dung vào `<textarea>` bên dưới.
- Frontend validate: Không được để trống nội dung.
- Bấm nút **"Nộp bài điền từ"** → Gọi API `POST /listening/submit-dictation` với Payload:
  ```json
  { "exerciseId": 3, "content": "Although the weather was..." }
  ```

### Bước 4: Backend Xử Lý & Chấm Điểm AI (AI Dictation Grading)
- **`listening.controller.js`**: Parse `req.user.id` (qua verifyToken middleware) & nội dung `content`.
- **`listening.service.js → submitDictation()`**:
  1. Validate `content` không rỗng.
  2. Lấy exercise từ DB, kiểm tra `type === 'dictation'`.
  3. Tạo record `listening_submissions` với `status: 'grading'`.
  4. Gọi **`listeningAiService.gradeDictation(level, audioText, userText)`**.

- **`listeningAI.service.js → gradeDictation()`**:
  - Dựng System Prompt chuyên biệt cho Dictation grading:
    - Cung cấp cho AI: Đoạn văn gốc (Original Audio Text) + Đoạn người dùng gõ (User Typed Text).
    - Yêu cầu AI: So sánh từng từ, bỏ qua khác biệt hoa/thường và dấu câu.
    - Tính điểm chính xác 0-100% (correct words / total words).
    - Trích xuất 1-2 từ vựng hay kèm dịch nghĩa Tiếng Việt.
  - Gọi **OpenAI GPT-4o-mini** qua `callLLM()`.
  - Parse JSON response, trả về cấu trúc:
    ```json
    {
      "scores": { "total": 85 },
      "errors": [
        { "original": "manged", "correction": "managed", "explanation": "Missing 'a' - past tense -ed" }
      ],
      "suggestions": ["Focus on past tense endings like -ed"],
      "newWords": [
        { "word": "hiking", "definition": "walking in nature", "translation": "đi bộ đường dài", "example": "...", "level": "B1" }
      ]
    }
    ```

### Bước 5: Xử Lý Biên (Edge Cases)
- **Nội dung rỗng/gibberish**: AI trả `scores.total = 0`, errors rỗng. Frontend hiện cảnh báo đỏ: "Không thể nhận diện nội dung."
- **AI timeout/crash**: Backend bắt Exception, đánh dấu submission `status: 'error'`, trả HTTP 400 với thông báo lỗi rõ ràng.
- **TTS API lỗi**: Frontend hiện dòng chữ "❌ Không thể tải file âm thanh" thay vì player rỗng.

### Bước 6: Lưu DB Phản Hồi & Từ Vựng (Database Commit)
- **Cập nhật Submissions**: `UPDATE listening_submissions SET score_total=$1, feedback=$2, new_words=$3, status='graded'`.
- **Quét Từ Vựng (Batch Insert)**: Duyệt mảng `newWords`, insert vào bảng `user_vocabulary` (CHUNG với Writing module).
  - Dùng `ON CONFLICT (user_id, word) DO UPDATE` để không trùng từ cũ.
  - Field `source = 'listening'` để phân biệt từ đến từ bài nghe vs bài viết.
- Trả response JSON submission đầy đủ cho Frontend.

### Bước 7: Phản Hồi Trực Quan (Display Feedback)
- Frontend nhận submission, chuyển Component View sang `<ListeningFeedbackPanel />`.
- Hiển thị:
  1. **Độ Chính Xác (%)**: Số lớn màu tím, text-center nổi bật.
  2. **Sửa Lỗi Nghe**: Card gạch bỏ đỏ (`line-through`) từ sai của user ↔ Từ đúng xanh lá kèm giải thích.
  3. **📜 Transcript Gốc**: Hiển thị toàn bộ đoạn văn gốc để user tự kiểm chứng.
  4. **Gợi Ý Cải Thiện Listening**: Do AI đề xuất (ví dụ: "Tập trung vào phụ âm cuối 's' và 'ed'").
  5. **Từ Vựng Hay**: Card hiển thị từ mới kèm dịch Tiếng Việt, đã tự động lưu vào Sổ SRS.
- Hai nút hành động: **"← Về danh sách"** và **"🎧 Nghe lại / Làm lại"**.

---

## 4. Cấu Trúc CSDL (Database Schema)

### Bảng `listening_exercises` — Ngân hàng đề nghe
| Cột | Kiểu | Mô tả |
|-----|-------|-------|
| `id` | SERIAL PK | ID bài tập |
| `level` | VARCHAR(2) | A1, A2, B1, B2, C1, C2 |
| `type` | VARCHAR(50) | `dictation` hoặc `multiple_choice` |
| `title` | VARCHAR(255) | Tiêu đề bài nghe |
| `audio_text` | TEXT | **Đoạn văn bản gốc** - Dùng để tạo TTS và đối chiếu chấm điểm |
| `audio_url` | VARCHAR(255) | URL file audio tĩnh (nếu có, hiện tại dùng TTS realtime) |
| `hints` | JSONB | Gợi ý cho người nghe |
| `questions` | JSONB | Câu hỏi (dành cho mode multiple_choice tương lai) |
| `is_active` | BOOLEAN | Kích hoạt/ẩn bài tập |

### Bảng `listening_submissions` — Bài nộp của user
| Cột | Kiểu | Mô tả |
|-----|-------|-------|
| `id` | SERIAL PK | ID submission |
| `user_id` | INT FK→users | Người nộp bài |
| `exercise_id` | INT FK→listening_exercises | Bài tập tương ứng |
| `user_answers` | JSONB | `{ text: "nội dung user gõ" }` |
| `score_total` | DECIMAL(5,2) | Điểm % chính xác (0-100) |
| `feedback` | JSONB | `{ errors: [...], suggestions: [...], original_audio_text: "..." }` |
| `new_words` | JSONB | Mảng từ vựng AI trích xuất |
| `status` | VARCHAR(20) | `submitted` → `grading` → `graded` hoặc `error` |

### Bảng `user_vocabulary` — Sổ Từ Vựng SRS (DÙNG CHUNG với Writing)
| Cột đặc biệt | Mô tả |
|---------------|-------|
| `source` | `'writing'` hoặc `'listening'` — Phân biệt từ đến từ kỹ năng nào |
| `translation` | Bản dịch Tiếng Việt do AI cung cấp |
| `next_review_at` | Thời điểm ôn tập tiếp theo (SRS algorithm) |
| `mastery` | Cấp độ thuộc lòng (0→5) — Quyết định khoảng cách ôn |

---

## 5. Cây Thư Mục Module (File Structure)

```
backend/src/modules/listening/
├── controllers/
│   └── listening.controller.js     # HTTP handlers (getExercises, getAudio, submitDictation)
├── services/
│   ├── listening.service.js        # Business logic + OpenAI TTS integration
│   └── listeningAI.service.js      # AI Grading dictation (GPT-4o-mini)
├── repositories/
│   └── listening.repository.js     # SQL queries (PostgreSQL)
└── routes/
    └── listening.routes.js         # Express Router (verifyToken middleware)

frontend/src/features/listening/
├── ListeningTab.js                 # Main dashboard (chọn level, xem thống kê)
├── listeningService.js             # API client (axios calls)
└── components/
    ├── ListeningEditor.js          # Audio player + textarea input
    └── ListeningFeedbackPanel.js   # Kết quả chấm bài nghe
```

---

## 6. Dòng Chảy Chi Phí API (API Cost Flow)

Mỗi lần người dùng làm 1 bài nghe Dictation, hệ thống gọi **2 API OpenAI**:

| Bước | API | Model | Ước tính chi phí |
|------|-----|-------|-----------------|
| Phát âm thanh | `POST /v1/audio/speech` | `tts-1` | ~$0.015 / 1000 ký tự |
| Chấm điểm Dictation | `POST /v1/chat/completions` | `gpt-4o-mini` | ~$0.00015 / 1000 token |

**Ví dụ thực tế**: 1 bài B1 (~20 từ, ~150 ký tự):
- TTS: 150 chars × $0.015/1000 = **$0.00225**
- Grading: ~500 tokens × $0.00015/1000 = **$0.000075**
- **Tổng: ~$0.0023/bài** (~50 VNĐ/bài)

---

## 7. So Sánh Listening vs Writing Module

| Tiêu chí | Writing Practice | Listening Practice |
|----------|-----------------|-------------------|
| Input của User | Viết tự do từ prompt | Gõ lại từ audio |
| AI sinh nội dung | Không (User tự viết) | Có (TTS sinh audio) |
| AI chấm điểm | 4 tiêu chí (Grammar, Vocab, Coherence, Task) | 1 tiêu chí (Accuracy %) |
| Số API calls/bài | 1 (GPT grading) | 2 (TTS + GPT grading) |
| Cơ chế chấm | Phân tích ngữ pháp sâu | Đối chiếu chuỗi text |
| Sổ từ vựng | ✅ Dùng chung `user_vocabulary` | ✅ Dùng chung `user_vocabulary` |
| Streak system | ✅ Có (writing_streaks) | ❌ Chưa có (dùng chung streak tương lai) |

---

## 8. Tổng Kết

Sức mạnh của module Listening Practice nằm ở vòng lặp khép kín: **Nghe (TTS) → Gõ (Dictation) → Chấm (AI) → Học từ (SRS)**. Kiến trúc Clean Architecture (Controller → Service → Repository) giúp module hoàn toàn độc lập với Writing, chỉ chia sẻ bảng `user_vocabulary` để tạo nên kho từ vựng đa kỹ năng thống nhất. Hệ thống sử dụng Blob URL pattern để giải quyết giới hạn kỹ thuật của HTML5 Audio không hỗ trợ Authorization header — đây là kiến thức quan trọng để mở rộng cho Speaking module trong tương lai.
