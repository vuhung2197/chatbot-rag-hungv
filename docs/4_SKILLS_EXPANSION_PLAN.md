# Kế Hoạch Tích Hợp Luyện Đầy Đủ 4 Kỹ Năng (Nghe - Nói - Đọc - Viết) cho English Chatbot

Dựa trên thành công của module **Writing Practice** hiện tại, dự án English Chatbot hoàn toàn có thể mở rộng để trở thành một nền tảng EdTech toàn diện luyện cả 4 kỹ năng (Nghe, Nói, Đọc, Viết) cho người dùng.

Dưới đây là ý tưởng chi tiết về lộ trình và công nghệ để triển khai:

---

## 1. Tận dụng Kiến Trúc Hiện Có (Leveraging Existing Architecture)

Chúng ta có thể tái sử dụng tới 70% kiến trúc của Writing Practice để xây dựng các kỹ năng khác:

*   **Database Schema:** Bảng `writing_exercises` có thể được mở rộng thành `exercises` (thêm field `skill_type`).
*   **AI Engine (writingAiService):** Tái sử dụng luồng gọi OpenAI `gpt-4o-mini`, chỉ cần thay đổi `system prompt`.
*   **Streak & Vocabulary System:** Hệ thống điểm danh (streak) và thẻ ôn tập (flashcard/SRS) hoàn toàn dùng chung được cho mọi kỹ năng.

---

## 2. Kế Hoạch Cho Từng Kỹ Năng Mới

### 👂 Kỹ Năng 1: Luyện Nghe (Listening Practice)

**Ý Tưởng Cốt Lõi:** Cung cấp audio chân thực kèm câu hỏi trắc nghiệm hoặc điền từ, AI đánh giá mức độ hiểu và giải thích đáp án.

**Triển khai kỹ thuật:**
1.  **Nguồn Âm Thanh (Text-to-Speech):** Sử dụng các API Text-to-Speech cao cấp (như OpenAI TTS hoặc ElevenLabs) để tạo file MP3 từ các đoạn hội thoại có sẵn (hoặc do AI sinh ra theo chủ đề).
2.  **Dạng Bài Tập:**
    *   **Nghe & Chọn:** Trắc nghiệm hiểu ý chính (Multiple choice).
    *   **Nghe & Điền (Dictation):** Cung cấp transcript bị đục lỗ, user nghe và gõ lại từ còn thiếu.
3.  **Vai Trò Của AI:**
    *   AI không cần "chấm điểm" (vì hệ thống có thể đối chiếu đáp án cứng).
    *   **Tuy nhiên**, AI có thể hoạt động như "Giáo viên giải thích": Nếu user sai, gửi câu của user + transcript cho AI để AI giải thích tại sao đáp án lại như vậy (ví dụ: *"Bạn nghe nhầm từ 'can't' thành 'can' vì nối âm..."*).

### 🗣️ Kỹ Năng 2: Luyện Nói (Speaking Practice - Voice Chat)

**Ý Tưởng Cốt Lõi:** Đàm thoại thời gian thực (Real-time Conversation) hoặc Nhại giọng (Shadowing) có chấm điểm phát âm (Pronunciation Assessment).

**Triển khai kỹ thuật:**
1.  **Thu mâm (Microphone) ở Frontend:** Cần cấp quyền truy cập Mic trên React để ghi âm giọng user và gửi file audio/blob stream xuống backend.
2.  **Speech-to-Text (STT):**
    *   Kết nối với **OpenAI Whisper API** để chuyển giọng nói của user thành văn bản.
3.  **Chấm điểm Phát âm (Pronunciation):**
    *   Đưa đoạn text do Whisper nhận diện được đối chiếu với đoạn text gốc (Shadowing).
    *   Hoặc sử dụng dịch vụ chuyên dụng chấm điểm độ trôi chảy (Fluency), nhịp điệu (Prosody), ví dụ *Azure Speech Services (Pronunciation Assessment feature)*.
4.  **Hội thoại Mở (Roleplay):**
    *   User nói -> STT chuyển thành chữ -> Gửi lên GPT Text để xin câu trả lời -> Dùng TTS đọc lên -> User nghe phản hồi. (Mô phỏng 1 buổi phỏng vấn IELTS).

### 📖 Kỹ Năng 3: Luyện Đọc (Reading Practice)

**Ý Tưởng Cốt Lõi:** Đọc hiểu văn bản theo đúng trình độ (CEFR A1-C2) kết hợp tra từ điển click-and-play.

**Triển khai kỹ thuật:**
1.  **Khởi tạo nội dung thích ứng (Adaptive Content):**
    *   Sử dụng AI để tự động tạo ra các bài báo (Articles/Stories) đa dạng độ dài, ngữ pháp tùy chỉnh theo level của người dùng.
2.  **Click-to-Translate (Đọc mượt mà):**
    *   Frontend bọc từng từ (word highlight) trong bài đọc bằng các thẻ `<span>`. Khi người dùng click vào từ vựng mới, popup hiện ra nhanh giải nghĩa (lấy từ dictionary API hoặc AI) và có nút **"Lưu vào Sổ Từ SRS"**.
3.  **Tóm tắt & Câu Hỏi:**
    *   Sau bài đọc, AI đặt 3-5 câu hỏi dạng True/False/Not Given (phong cách IELTS) để kiểm tra Reading Comprehension.
    *   AI chấm điểm và giải thích logic nếu user chọn sai.

---

## 3. Lộ Trình Triển Khai Thực Tế (Phased Roadmap)

*Thay vì làm tất cả cùng lúc, nên làm dần dần để giữ dự án ổn định.*

### Giai đoạn 1: Luyện Đọc & Tra Từ Rảnh Tay (Tháng tới)
- Dễ triển khai nhất, không nặng về hạ tầng. Tận dụng thẳng kho từ vựng (Sổ SRS) hiện tại. User click từ lạ trong bài đọc -> Chảy thẳng vào sổ flashcard chờ ôn.
- Thay vì gọi API, có thể cho AI tự sinh bài đọc theo đúng level user đang chọn.

### Giai đoạn 2: Luyện Nghe Cơ Bản (1-2 Tháng sau)
- Tích hợp Text-to-Speech API.
- Tập trung vào tính năng "Dictation" (Nghe chép chính tả). Đây là tính năng rất hiếm app có và dễ code: Chỉ cần đối chiếu chuỗi text người dùng nhập với Text gốc của Audio.

### Giai đoạn 3: Hội thoại Speaking AI (Khó Nhất - Từ tháng 3++)
- Requires quản lý luồng Audio Streaming tốt giữa Client-Server.
- Chi phí API tăng cao do gọi liên hoàn STT (nhận diện) -> LLM (phân tích) -> TTS (trả lời). Cần tối ưu kỹ.

## 4. Giao diện (UI) hợp nhất "4-Skill Dashboard"

Lúc này, Màn hình Trang Chủ / WritingTab nên được tân trang lại thành **"Học Viện (Academy)"**, chia làm 4 góc phần tư (hoặc lưới 4 nút lớn):
- 🎧 **Listening Center** (Phá khóa audio)
- 🗣️ **Speaking Club** (Voice Role-play)
- 📖 **Reading Corner** (Daily Articles)
- ✍️ **Writing Studio** (Cái chúng ta đang có đợt này)

Điểm kinh nghiệm (XP) & Lỗi sẽ dùng chung để vẽ ra 1 "Biểu đồ Mạng nhện" (Radar Chart) hiện lên tổng quát điểm yếu và điểm mạnh của người học!
