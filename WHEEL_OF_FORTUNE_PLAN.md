# 🎡 Wheel of Fortune (Dream Catcher) Implementation Plan

## 1. 🎯 Tổng Quan (Overview)
**Wheel of Fortune** (hay **Dream Catcher**) là một trò chơi may mắn dựa trên việc quay một vòng quay lớn được chia thành các ô số khác nhau. Mỗi ô số tương ứng với một tỷ lệ trả thưởng (multiplier).

### **Cơ chế cốt lõi:**
1.  **Vòng quay:** Được chia thành **54 ô** (segments).
2.  **Các con số:** Mức thưởng thông thường là **1, 2, 5, 10, 20, 40**.
3.  **Tỷ lệ xuất hiện:** Số càng nhỏ (ví dụ: 1) xuất hiện càng nhiều, số càng lớn (ví dụ: 40) xuất hiện càng ít để tạo ra rủi ro/phần thưởng cân bằng.
4.  **Luật chơi:** Người chơi đặt cược vào con số mà họ nghĩ vòng quay sẽ dừng lại. Nếu trúng, họ nhận được tiền cược nhân với con số đó.

---

## 2. 🎲 Cấu Hình Vòng Quay (Wheel Configuration)
Sử dụng cấu hình chuẩn của Dream Catcher (54 segments):

| Số (Multiplier) | Số lượng ô (Segments) | Tỷ lệ trúng (Probability) | Màu sắc (Gợi ý) |
| :--- | :--- | :--- | :--- |
| **1** | 23 | ~42.59% | 🟡 Vàng |
| **2** | 15 | ~27.77% | 🔵 Xanh Dương |
| **5** | 7 | ~12.96% | 🟣 Tím |
| **10** | 4 | ~7.40% | 🟢 Xanh Lá |
| **20** | 2 | ~3.70% | 🟠 Cam |
| **40** | 1 | ~1.85% | 🔴 Đỏ |
| **x2 / x7** | 2 (Optional) | ~3.70% | ⚫ Đen / Bạc |

*(Lưu ý: Để đơn giản hóa phiên bản đầu tiên, ta có thể bỏ qua ô Multiplier x2/x7 và chỉ tập trung vào các con số thưởng trực tiếp).*

---

## 3. 🛠️ Backend Implementation (Node.js)

### **Database Schema (Đã sẵn sàng)**
*   **Table `game_sessions`**:
    *   `game_type`: `'WHEEL'`
    *   `result_type`: Giá trị ô trúng (VD: `'10'`, `'40'`, `'2'`).
    *   `total_score`: Index của ô trúng (0-53) để frontend biết góc quay.
    *   `created_at`: Thời điểm quay.
*   **Table `game_bets`**:
    *   `bet_type`: Giá trị cược (VD: `'BET_1'`, `'BET_5'`, `'BET_20'`).
    *   `bet_amount`: Số tiền cược.
    *   `win_amount`: Tiền thắng ( `bet_amount * multiplier` + `bet_amount`).
    *   `status`: `'WON'` / `'LOST'`.

### **Logic Game (`wheel.controller.js`)**
1.  **Input:** Nhận danh sách cược từ Client (VD: `{ type: 'BET_10', amount: 50000 }`).
2.  **Validation:** Kiểm tra số dư và loại cược hợp lệ.
3.  **Quay Số (Random Generation):**
    *   Tạo mảng 54 phần tử đại diện cho vòng quay.
    *   Sử dụng **Provably Fair** (Server Seed + Client Seed + Nonce) để chọn ngẫu nhiên 1 index (0-53).
    *   Xác định kết quả (Multiplier) từ index đó.
4.  **Tính Thưởng:**
    *   Duyệt qua các vé cược.
    *   Nếu `bet_type` trùng với `result_type`: `Win = Amount * Multiplier + Amount`.
    *   Cập nhật số dư ví người chơi.
5.  **Lưu Database:** `INSERT` vào `game_sessions` và `game_bets`.
6.  **Trả về:** Index kết quả, Multiplier, Danh sách thắng/thua.

---

## 4. 🎨 Frontend Implementation (React)

### **Component: `WheelGame.js`**
*   **Vòng Quay (The Wheel):**
    *   Sử dụng **Canvas** hoặc **CSS Transform (`rotate`)** để vẽ vòng quay.
    *   Hiệu ứng quay mượt mà (ease-out) dựa trên kết quả trả về từ server.
    *   Kim chỉ (Pointer) ở phía trên để xác định ô trúng.
*   **Bảng Đặt Cược (Betting Board):**
    *   Hiển thị 6 ô cược tương ứng: **1, 2, 5, 10, 20, 40**.
    *   Hiển thị tỷ lệ trả thưởng rõ ràng (VD: "1 ăn 1", "1 ăn 40").
    *   Chip đặt cược (tương tự Bầu Cua/Tài Xỉu).
*   **Lịch Sử (History):**
    *   Hiển thị chuỗi kết quả gần nhất (VD: 🔵2 - 🟡1 - 🔴40 - 🟡1...).

### **Màu Sắc & Giao Diện**
*   Tông màu chủ đạo: Sang trọng, Casino style (Tím than, Vàng kim).
*   Hiệu ứng âm thanh: Tiếng quay "tạch tạch", tiếng xu rơi khi thắng.

---

## 5. 🔐 Provably Fair (Công Bằng)
*   Áp dụng thuật toán HMAC-SHA256 giống Tài Xỉu/Bầu Cua.
*   **Công thức:** `hash = HMAC(serverSeed, clientSeed + nonce)`.
*   **Kết quả:** Lấy 4 bytes đầu của hash -> chuyển thành số -> modulo 54 (số ô).
*   Cho phép người chơi verify kết quả sau mỗi ván.

---

## 6. 📅 Kế hoạch triển khai (Step-by-Step)
1.  **Backend Core:**
    *   Tạo module `games/wheel`.
    *   Viết logic quay số và trả thưởng.
    *   API endpoints: `/games/wheel/bet`, `/games/wheel/history`.
2.  **Frontend UI:**
    *   Vẽ vòng quay tĩnh (Static Wheel).
    *   Thêm animation quay (Spin logic).
    *   Tạo bàn đặt cược.
3.  **Integration:**
    *   Kết nối API đặt cược.
    *   Đồng bộ animation quay với kết quả server (Server trả về kết quả -> Client bắt đầu quay và dừng đúng ô đó).
4.  **Testing & Polish:**
    *   Check Provably Fair.
    *   Check tính toán tiền nong chính xác.
    *   Thêm âm thanh và hiệu ứng visual (pháo hoa khi trúng lớn).

---

## 7. 📝 File Structure Dự Kiến

```
backend/src/modules/games/wheel/
├── wheel.controller.js  # Xử lý logic game
├── wheel.routes.js      # Định nghĩa API
└── wheel.utils.js       # Cấu hình vòng quay (Segments)

frontend/src/features/games/wheel/
├── WheelGame.js         # Màn hình chính
├── WheelComponent.js    # Vẽ và quay vòng quay
├── BettingBoard.js      # Bảng đặt cược
└── PreviousResults.js   # Lịch sử cầu
```
