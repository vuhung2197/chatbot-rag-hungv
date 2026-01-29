# Kế Hoạch Triển Khai: Hệ Thống Soi Cầu Sic Bo (Trend Analysis)

## 1. Mục Tiêu
Cung cấp cho người chơi công cụ trực quan để theo dõi lịch sử và dự đoán kết quả (Soi cầu), tăng tính tương tác và giữ chân người chơi lâu hơn.

## 2. Các Loại Biểu Đồ Cần Làm

### A. Biểu Đồ Lịch Sử (Bead Plate / Road Map)
- **Mô tả**: Một lưới (Grid) các chấm tròn thể hiện kết quả quá khứ.
- **Quy tắc hiển thị**:
  - **Tài (Big)**: Chấm Đỏ (hoặc Vàng). Ký hiệu: T
  - **Xỉu (Small)**: Chấm Xanh (hoặc Đen). Ký hiệu: X
  - **Bão (Triple)**: Chấm Xanh lá hoặc Icon sao.
- **Logic**: Điền từ trên xuống dưới, từ trái qua phải.

### B. Biểu Đồ Diễn Biến (Score Line Chart)
- **Mô tả**: Biểu đồ đường (Line Chart) nối các điểm tổng (Total Score 3-18) của các phiên gần nhất.
- **Công dụng**: Giúp người chơi nhìn thấy biên độ dao động của xúc xắc.
- **Phân vùng**:
  - Vùng Xỉu: 3 - 10
  - Vùng Tài: 11 - 18

### C. Thống Kê Phiên (Session Stats)
- Tổng số ván.
- % Tài / % Xỉu / % Bão trong 100 ván gần nhất.
- 5 ván gần nhất chi tiết (Ví dụ: 2-3-5 (10) Xỉu).

---

## 3. Kiến Trúc Kỹ Thuật

### Frontend (React)
- **Library**: Sử dụng `recharts` (hoặc Chart.js) để vẽ Line Chart mượt mà.
- **Components Mới**:
  - `GameHistoryBoard`: Component hiển thị lưới Bead Plate (Dùng CSS Grid/Flexbox thuần để nhẹ và dễ custom).
  - `TrendChart`: Component dùng `recharts` hiển thị đường diễn biến tổng điểm.
  - `StatsPanel`: Hiển thị thanh bar tỷ lệ % và lịch sử chi tiết 5 ván.

### Backend (Node.js)
- **API Update**: Mở rộng endpoint `GET /api/games/taixiu/history`.
  - Thêm params `limit=50` hoặc `limit=100` để lấy dữ liệu vẽ biểu đồ.
  - Trả về danh sách đã sắp xếp `[ { session_id, dice1, dice2, dice3, total, result }, ... ]`.
- **Performance**: Đánh index kỹ lưỡng cột `created_at` trong bảng `game_sessions` để query lịch sử cực nhanh.

---

## 4. Các Bước Thực Hiện (Workflow)

### Bước 1: Setup Backend
1.  Đảm bảo Index Database cho việc query lịch sử.
2.  Kiểm tra API `getHistory`, đảm bảo trả về đủ trường `dice` và `total_score`.

### Bước 2: Setup Frontend Libraries
1.  Cài đặt thư viện: `npm install recharts lucide-react` (Lucide cho icon).

### Bước 3: Phát triển UI Components
1.  **Tạo `TrendChart.js`**: Dùng Recharts vẽ trục Y (3-18) và trục X (Phiên), đường Line nối các điểm.
    - Tô màu nền phân biệt vùng Tài/Xỉu.
2.  **Tạo `RoadMap.js`**:
    - Xử lý mảng lịch sử thành ma trận lưới (ví dụ 5 hàng ngang, 20 cột dọc).
    - Render các chấm màu tương ứng.

### Bước 4: Tích hợp vào `TaixiuGame.js`
1.  Thêm nút "Soi Cầu" (Trend) để bật Modal hoặc mở rộng Panel bên dưới bàn cược.
2.  Kết nối API lấy dữ liệu Realtime (mỗi khi hết ván, cập nhật biểu đồ ngay lập tức).

## 5. Timeline Dự Kiến
- **Backend API Check**: 15 phút.
- **Frontend Chart & RoadMap**: 1 - 1.5 giờ.
- **Testing & Styling**: 30 phút.

---
**Sẵn sàng triển khai ngay khi được phê duyệt.**
