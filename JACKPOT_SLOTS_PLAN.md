# 🎰 Kế Hoạch Dự Án: Cyber Slots (Nổ Hũ)

## 1. 🌟 Khái Niệm & Tổng Quan
**Tên Game**: Cyber Slots 2077 (hoặc "Kho Báu AI")
**Chủ Đề**: Cyberpunk / Neon / AI Tương lai. Nền tối với các biểu tượng neon rực rỡ.
**Cơ Chế Chính**: Video Slot 5 Guồng, 3 Hàng (5x3).
**Điểm Nhấn Đặc Biệt**: **Progressive Jackpot (Nổ Hũ Lũy Tiến)** - Một quỹ thưởng chung tăng lên theo mỗi lượt đặt cược trên toàn hệ thống cho đến khi một người chơi may mắn trúng "Giải Đặc Biệt".

---

## 2. ⚙️ Cơ Chế Game

### 2.1. Guồng Quay (Cấu Trúc)
- **Lưới**: 5 Cột (Guồng) x 3 Hàng.
- **Dòng Trả Thưởng (Paylines)**: 20 dòng cố định (Các đường được tính là "Thắng" nếu các biểu tượng trùng khớp).
  - *Ví dụ*: Đường thẳng ngang, hình chữ V, đường Zíc-zắc.

### 2.2. Biểu Tượng & Trả Thưởng (Có Trọng Số)
Mỗi biểu tượng có một "trọng số" (xác suất xuất hiện).
| Biểu Tượng | Loại | Mô Tả | Trả Thưởng (3/4/5 liên tiếp) | Trọng Số (Độ Hiếm) |
|:---|:---|:---|:---|:---|
| **💎 DIAMOND** | **JACKPOT** | Kích hoạt Giải Đặc Biệt nếu 5x trên một dòng | x500 (hoặc Nổ Hũ) | Rất Hiếm (0.1%) |
| **🤖 WILD** | **WILD** | Thay thế cho mọi biểu tượng trừ Diamond | - | Hiếm (2%) |
| **7️⃣ SEVEN** | Cao | Số 7 May Mắn Cổ Điển (Kiểu Neon) | x10 / x50 / x200 | Thấp (5%) |
| **📀 DISK** | Trung Bình | Đĩa Mềm Vàng | x5 / x20 / x80 | Trung Bình (15%) |
| **🍒 CHERRY** | Thấp | Cherry Kỹ Thuật Số | x2 / x5 / x20 | Cao (30%) |
| **🅰️ A / K / Q**| Thấp | Các Chữ Cái | x1 / x3 / x10 | Cao (48%) |

*Lưu ý: Các trọng số quyết định logic `Sinh Ma Trận` ở backend.*

### 2.3. Logic Nổ Hũ Lũy Tiến
1.  **Đóng Góp**: Mỗi lượt quay trích **1%** Số Tiền Cược và cộng vào Quỹ Jackpot Chung trong cơ sở dữ liệu.
2.  **Kích Hoạt**: Nếu người chơi quay được **5 DIAMONDS** trên Dòng Trả Thưởng #1 (Hàng Giữa), họ thắng 100% Quỹ Jackpot.
3.  **Đặt Lại**: Sau khi được trúng, quỹ sẽ đặt lại về "Số Tiền Khởi Tạo" (ví dụ: 1,000,000 hoặc mức cơ bản tương đương VND).

---

## 3. 🏗️ Kiến Trúc Kỹ Thuật

### 3.1. Sơ Đồ Cơ Sở Dữ Liệu (PostgreSQL)

**Bảng: `jackpot_pools`**
| Cột | Kiểu | Mô Tả |
|:---|:---|:---|
| `id` | SERIAL | Khóa Chính (PK) |
| `game_type` | VARCHAR | 'SLOTS_CYBER' |
| `current_amount`| NUMERIC | Số tiền hiện tại trong hũ. |
| `updated_at` | TIMESTAMP | Thời gian cập nhật lần cuối. |

