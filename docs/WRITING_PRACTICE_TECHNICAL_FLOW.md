# Luồng Xử Lý Kỹ Thuật: Writing Practice (Thực Hành Viết Tiếng Anh AI)

Tài liệu này mô tả chi tiết luồng xử lý (Data Flow) và kiến trúc từ Frontend đến Backend, tích hợp AI cho tính năng luyện viết tiếng Anh trong dự án English Chatbot.

---

## 1. Giới thiệu Tổng Quan

Tính năng Writing Practice cung cấp môi trường luyện viết dựa trên trình độ sinh viên (CEFR A1 - C2). Hệ thống tự động chấm điểm, sửa lỗi ngữ pháp, đưa ra gợi ý, trích xuất từ vựng mới và lưu trữ vào sổ tay để ôn tập theo thuật toán lặp lại ngắt quãng (Spaced Repetition System - SRS).

### Các thành phần chính phủ từ Frontend (React) tới Backend (Node.js/PostgreSQL/GPT):
1. **Lựa chọn Đề & Soạn Thảo (Frontend: WritingTab & WritingEditor)**
2. **Gửi & Chấm Bài qua AI (Backend: Writing.Service & AI Engine)**
3. **Phân tích Bảng Điểm & Lỗi (Frontend: FeedbackPanel)**
4. **Cơ chế Duy trì Chuỗi (Streak System)**
5. **Sổ Tay Từ Vựng & Flashcard (SRS Vocabulary)**

---

## 2. Chi Tiết Luồng Xử Lý (End-to-End Flow)

### Bước 1: Chọn bài tập (Fetching Exercises)
- **Frontend `WritingTab.js`**: Khi người dùng vào tab "✍️ Writing Practice" và chọn một Level (vd: B1), App gọi `writingService.getExercises('B1')`.
- **Backend `writing.controller.js -> writing.service.js`**: Truy vấn cơ sở dữ liệu bảng `writing_exercises`.
- **Database**: Trả về danh sách ngẫu nhiên hoặc bài tập tương ứng với yêu cầu. Frontend map dữ liệu hiển thị lướt thẻ ngắn: (Loại bài, prompt thu gọn).

### Bước 2: Soạn Thảo (Writing Editor)
- Khách hàng bấm **"Viết bài ngay"**, Frontend chuyển UI sang thẻ `<WritingEditor />`.
- State quản lý số lượng từ thô (`content.trim().split(/\s+/).length`).
- Nút submit khóa chặn nếu text rỗng hoặc dưới 5 chữ (hoặc ngoài threshold bài tập).
- Nút **"Nộp Bài & Chấm Điểm"** gọi API `POST /api/writing/submissions` gửi Payload: 
  `{ exerciseId, content }`.

### Bước 3: Backend Xác Thực & Quản Lý Giới Hạn (Limit Check)
*Tính năng giới hạn số bài học/ngày (`DAILY_LIMITS`) (Đã gỡ bỏ blockcode để Full Access).*
- **`writing.controller.js`**: Parser `req.user.id` (thông qua Auth Middleware) & Nội dung `content`.
- **`writing.repository.js`**: Tạo sơ khởi 1 record vào bảng `writing_submissions` với dữ liệu raw và `status: pending`. Khởi tạo tracking đếm số lượng từ để tích luỹ vào Chuỗi Luyện (Streak).
- Gọi hàm tính toán Streak: Nếu nộp thành công, đếm số ngày liên tục, kích hoạt cấp thêm Badges.

### Bước 4: Xử Lý Máy Học chấm điểm (AI Grading via GPT)
Đây là cốt lõi của tính năng.
- **`writingAiService.gradeSubmission()`**: Gắn nối đối tượng Payload từ User vào 1 Prompt System mẫu (`writing.prompts.js`).
- Phân cách bằng Cấp độ CEFR (vd B1) để định hình kỳ vọng chấm bài cho AI (Đòi hỏi câu phức, từ vựng vừa tầm).
- Gửi Prompt thông qua Open API API (`gpt-4o-mini`).
- **Ép kiểu JSON Schema Output**: AI được lập trình bắt buộc trả luồng dữ liệu dưới dạng JSON tuyệt đối:
  - `scores`: điểm chia đều: Ngữ Pháp, Từ Vựng, Mạch Lạc, Phản Hồi Đề. Tổng trung bình (Total).
  - `errors`: Mảng các đối tượng chứa `{ original, correction, explanation }`.
  - `suggestions`: Mảng gạch đầu dòng các chiến lược.
  - `modelAnswer`: Bài văn mẫu 100 điểm cho Topic đó.
  - `newWords`: **Gom nhặt từ vựng** - Mảng các đối tượng `{ word, definition, translation (Tiếng Việt), example, level }`.

