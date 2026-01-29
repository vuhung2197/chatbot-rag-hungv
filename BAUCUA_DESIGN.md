# Thiết Kế Hệ Thống Game: Bầu Cua Tôm Cá

## 1. Tổng Quan
**Bầu Cua Tôm Cá** là một trò chơi cá cược truyền thống sử dụng 3 viên xúc xắc, mỗi viên có 6 mặt tương ứng với 6 linh vật: **Bầu, Cua, Tôm, Cá, Gà, Nai**.

Hệ thống sẽ được xây dựng dựa trên nền tảng sẵn có của game Sic Bo (Tài Xỉu), tận dụng tối đa cơ chế **Provably Fair** và thiết kế Database hiện tại.

## 2. Quy Tắc Game & Mapping
### 2.1. Mapping Xúc Xắc (Dice)
Vì hệ thống Provably Fair hiện tại sinh ra số từ 1-6, chúng ta sẽ map các số này với các linh vật như sau:

| Số (Value) | Linh Vật (Mascot) | Màu Sắc (Color) | Icon (VD) |
| :--- | :--- | :--- | :--- |
| **1** | **Nai (Deer)** | Nâu/Vàng | 🦌 |
| **2** | **Bầu (Gourd)** | Xanh Lá | 🥒 |
| **3** | **Gà (Rooster)** | Đỏ/Vàng | 🐓 |
| **4** | **Cá (Fish)** | Xanh/Cam | 🐟 |
| **5** | **Cua (Crab)** | Đỏ/Cam | 🦀 |
| **6** | **Tôm (Shrimp)** | Đỏ/Đen | 🦐 |

*(Mapping này là quy ước phổ biến, cần cố định trong cả Backend và Frontend)*

### 2.2. Cơ Chế Trả Thưởng
- Người chơi đặt cược vào một hoặc nhiều linh vật.
- Sau khi lắc, nếu linh vật đó xuất hiện **N** lần, người chơi nhận lại tiền gốc + **(Tiền cược x N)**.
    - Xuất hiện 1 lần: Ăn 1:1.
    - Xuất hiện 2 lần: Ăn 1:2.
    - Xuất hiện 3 lần: Ăn 1:3.

## 3. Kiến Trúc Hệ Thống (Technical Solution)

### 3.1. Database Schema
Sử dụng chung bảng với Sic Bo nhưng phân biệt bằng `game_type`.

**Bảng `game_sessions`**:
- `game_type`: Giá trị là `'BAU_CUA'` (Hiện tại mặc định là `TAI_XIU`).
- `dice1`, `dice2`, `dice3`: Lưu giá trị 1-6 như bình thường (Frontend tự map ra hình).
- `result_type`: Có thể để NULL hoặc lưu chuỗi các linh vật (VD: 'NAI,BAU,TOM').

**Bảng `game_bets`**:
- `bet_type`: Lưu tên linh vật cược (VD: `'BAU'`, `'CUA'`, `'TOM'`).

### 3.2. Backend Logic (`Backend/src/modules/games/baucua`)
Tạo module mới `baucua.controller.js` với các API tương tự Sic Bo:
- `POST /bet`:
    - Input: `items: [{ type: 'BAU', amount: 1000 }, ...]` (Hỗ trợ cược nhiều cửa cùng lúc).
    - Logic Provably Fair: Dùng lại `utils/provablyFair.js`.
    - Tính thưởng:
        ```javascript
        let totalWin = 0;
        const resultCounts = { [dice1]: count, ... }; // Đếm số lần xuất hiện mỗi mặt
        
        bets.forEach(bet => {
            const mascotVal = MSG_MAPPING[bet.type];
            const appearances = resultCounts[mascotVal] || 0;
            if (appearances > 0) {
                 totalWin += bet.amount + (bet.amount * appearances);
            }
        });
        ```

### 3.3. Frontend Logic (`Frontend/src/features/games/baucua`)
- **UI**:
    - Bàn cược 6 ô chữ nhật (2 hàng x 3 cột).
    - Hiệu ứng lắc bát đĩa (Animation) thay vì lắc lọ xí ngầu.
    - Hiển thị lịch sử bằng icon linh vật thay vì số.
- **State**:
    - Quản lý các chip cược trên từng ô linh vật.

## 4. Kế Hoạch Triển Khai (Roadmap)
1.  **Phase 1: Database & Backend**
    - Cập nhật Enum trong Database (nếu cần thiết) hoặc quy ước mềm.
    - Viết API `baucua.controller.js`.
2.  **Phase 2: Frontend UI**
    - Thiết kế Assets (Hình ảnh 6 linh vật chất lượng cao).
    - Tạo Component `BauCuaGame.js`.
3.  **Phase 3: Integration & Testing**
    - Tích hợp API.
    - Kiểm tra Provably Fair (mapping đúng từ số sang hình).

## 5. Lưu Ý Quan Trọng
- **Assets**: Game Bầu Cua phụ thuộc rất nhiều vào hình ảnh đẹp. Cần chuẩn bị bộ icon/SVG hoặc ảnh 3D cho 6 linh vật.
- **Provably Fair**: Tool verify hiện tại (`verify_sicbo.js`) vẫn dùng được cho Bầu Cua vì bản chất nó vẫn là sinh ra 3 số từ 1-6. Người dùng chỉ cần biết quy tắc Mapping.

---
*Tài liệu này được soạn thảo bởi Trợ lý AI Antigravity.*
