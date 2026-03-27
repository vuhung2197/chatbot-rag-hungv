# Chatbot Capabilities

## Các loại câu hỏi chatbot có thể xử lý

### 1. GREETING - Chào hỏi & Giao tiếp xã hội
- "Xin chào", "Hi", "Hello"
- "Cảm ơn", "Thanks"
- "Bạn khỏe không?", "Bạn là ai?"

### 2. USER_PROGRESS - Tiến độ học tập cá nhân (CHI TIẾT)

**Từ vựng:**
- "Tôi đã học bao nhiêu từ vựng?"
- "Số từ đã thành thạo của tôi?"
- "Cho tôi xem từ vựng theo level A1, A2, B1..."
- "Từ vựng của tôi theo chủ đề nào?"
- "Từ vựng gần đây tôi học là gì?"

**4 Kỹ năng (Listening, Reading, Speaking, Writing):**
- "Điểm listening của tôi thế nào?"
- "Tôi đã hoàn thành bao nhiêu bài reading?"
- "Điểm trung bình speaking của tôi?"
- "Xem tiến độ writing của tôi"

**Tổng hợp:**
- "Cho tôi xem tiến độ học tập tổng quan"
- "Tôi đã học được gì?"
- "Kết quả học tập của tôi"

### 3. LIVE_SEARCH - Thông tin thời gian thực
- "Giá vàng hôm nay"
- "Thời tiết Hà Nội"
- "Tin tức mới nhất về..."
- "Tỷ giá USD hiện tại"
- "Kết quả bóng đá đêm qua"

### 4. KNOWLEDGE - Kiến thức từ database nội bộ
- "RAG là gì?"
- "Cách dùng React useEffect"
- "Giải thích về..."
- "Lịch sử Việt Nam"
- Các câu hỏi về định nghĩa, kỹ thuật, coding

### 5. OFF_TOPIC - Từ chối trả lời
- Chính trị nhạy cảm
- Tôn giáo cực đoan
- Nội dung bị cấm

## Thông tin chi tiết USER_PROGRESS trả về

**TỪ VỰNG:**
- Tổng số từ và từ đã thành thạo (mastery ≥ 3)
- Phân loại theo level (A1, A2, B1, B2, C1, C2)
- Phân loại theo chủ đề (top 5)
- 5 từ vựng gần đây với mức độ mastery

**LISTENING:**
- Số bài đã hoàn thành
- Điểm trung bình (score_total)

**READING:**
- Số bài đã hoàn thành
- Điểm trung bình (score_total)

**SPEAKING:**
- Số bài đã hoàn thành
- Điểm trung bình (score_total)

**WRITING:**
- Số bài đã hoàn thành
- Điểm trung bình (score_total)

## Cách hoạt động

1. **Intent Classification**: Chatbot phân loại câu hỏi vào 1 trong 5 loại trên
2. **Routing**: Dựa vào intent, chatbot chọn phương thức xử lý phù hợp
3. **Response**: Trả về câu trả lời cho người dùng

## Cấu hình

- Intent Router: `backend/services/intentRouter.js`
- Chat Service: `backend/src/modules/chat/services/chat.service.js`
- Stream Handler: `_streamUserProgress()` - Xử lý real-time streaming
- Non-stream Handler: `_handleProgressQuery()` - Xử lý request thông thường