### Bước 5: Xử Lý Biên (Edge Cases) với Rác Văn Bản (Gibberish Defense)
- **Bắt lỗi Timeout/Die API**: Nếu AI chết hoặc trả plaintext hỏng -> Backend Exception văng ra `throw new Error(...)` => Trả HTTP 400. Frontend giữ nguyên trạng thái soạn thảo thay vì văng trang trắng.
- **Rác Nội Dung Xuyên Thủng Vượt Cấp**: Nếu nội dung quá bậy hoặc random (asdasdawq), AI sẽ tự động gán toàn bộ `scores`: `0`, đẩy một cảnh cáo vào mảng `suggestions`.
- Frontend có Render logic dự phòng `?? 0` và check `<FeedbackPanel>` length trống (`scores === 0`) in đỏ cờ cảnh báo: "Không thể nhận diện nội dung".

### Bước 6: Lưu DB Phản Hồi & Từ Vựng (Database Commit)
- **Cập nhật Bảng Submissions**: Lôi kết quả JSON update vào record Submission ban đầu tạo qua DB:
  `UPDATE writing_submissions SET score_total=$1, feedback=$2, new_words=$3 ...`
- **Quét từ Vựng**: Duyệt mảng `newWords` do AI xả ra, gọi vòng lặp (Batch Insert) cắm thẳng vào bảng `user_vocabulary`.
- Dùng kĩ thuật `ON CONFLICT (user_id, word) DO UPDATE` để không trùng từ cũ, hỗ trợ update nghĩa mới.

### Bước 7: Phản Hồi Trực Quan (Display Feedback)
- Backend gửi `Response 200 OK` dạt Payload cực dày.
- Frontend nhận lệnh, chuyển Component View sang `<FeedbackPanel />`.
- Đổ Màu CSS Variables dựa the điểm số Grid, gạch bỏ chữ đỏ (`line-through`) các dòng `originalText` lỗi do AI bóc. 
- Tách một khung Card hiển thị Từ mới ngay lập tức để User thỏa mãn vòng lặp phần thưởng.

### Bước 8: Ôn Tập Flashcard (Spaced Repetition System)
Khi User quay ra Màn Hình chính và ấn Tới mục `Từ Chờ Ôn Thẻ (SRS)`:
- Frontend gọi API `GET /api/writing/vocabulary/review`.
- **Backend check `next_review_at <= NOW()`** ở DB để xuất những từ đã quá hạn chu kỳ nhớ cho User.
- Frontend bưng thẻ FlashCard Component xoay 3D. 
- Action Thẻ có 3 Nút: Sai (1đ) - Tạm Nhớ (3đ) - Thuộc (5đ).
- Báo cáo gửi lên API `POST /api/writing/vocabulary/:id/review`.
- Backend tự kích hoạt thuật toán rút gọn tính điểm (SM-2 variant), đẩy khoảng ngày tiếp theo xuất hiện đi xa hơn (ví dụ: +1 ngày, +3 ngày, +7 ngày... tùy Mastery Level).
- Update DB Bảng Word `next_review_at`. 

---

## 3. Cấu trúc CSDL (Database Schema) Trọng Điểm
Toàn bộ sơ đồ hoạt động xoay quanh 4 Table chính:
1. `writing_exercises`: Lưu sẵn 30+ đề AI.
2. `writing_submissions`: Ghi track chi tiết Điểm và Lỗi.
3. `writing_streaks`: Tracker quá trình làm bài và lưu file "streak freezes".
4. `user_vocabulary`: Kho lưu từ điển SRS cá nhân, field nổi bật `next_review_at`, `mastery` và `translation`.

## 4. Tổng Kết
Sức mạnh của tính năng là đường ống AI tự động móc xích từ Điểm Viết -> Sang Từ Vựng -> Chuyển thành FlashCard (vòng lặp học liên tục). Cách tách bạch Controller, Service và Repository của hệ thống Backend giúp module Writing này độc lập tuyệt đối, gánh tải mượt dễ mở rộng mà không phụ thuộc mã rác.
