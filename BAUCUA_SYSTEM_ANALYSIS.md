# Phân Tích Hệ Thống Game Bầu Cua Tôm Cá (Bau Cua System Analysis)

## 1. Tổng Quan (Overview)
**Bầu Cua Tôm Cá** là một trò chơi cá cược dân gian Việt Nam, được tích hợp vào nền tảng "English Chatbot & Game Arena" như một phần mở rộng của hệ thống giải trí (bên cạnh Sic Bo). 
Phiên bản số hóa này tập trung vào trải nghiệm người dùng hiện đại, giao diện bắt mắt và đặc biệt là tính minh bạch tuyệt đối thông qua công nghệ **Provably Fair**.

## 2. Kiến Trúc Kỹ Thuật (Technical Architecture)

### 2.1. Backend (Node.js + Express + PostgreSQL)
Hệ thống backend được thiết kế theo mô hình Modular, tách biệt logic của từng game nhưng chia sẻ chung hạ tầng cơ sở dữ liệu và xác thực.

*   **Controller (`baucua.controller.js`)**:
    *   Xử lý logic cốt lõi: Tiếp nhận cược, kiểm tra số dư, quay số ngẫu nhiên, tính toán thắng thua, cập nhật ví.
    *   **Transactions**: Sử dụng Database Transaction (`BEGIN`, `COMMIT`, `ROLLBACK`) để đảm bảo tính toàn vẹn dữ liệu. Tiền chỉ bị trừ/cộng khi toàn bộ quy trình thành công.
    *   **Currency Handling**: Tự động chuyển đổi giữa VND (đơn vị hiển thị) và USD (đơn vị lưu trữ chuẩn của hệ thống) để đảm bảo thống nhất trong báo cáo tài chính.

*   **Database Schema**:
    *   Sử dụng chung bảng `game_sessions` và `game_bets` với Sic Bo.
    *   **Cải tiến linh hoạt**: Đã chuyển đổi cột `game_type` và `bet_type` từ `ENUM` cứng nhắc sang `VARCHAR` và loại bỏ các `CHECK CONTRAINT` cũ lỗi thời, cho phép hệ thống mở rộng không giới hạn các loại game mới trong tương lai.

### 2.2. Frontend (React + Inline Styles)
*   **Component (`BauCuaGame.js`)**:
    *   Sử dụng **Inline Styles** chủ đạo để đảm bảo giao diện hiển thị chính xác tuyệt đối mà không phụ thuộc vào cấu hình Tailwind CSS (tránh lỗi xung đột class).
    *   **State Management**: Quản lý trạng thái phức tạp (Selecting Chips, Placing Bets, Shaking Animation, Result Display) bằng React Hooks.
    *   **Animation**: Hiệu ứng lắc (Shake) mô phỏng vật lý thực tế với độ rung (`translate`), xoay (`rotate`) và làm mờ (`blur`) tạo cảm giác kịch tính.

## 3. Tính Năng Nổi Bật (Key Features)

### 3.1. Hệ Thống Provably Fair (Công Bằng Minh Bạch)
Đây là tính năng quan trọng nhất để xây dựng niềm tin.
1.  **Server Seed**: Được tạo ngẫu nhiên từ phía server trước mỗi ván cược.
2.  **Client Seed**: Người chơi có thể tự nhập hoặc sử dụng seed ngẫu nhiên của trình duyệt.
3.  **Hashing**: Server gửi mã băm (Hash) của Server Seed cho người chơi *trước* khi có kết quả.
4.  **Verification**: Sau khi có kết quả, Server công bố Server Seed gốc. Người chơi có thể tự kiểm tra lại mã băm để đảm bảo kết quả không bị can thiệp sau khi đặt cược.

### 3.2. Quy Tắc Trả Thưởng (Payout Logic)
Logic tính thưởng tuân thủ luật chơi quốc tế:
*   Trúng 1 linh vật: Nhận lại vốn + Thắng x1.
*   Trúng 2 linh vật: Nhận lại vốn + Thắng x2.
*   Trúng 3 linh vật: Nhận lại vốn + Thắng x3.
Code xử lý: `win = bet.amount + (bet.amount * count)`.