**Bảng: `game_slots_sessions`**
(Lưu trữ mọi lượt quay cho lịch sử & tính minh bạch)
| Cột | Kiểu | Mô Tả |
|:---|:---|:---|
| `id` | UUID | Khóa Chính (PK) |
| `user_id` | INT | ID Người Chơi |
| `bet_amount` | NUMERIC | Tổng cược |
| `matrix` | JSONB | Kết Quả 5x3 `[['A','K','A'],...]` |
| `win_amount` | NUMERIC | Tổng Tiền Thắng |
| `is_jackpot` | BOOLEAN | Lượt quay này có nổ hũ không? |
| `nonce` | BIGINT | Dùng cho Provably Fair |

### 3.2. Logic Backend (Provably Fair)
Kết quả quay là **xác định trước** dựa trên các hạt giống (seeds).
- **Thuật Toán**: `HMAC-SHA256(ServerSeed, ClientSeed, Nonce)` -> Hash Kết Quả.
- **Sinh Ma Trận**:
  - Chia Hash thành 15 đoạn (5 cột * 3 hàng).
  - Chuyển đổi mỗi đoạn thành một số (0-9999).
  - Ánh xạ số đó sang Biểu Tượng dựa trên Dải Trọng Số.
  - *Ví dụ*: 0-10 -> Diamond; 11-500 -> Wild; v.v.

### 3.3. Các Endpoint API
- `GET /games/slots/jackpot`: Trả về `{ poolAmount: 1250000.50 }` (Frontend gọi mỗi 5s).
- `POST /games/slots/spin`:
  - Đầu vào: `{ betAmount: 10000 }`
  - Logic: Kiểm tra Số Dư -> Trừ Số Dư -> Cộng 1% vào Hũ -> Sinh Ma Trận -> Tính Tiền Thắng -> Cập Nhật Số Dư -> Trả Về Kết Quả.
  - Đầu ra: `{ matrix: [...], winLines: [...], totalWin: 50000, jackpotShare: 0 }`.

---

## 4. 🎨 Triển Khai Frontend (React)

### 4.1. Các Thành Phần Giao Diện
- **SlotReel**: Dải biểu tượng dọc.
  - *Hoạt Ảnh*: CSS `translateY` với `transition-timing-function: cubic-bezier` để mô phỏng "quay lên, xuống nhanh, dừng nảy".
  - *Làm Mờ*: Áp dụng `filter: blur(4px)` trong khi chuyển động để tăng tính chân thực.
- **JackpotTicker**: Bộ đếm số hoạt hình (kiểu Odometer) hiển thị hũ đang tăng ở trên cùng.
- **ControlPanel**: Chọn Mức Cược (Thanh trượt/Nút), Nút Quay (To, Phát sáng), Công tắc Quay Tự Động.

### 4.2. Quản Lý Trạng Thái (State Management)
- `isSpinning`: Khóa các điều khiển.
- `matrix`: Các biểu tượng đang hiển thị hiện tại.
- `winDetails`: Những dòng nào thắng (để vẽ đường nối trên lưới).

---

## 5. 📅 Các Giai Đoạn Thực Hiện

- [x] **Giai Đoạn 1: Cơ Sở Dữ Liệu & Backend Core**
    - Tạo schema SQL cho jackpot và sessions.
    - Triển khai logic `SlotsController.spin` với toán học Ngẫu Nhiên Có Trọng Số.
    - Triển khai logic hạt giống Provably Fair cho Slots.

- [x] **Giai Đoạn 2: Giao Diện Frontend Cơ Bản**
    - Tạo `SlotsGame.js`.
    - Xây dựng Layout Lưới 5x3.
    - Triển khai hiển thị biểu tượng cơ bản (Chủ đề Cyber).

- [ ] **Giai Đoạn 3: Hoạt Ảnh & Trau Chuốt**
    - Thêm logic hoạt ảnh Quay Guồng.
    - Thêm vẽ Dòng Thắng (SVG overlay).
    - Thêm Hiệu Ứng Âm Thanh (Tiếng quay, chuông thắng, còi báo động Jackpot).

- [ ] **Giai Đoạn 4: Tích Hợp**
    - Kết nối Frontend với API `/spin`.
    - Kết nối Jackpot Ticker trực tiếp.
    - Kiểm tra cập nhật số dư và Lịch Sử.
