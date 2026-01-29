# Sic Bo Game System Documentation

## 1. Tổng Quan
Hệ thống game Sic Bo được tích hợp vào ứng dụng Chatbot, cho phép người dùng sử dụng số dư trong ví hiện có để đặt cược. Hệ thống hoạt động theo cơ chế "Nhà cái" (House), trong đó tài khoản Admin đóng vai trò là Nhà cái, trực tiếp nhận tiền cược và trả thưởng cho người dùng.

## 2. Kiến Trúc Hệ Thống

### Frontend
- **Giao diện**: `TaixiuGame.js`
- **Tính năng**:
  - Hiển thị bàn cược, animation lắc xúc xắc.
  - Chọn mệnh giá chip (1k - 500k).
  - Cập nhật số dư realtime.
  - Xem lịch sử các ván chơi gần nhất.

### Backend
- **Logic**: `taixiu.controller.js`
- **Cơ chế**: Transaction Atomic (Đảm bảo tính toàn vẹn dữ liệu tiền tệ).
- **RNG**: Random Number Generator an toàn để quay xúc xắc.

### Database
- **`game_sessions`**: Lưu kết quả từng phiên quay (3 viên xúc xắc).
- **`game_bets`**: Lưu chi tiết vé cược của người dùng.
- **`user_wallets`**: Ví tiền của User và Admin.
- **`wallet_transactions`**: Lịch sử biến động số dư.

---

## 3. Luồng Hoạt Động Chi Tiết (Game Flow)

### A. Chuẩn Bị (Pre-requisites)
1.  **User**: Cần đăng nhập và có số dư khả dụng trong ví (`user_wallets`).
2.  **Admin (House)**: Hệ thống tự động chọn tài khoản Admin đầu tiên làm Nhà cái. Nếu Admin chưa có ví, hệ thống sẽ tự tạo ví mới.

### B. Quy Trình Một Ván Cược

#### Bước 1: Người dùng Đặt cược (Client Action)
- Người dùng chọn cửa **TÀI (Big)** hoặc **XỈU (Small)**.
- Người dùng chọn số tiền cược (Ví dụ: $10).
- Client gửi request `POST /api/games/taixiu/bet`.

#### Bước 2: Xử lý Giao dịch - Giai đoạn 1 (Backend Processing)
*Server mở một Database Transaction để đảm bảo an toàn.*

1.  **Khóa Ví (Lock Wallets)**: Khóa ví của User và Admin để ngăn chặn xung đột (Race condition).
2.  **Kiểm tra Số dư**: Xác nhận User đủ $10 để cược.
3.  **Chuyển Tiền Cược (User -> Admin)**:
    - **User**: Trừ $10. (`balance` giảm)
    - **Admin**: Cộng $10. (`balance` tăng)
    - **Ghi log**:
        - User: `game_bet` (-$10).
        - Admin: `game_revenue` (+$10).
    - *Lúc này, Nhà cái đã cầm tiền cược của người chơi.*

#### Bước 3: Quay Số (Game Mechanics)
- Server sinh ngẫu nhiên 3 số từ 1-6: `dice1`, `dice2`, `dice3`.
- Tính tổng điểm `total = d1 + d2 + d3`.
- Xác định kết quả:
    - **TÀI**: Tổng 11 - 17.
    - **XỈU**: Tổng 4 - 10.
    - **Bão (Triple)**: 3 số giống nhau (Ví dụ: 1-1-1). -> **User luôn THUA** (Luật House Edge).

#### Bước 4: Xử lý Kết quả (Payout)

**Trường hợp 1: Người chơi THUA (Lose)**
- **Hành động**: Không làm gì thêm về tiền tệ.
- **Kết quả**: Admin giữ trọn $10 đã nhận ở Bước 2.
- **Trạng thái cược**: `LOST`.

**Trường hợp 2: Người chơi THẮNG (Win)**
- **Hành động**: Admin trả thưởng cho User.
- **Công thức**: Tỷ lệ 1 ăn 1. User nhận lại Tiền gốc ($10) + Tiền thắng ($10) = $20.
- **Chuyển Tiền Thưởng (Admin -> User)**:
    - **Admin**: Trừ $20. (`balance` giảm)
    - **User**: Cộng $20. (`balance` tăng)
    - **Ghi log**:
        - User: `game_win` (+$20).
        - Admin: `game_payout` (-$20).
- **Trạng thái cược**: `WON`.

#### Bước 5: Lưu Trữ & Phản Hồi
- Lưu thông tin ván chơi vào `game_sessions`.
- Lưu vé cược vào `game_bets`.
- Commit Transaction (Lưu tất cả thay đổi vào DB).
- Trả kết quả về Client: `{ dice: [x,y,z], result: 'TAI', win: true/false, ... }`.

---

## 4. Bảng Luồng Tiền (Money Flow Summary)

Giả sử User cược **$100**.

| Trạng Thái | Ví User (User Wallet) | Ví Admin (House Wallet) | Ghi Chú |
| :--- | :--- | :--- | :--- |
| **Bắt đầu** | `$1000` | `$5000` | |
| **Đặt cược** | `- $100` | `+ $100` | Tiền chạy sang ví Admin ngay lập tức. |
| **User Thua** | `$900` (Net: -$100) | `$5100` (Net: +$100) | Ván chơi kết thúc. |
| **User Thắng** | `+ $200` | `- $200` | Admin trả Gốc + Lãi. |
| **Kết thúc (Win)**| `$1100` (Net: +$100) | `$4900` (Net: -$100) | Tiền được chuyển từ Admin sang User. |

## 5. Quản Lý Dữ Liệu

### Dữ Liệu Phiên (Game Sessions)
Mỗi lần quay tạo ra một bản ghi:
```sql
id | dice1 | dice2 | dice3 | total_score | result_type
1  | 2     | 4     | 5     | 11          | TAI
```

### Dữ Liệu Cược (Game Bets)
Chi tiết vé cược của User:
```sql
id | user_id | session_id | bet_type | bet_amount | win_amount | status
1  | 101     | 1          | TAI      | 10.00      | 20.00      | WON
```

### Hỗ Trợ Đa Tiền Tệ
Hệ thống tích hợp sẵn `currencyService`. Nếu User dùng VND và Admin dùng USD:
1. User đặt 230,000 VND.
2. Hệ thống quy đổi ra ~$10 USD.
3. Cộng $10 USD vào ví Admin.
4. Nếu thắng, Admin trả $20 USD.
5. Hệ thống quy đổi ra ~460,000 VND và cộng vào ví User.