### 3.3. UX/UI Đồng Bộ
*   Giao diện Bầu Cua và Sic Bo (Tài Xỉu) được đồng bộ hóa hoàn toàn về phong cách (Dark Modern Theme).
*   Header, nút Back, hiển thị số dư, và hiệu ứng Animation đều nhất quán, tạo cảm giác chuyên nghiệp cho toàn bộ sàn Game Arena.

## 4. Các Thách Thức & Giải Pháp Đã Thực Hiện

### 4.1. Vấn đề Database ENUM
*   **Vấn đề**: PostgreSQL báo lỗi khi insert giá trị `'bet_baucua'` vào cột `ENUM` cũ.
*   **Giải pháp**: Sử dụng script migration để `ALTER TYPE ... ADD VALUE` thêm giá trị mới vào ENUM, giữ an toàn cho dữ liệu cũ và các View liên quan.

### 4.2. Vấn đề Hiển Thị Số Tiền (Currency Issue)
*   **Vấn đề**: Lịch sử giao dịch hiển thị số tiền sai lệch (nhân 25,000 lần) do hệ thống frontend giả định mọi giao dịch từ DB là USD. Ngoài ra, các bản ghi cũ lưu VND trong khi bản ghi mới lưu USD gây xung đột hiển thị.
*   **Giải pháp**: 
    1. Cập nhật Controller để quy đổi tiền cược (VND) sang USD *trước* khi lưu vào Database (Store in USD).
    2. Áp dụng kỹ thuật **Heuristic Detection** trong `getHistory`: Tự động nhận diện bản ghi cũ dựa trên Metadata (`currency` tag) hoặc giá trị tiền cược (Nếu `amount > 5000` -> Coi là VND legacy). Điều này đảm bảo hiển thị đúng cho cả dữ liệu quá khứ và hiện tại.

### 4.3. Vấn đề Dấu Âm/Dương & Lợi Nhuận Ròng (Net Profit)
*   **Vấn đề**: Giao dịch đặt cược hiển thị dấu `+` gây hiểu nhầm. Lịch sử hiển thị Tổng tiền nhận về (Gross Payout) thay vì Lãi thực (Net Profit).
*   **Giải pháp**: 
    1. Lưu giá trị Âm (`-amount`) vào bảng `wallet_transactions` cho việc đặt cược.
    2. Frontend tính toán và hiển thị **Net Profit** (`Win - Bet`).
        *   Thắng: Hiển thị `+Lãi` (Màu xanh).
        *   Thua: Hiển thị `-Lỗ` (Màu đỏ).
        *   Hòa: Hiển thị `0 đ` (Màu xám).

### 4.4. Cải Thiện UI/UX Toàn Diện
*   **Layout Stability**: Khắc phục lỗi giao diện bị co nhỏ (shrink) khi hiển thị kết quả bằng cách cố định `minWidth` và loại bỏ hiệu ứng `scale` không cần thiết.
*   **Controls Redesign**: Thiết kế lại cụm nút điều khiển, tách biệt nút "Xóc Ngay" (theo phong cách Xóc Đĩa truyền thống) và dàn trải chip cược để dễ thao tác hơn.
*   **Scrollbar**: Tùy biến thanh cuộn (Custom Scrollbar) cho danh sách lịch sử, đảm bảo luôn hiển thị và dễ nhìn trên nền tối.

## 5. Kết Luận
Hệ thống Bầu Cua Tôm Cá hiện tại đã hoàn thiện, ổn định và sẵn sàng cho việc mở rộng (Scaling). Kiến trúc cơ sở dữ liệu đã được nới lỏng để dễ dàng tích hợp thêm các game mới như Xóc Đĩa, Roulette mà không cần sửa đổi cấu trúc bảng quá nhiều.
