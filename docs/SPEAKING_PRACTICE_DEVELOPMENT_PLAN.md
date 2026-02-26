# KẾ HOẠCH PHÁT TRIỂN TÍNH NĂNG "SPEAKING PRACTICE" 🎙️

Tính năng **Speaking Practice (Luyện nói)** là module kỹ năng cuối cùng để hoàn thiện hệ sinh thái học Tiếng Anh toàn diện (Nghe - Nói - Đọc - Viết). Mục tiêu là tạo ra môi trường luyện nói không áp lực, được AI phản hồi ngay lập tức về phát âm, từ vựng và ngữ pháp.

---

## 1. 🌟 CÁC TÍNH NĂNG CỐT LÕI (MVP)

Để đảm bảo hiệu quả kỹ thuật và chi phí, hệ thống sẽ chia Speaking thành 2 thể loại chính:
1. **Shadowing (Đọc nhại/Nhại âm):** Máy đọc mẫu một câu/đoạn văn -> User ghi âm đọc theo -> AI so sánh và chấm điểm phát âm xem đọc có đúng/thiếu từ nào không.
2. **Topic Speaking (IELTS/Giao tiếp tự do):** Máy hỏi một câu (VD: "What is your favorite hobby?") -> User tự suy nghĩ và ghi âm trả lời -> AI phân tích câu trả lời (Từ vựng, Ngữ pháp, Độ mạch lạc).

---

## 2. 🗺️ USER FLOW (LUỒNG NGƯỜI DÙNG)

### Luồng Shadowing (Luyện Phát Âm)
1. User chọn bài tập "Shadowing" theo Level (A1, A2...).
2. Màn hình hiển thị câu Tiếng Anh + Nút Play (để nghe audio giọng bản xứ chuẩn của AI).
3. User bấm vành tai nghe kỹ, sau đó bấm nút **Ghi âm (🎙️)** và đọc lại câu đó.
4. User bấm **Dừng & Nộp bài**.
5. Màn hình hiện kết quả: Chấm điểm % độ giống nhau, bôi đỏ các từ đọc sai/bị bỏ sót. Nút lưu từ vựng khó vào Sổ tay.

### Luồng Topic Speaking (Phản Xạ / IELTS)
1. User chọn chủ đề (VD: Travel, Work, IELTS Part 1).
2. Màn hình hiển thị + đọc to câu hỏi: *"Describe a place you visited recently."*
3. User bấm **Ghi âm** và nói câu trả lời của mình (tối đa 2-3 phút).
4. Nhận bảng điểm chi tiết từ AI:
   - **Bản text (Transcript):** Chính xác những gì User vừa nói (để User tự nhìn lại lỗi lắp bắp).
   - **Fluency:** Độ lưu loát.
   - **Vocabulary/Grammar:** Nhận xét lỗi ngữ pháp và gợi ý từ vựng "xịn" hơn.

---

## 3. ⚙️ KIẾN TRÚC KỸ THUẬT (TECHNICAL ARCHITECTURE)

**Luồng xử lý (Audio Pipeline):**
Đây là bài toán khó nhất của Speaking. Chúng ta không đưa thẳng Audio cho GPT chấm vì rất đắt và thiếu ổn định. Thay vào đó dùng mô hình **Whisper**:

`User Mic` --(Blob/WebM)--> `Frontend` --(FormData multipart)--> `Backend /upload` -> `Lưu file tạm` -> `OpenAI Whisper API` -> `Lấy được Text (Transcript)` -> `OpenAI GPT-4o-mini` -> `Đánh giá & Trả điểm`

* **Frontend:**
  - Dùng `MediaRecorder API` tích hợp sẵn trong trình duyệt để ghi âm.
  - Hiển thị hiệu ứng sóng âm (Waveform) đơn giản trong lúc nói.
  - Chống ồn cơ bản. Gửi file `audio/webm` (Chrome) hoặc `audio/mp4` (Safari) về Backend.
* **Backend (`multer` + `form-data`):**
  - Nhận file audio từ Frontend bằng thư viện `multer`.
  - Gửi file này sang end-point `v1/audio/transcriptions` (OpenAI Whisper).
  - Nhận lại Transcript. Chuyển Transcript sang luồng GPT-4o chấm điểm.
* **Database (PostgreSQL):**
  - Lưu trữ URL của file Audio (nếu dùng Cloud) hoặc chỉ lưu Transcript để tiết kiệm lưu trữ dung lượng ổ cứng. Ở MVP, **chỉ lưu Transcript** là đủ, Audio xử lý xong có thể xóa để đỡ tốn bộ nhớ server.

---

## 4. 🗄️ DATABASE SCHEMA DỰ KIẾN (PostgreSQL)

**Bảng: `speaking_topics` (Kho câu hỏi/bài đọc)**
* `id` (PK)
* `type` (ENUM: 'shadowing', 'topic')
* `level` (A1 - C2)
* `prompt_text` (Câu văn để đọc theo, hoặc Câu hỏi để trả lời)
* `audio_url` (Link file audio gốc đọc mẫu)
* `is_active`

**Bảng: `speaking_submissions` (Lịch sử làm bài)**
* `id` (PK)
* `user_id` (FK)
* `topic_id` (FK)
* `audio_url` (Có thể lưu tạm hoặc nil nếu không lưu file)
* `transcript` (Nội dung Whisper bóc băng từ giọng nói của User)
* `score_total` (Điểm tổng quan)
* `feedback` (JSONB) chứa chi tiết lỗi, gợi ý nâng cấp câu
* `status` (ENUM: 'transcribing', 'grading', 'completed')

