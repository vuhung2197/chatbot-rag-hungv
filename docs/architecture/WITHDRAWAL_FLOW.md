
# Rút Tiền (Withdrawal Flow)

Tài liệu này mô tả chi tiết quy trình rút tiền của người dùng trong hệ thống `english-chatbot`.

## 1. Tổng Quan
Tính năng rút tiền cho phép người dùng chuyển số dư khả dụng từ Ví (Wallet) về tài khoản ngân hàng cá nhân đã liên kết.

**Các thành phần chính:**
- **Frontend**:
    - `WalletDashboard.js`: Màn hình chính của ví, nơi bắt đầu quy trình.
    - `WithdrawModal.js`: Popup quản lý các bước rút tiền (Chọn ngân hàng -> Nhập tiền -> Xác nhận).
    - `BankAccountManager.js`: Quản lý danh sách tài khoản ngân hàng.
    - `AddBankModal.js`: Popup thêm mới tài khoản ngân hàng.
- **Backend API**:
    - `GET /wallet/bank-accounts`: Lấy danh sách ngân hàng.
    - `POST /wallet/bank-accounts`: Thêm ngân hàng mới.
    - `POST /wallet/withdrawal/calculate-fee`: Tính toán phí rút tiền.
    - `POST /wallet/withdraw`: Thực hiện lệnh rút tiền.

---

## 2. Quy Trình Chi Tiết (User Journey)

### Bước 0: Tại màn hình Ví (Wallet Dashboard)
- Người dùng bấm nút **"Withdraw"** (biểu tượng mũi tên đi lên).
- Hệ thống mở popup `WithdrawModal`.

### Bước 1: Chọn tài khoản ngân hàng (Select Bank)
1.  Hệ thống tải danh sách tài khoản ngân hàng đã liên kết (`GET /wallet/bank-accounts`).
2.  **Trường hợp chưa có tài khoản:**
    - Hiển thị thông báo trống.
    - Người dùng bấm **"Link Your First Account"**.
    - Mở popup `AddBankModal` để thêm ngân hàng (nhập số TK, tên ngân hàng, tên chủ thẻ...).
    - Sau khi thêm thành công, danh sách sẽ tự động reload.
3.  **Trường hợp đã có tài khoản:**
    - Người dùng chọn một tài khoản từ danh sách.
    - Tài khoản được chọn sẽ hiển thị trạng thái active (border xanh).
    - Nút **"Next Step"** được kích hoạt (enable).
    - Người dùng bấm **"Next Step"** để sang Bước 2.

### Bước 2: Nhập số tiền (Enter Amount)
1.  Hiển thị thông tin tài khoản ngân hàng đã chọn ở trên cùng để xác nhận lại.
2.  Người dùng nhập số tiền muốn rút vào ô input.
    - Có nút **"MAX"** để điền nhanh toàn bộ số dư.
3.  Hệ thống kiểm tra (Validate) ngay tại client:
    - Số tiền phải > 0.
    - Số tiền phải <= Số dư khả dụng.
4.  Người dùng bấm **"Review Withdrawal"**.
    - Hệ thống gọi API `POST /wallet/withdrawal/calculate-fee` để tính phí và số tiền thực nhận.
    - Chuyển sang Bước 3.

### Bước 3: Xác nhận (Confirm)
1.  Hiển thị bảng tóm tắt giao dịch:
    - **Withdrawal Amount**: Số tiền muốn rút.
    - **Transaction Fee**: Phí giao dịch (mặc định 0.5 USD).
    - **You Receive**: Số tiền thực nhận về tài khoản (Amount - Fee).
2.  Hiển thị cảnh báo thời gian xử lý (1-3 ngày làm việc).
3.  Người dùng bấm **"Confirm Withdrawal"**.
    - Hệ thống gọi API `POST /wallet/withdraw`.
4.  **Kết quả:**
    - **Thành công:** Đóng modal, hiển thị thông báo "Success", reload lại số dư ví và lịch sử giao dịch.
    - **Thất bại:** Hiển thị lỗi màu đỏ ngay trên modal (không đóng modal).

---

## 3. Cấu Trúc Dữ Liệu & API

### API: Tính phí rút tiền
- **Endpoint:** `POST /wallet/withdrawal/calculate-fee`
- **Body:** `{ amount: number }`
- **Response:**
  ```json
  {
    "amount": 100,
    "fee": 0.5,
    "net_amount": 99.5,
    "currency": "USD"
  }
  ```

### API: Thực hiện rút tiền
- **Endpoint:** `POST /wallet/withdraw`
- **Body:**
  ```json
  {
    "bank_account_id": "uuid-string",
    "amount": 100
  }
  ```
- **Logic Backend:**
  1. Kiểm tra số dư người dùng.
  2. Tạo transaction (trừ tiền ví).
  3. Tạo withdrawal_request (trạng thái 'pending').
  4. Trả về kết quả thành công.

---

## 4. Lưu ý quan trọng
- **Phí giao dịch:** Hiện tại đang fix cứng là **0.5 USD** cho mỗi giao dịch rút tiền.
- **Tiền tệ:** Hệ thống hỗ trợ đa tiền tệ (VND/USD), nhưng số dư rút sẽ được tính toán dựa trên currency của ví.
- **Bảo mật:** Tất cả API đều yêu cầu Header `Authorization: Bearer <token>`.
