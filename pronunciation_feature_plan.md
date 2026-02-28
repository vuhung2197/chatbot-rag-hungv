# Kế Hoạch Phát Triển Tính Năng: Luyện Phát Âm IPA (Pronunciation Practice)

## 1. Tổng quan tính năng (Overview)
*   **Mục tiêu:** Giúp người học làm chủ 44 âm IPA tiếng Anh (Nguyên âm đơn, nguyên âm đôi, phụ âm trống/hữu thanh).
*   **Điểm nhấn:** 
    *   Cung cấp **"Bảng IPA tương tác"** (nghe mẫu khi click).
    *   Hệ thống **"Nhận diện lỗi phát âm (Phoneme-level feedback)"** chỉ ra lỗi sai chi tiết về khẩu hình miệng, cách đặt lưỡi, luồng hơi.

## 2. Thiết kế Cơ Sở Dữ Liệu (Schema Updates)
*   Thêm `type` mới vào bảng `speaking_topics`: `'pronunciation'`.
*   Tạo thêm bảng `ipa_phonemes` để quản lý danh sách 44 âm IPA, phân loại (Vowels, Consonants, Diphthongs), mô tả cách phát âm và video/audio hướng dẫn.
*   Tạo bảng `pronunciation_exercises` hoặc mở rộng `speaking_topics` để lưu trữ:
    *   Âm đơn (Isolation).
    *   Cặp từ trái ngược (Minimal Pairs) chống nhầm lẫn: ví dụ *ship - sheep*, *sink - think*.
    *   Câu xoắn lưỡi (Tongue Twisters).

## 3. Luồng trải nghiệm người dùng (UX/UI Flow)
*   **Bước 1: Bảng IPA Tương Tác**
    *   Render Bảng IPA chuẩn. Click để nghe phát âm mẫu, xem video demo khẩu hình miệng. Hiển thị tiến độ hoàn thành cho từng âm.
*   **Bước 2: Phòng Luyện Tập**
    *   Level 1: Đọc từ đơn lẻ chứa âm đó.
    *   Level 2: Đọc *Minimal Pairs* để hệ thống test lỗi sai dây chuyền.
    *   Level 3: Đọc *Tongue Twisters* để rèn độ trôi chảy.
*   **Bước 3: Đánh giá thời gian thực (Real-time Feedback)**
    *   Theo dõi waveform. Chấm điểm từng từ.
    *   Cung cấp phản hồi dạng text/âm thanh chỉ ra mẹo sửa lỗi ngay lập tức.

## 4. Giải pháp Công Nghệ (Tech Stack)
*   **Thu âm & Xử lý:** Chuyển đổi âm thanh người dùng gửi lên.
*   **Đánh giá (Assessment):**
    *   Sử dụng API Whisper (hoặc Microsoft Azure Speech to Text / Pronunciation Assessment for phoneme-level metrics).
    *   Đẩy kết quả transcribe (bao gồm điểm phoneme nếu có) nhúng vào prompts của LLM (GPT-4o/Claude) để generate feedback chi tiết và phân hóa ngữ liệu cho người học.

## 5. Gamification (Tăng tính cam kết)
*   **Thử thách "Vua Uốn Lưỡi":** Bảng xếp hạng điểm Tongue Twisters.
*   **Huy Hiệu Phonics (Phoneme Cards):** Thu thập 44 thẻ IPA Mastery để hoàn thiện bộ sưu tập và hiển thị trên hồ sơ.

---
**Các bước triển khai:**
1. Cập nhật Database Schema (Thêm loại hình luyện tập pronunciation và bảng IPA).
2. Xây dựng API Backend (Lấy danh sách IPA, nộp bài ghi âm, kết nối AI chấm điểm độ chuẩn xác của âm).
3. Xây dựng UI/UX Frontend (Bảng IPA, Component thu âm và hiển thị điểm/feedback).