---

## 5. 🔌 API ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/speaking/topics?type=shadowing&level=A1` | Lấy danh sách câu để luyện tập. |
| GET | `/speaking/topics/:id` | Lấy chi tiết 1 bài. |
| POST | `/speaking/submit-audio` | Nhận file Audio (multipart/form-data). Trả về Transcript & Điểm chấm từ AI ngay lập tức. |

---

## 6. 🧠 THIẾT KẾ AI PROMPT

### Bước 1: Whisper Transcribe (Cứng)
Gửi request lên OpenAI Whisper. Mẹo nhét parameter `prompt`:
```json
{
  "file": "<audio_stream>",
  "model": "whisper-1",
  "language": "en",
  "prompt": "Umm, let me think, like, you know..." // Giúp Whisper giữ lại các từ ngập ngừng thay vì tự ý che đi, cảnh báo độ trôi chảy
}
```

### Bước 2: GPT-4o-mini Evaluator (Cho bài Topic Speaking)
**System Prompt:**
```text
You are an IELTS Speaking Examiner. Evaluate the given user's speech transcript answering the question: "{question}".
The user's level is {level}.

User's exact transcript: "{transcript}"

Tasks:
1. Estimate a score out of 100 based on vocabulary, grammar, and relevance.
2. Point out completely wrong grammatical sentences or awkward phrases (Errors).
3. Suggest better, natural-sounding ways to express their ideas at a native level (Improvements).
4. Identify 2-3 advanced vocabulary words they COULD HAVE USED instead of basic words.

Return JSON format:
{
  "score": 75,
  "errors": [{ "mistake": "I go yesterday", "correction": "I went yesterday" }],
  "improvements": ["Instead of saying 'very good', you can say 'excellent' or 'outstanding'."],
  "advanced_vocabulary": [{ "word": "captivating", "meaning": "very interesting or attractive", "translation": "thu hút" }]
}
```

---

## 7. 💵 BÀI TOÁN CHI PHÍ (API COST ANALYSIS)

Khác với Reading/Writing, Speaking tốn chi phí Audio:
* **Whisper API (Bóc băng):** $0.006 / 1 phút âm thanh.
  * Trung bình 1 user nói 1 phút rưỡi (90s) = **$0.009 (~230 VNĐ)**.
* **GPT-4o-mini (Chấm điểm transcript):**
  * Tốn khoảng 1000 tokens (Input + Output) = **$0.0003 (~8 VNĐ)**.
* **TTS API (Giọng mẫu câu hỏi):** Đã tính chung vào kho tạo sẵn, user nghe lại không mất phí (như module Listening).

**=> TỔNG CHI PHÍ / BÀI SPEAKING:** ~250 VNĐ. Rẻ hơn Listening, đắt hơn Writing một chút nhưng mang lại giá trị cao nhất!

---

## 8. 🚀 LỘ TRÌNH TRIỂN KHAI (IMPLEMENTATION PHASES)

*   **Phase 1: Recording Engine & Cơ sở hạ tầng (1.5 Ngày)**
    *   Tạo bảng Database `speaking_topics`, `speaking_submissions`.
    *   Viết Frontend React: Wrap `MediaRecorder` API thành một Hook `useAudioRecorder`, làm nút Nhấn để thu âm, hiển thị đồng hồ bấm giờ (00:00 -> 02:00).
    *   Backend config `multer` để nhận file Upload.
*   **Phase 2: Whisper Integration (1 Ngày)**
    *   Cắm API OpenAI Whisper vào Backend. Nhận file `webm/mp4` -> gửi đi -> trả về Transcript.
    *   Test mic, test giọng bị ồn xem Whisper bóc chuẩn không.
*   **Phase 3: AI Grader & Feedback UI (1 Ngày)**
    *   Thêm Prompt chấm điểm từ Transcript.
    *   Hiển thị màn hình Results: Score, Transcript bôi màu từ sai, List từ vựng gợi ý.
*   **Phase 4: Hoàn Thiện & Đẩy dữ liệu (1 Ngày)**
    *   Seed khoảng 20 câu hỏi IELTS Part 1, Part 2.
    *   Thiết kế UI Dashboard cho Speaking Tab.

---

## 9. ⚠️ CÁC RỦI RO & CÁCH KHẮC PHỤC

1. **Khác biệt định dạng thu âm giữa các trình duyệt:**
   - Chrome ghi âm ra `.webm`, Safari ra `.mp4` hoặc `.m4a`.
   - Giải pháp: OpenAI Whisper API hỗ trợ sắn rất nhiều định dạng (mp3, mp4, mpeg, mpga, m4a, wav, webm). Nên có thể quăng thẳng blob của Browser cho Whisper mà không cần qua thư viện `ffmpeg` convert trên server (rất tốn RAM và thời gian).
2. **Kích thước file Audio lớn gây sập mạng:**
   - Giới hạn Frontend chỉ cho thu âm max 2 phút. Nếu vượt quá, tự động Stop.
3. **Độ trễ API:**
   - Việc đẩy file Audio lên backend, backend đẩy sang OpenAI Whisper, rồi đẩy text cho GPT chấm sẽ tốn tới 3-5s. Cần UI Loading (Spinner) cực xịn ở Frontend để User không tưởng lag mà F5.

---
*Kế hoạch này đảm bảo tính khả thi rất cao, tái sử dụng được triệt để AI Pipeline đã xây dựng trước đó, đồng thời mang lại trải nghiệm tương tác (voice) đẳng cấp nhất cho app.*
