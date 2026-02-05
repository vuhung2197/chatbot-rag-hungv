# Tính năng Rút tiền từ Ví - Kế hoạch Triển khai

**Ngày:** 2026-01-21  
**Tính năng:** Rút tiền từ ví về tài khoản ngân hàng  
**Trạng thái:** 📋 Giai đoạn Lập kế hoạch  

---

## 🎯 Tổng quan

### Mục đích
Cho phép người dùng rút tiền từ ví điện tử trong hệ thống về tài khoản ngân hàng cá nhân.

### Yêu cầu Nghiệp vụ
- User có thể rút tiền về tài khoản ngân hàng
- Xác thực thông tin ngân hàng
- Giới hạn số tiền rút tối thiểu/tối đa
- Phí rút tiền (nếu có)
- Thời gian xử lý: 1-3 ngày làm việc
- Lịch sử rút tiền

---

## 📊 Nghiên cứu Thị trường

### Hệ thống Ngân hàng Việt Nam

**Các Ngân hàng Phổ biến:**
1. **Vietcombank** - Ngân hàng Ngoại thương Việt Nam
2. **VietinBank** - Ngân hàng Công thương Việt Nam
3. **BIDV** - Ngân hàng Đầu tư và Phát triển Việt Nam
4. **Agribank** - Ngân hàng Nông nghiệp và Phát triển Nông thôn
5. **Techcombank** - Ngân hàng Kỹ thương Việt Nam
6. **MB Bank** - Ngân hàng Quân đội
7. **ACB** - Ngân hàng Á Châu
8. **Sacombank** - Ngân hàng TMCP Sài Gòn Thương Tín
9. **VPBank** - Ngân hàng Việt Nam Thịnh Vượng
10. **TPBank** - Ngân hàng Tiên Phong

---

## 🏗️ Kiến trúc Hệ thống

### Các Thành phần

```
┌─────────────────┐
│   Frontend      │
│  - Form rút     │
│    tiền         │
│  - Quản lý      │
│    thông tin NH │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│   Backend       │
│  - Validation   │
│  - Xử lý        │
│  - Phê duyệt    │
└────────┬────────┘
         │
         ├──────────┬──────────┐
         │          │          │
         ▼          ▼          ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Database │  │  Admin   │  │  Bank    │
│          │  │  Panel   │  │  API     │
└──────────┘  └──────────┘  └──────────┘
```

---

## 💼 Quy tắc Nghiệp vụ

### 1. Giới hạn Rút tiền

**Số tiền Tối thiểu:**
- 100.000 VNĐ

**Số tiền Tối đa:**
- Mỗi giao dịch: 50.000.000 VNĐ
- Mỗi ngày: 100.000.000 VNĐ
- Mỗi tháng: 500.000.000 VNĐ

**Lý do:**
- Ngăn chặn các giao dịch vi mô
- Giảm chi phí xử lý
- Tuân thủ quy định chống rửa tiền

---

### 2. Cơ cấu Phí

**Phương án A: Phí Cố định**
```
Phí: 5.000 VNĐ mỗi lần rút
```

**Phương án B: Phí Phần trăm**
```
Phí: 1% số tiền rút
Phí tối thiểu: 5.000 VNĐ
Phí tối đa: 50.000 VNĐ
```

**Phương án C: Phí Theo bậc**
```
< 1.000.000 VNĐ: 5.000 VNĐ
1.000.000 - 10.000.000 VNĐ: 10.000 VNĐ
> 10.000.000 VNĐ: 0,5% (tối đa 50.000 VNĐ)
```

**Khuyến nghị:** Phương án A (Phí Cố định) - Đơn giản và minh bạch

---

### 3. Thời gian Xử lý

**Xử lý Tiêu chuẩn:**
- Gửi yêu cầu: Tức thì
- Xác minh: 1-2 giờ (giờ làm việc)
- Chuyển khoản ngân hàng: 1-3 ngày làm việc
- Tổng cộng: 1-3 ngày làm việc

**Xử lý Nhanh (Tương lai):**
- Phí: +20.000 VNĐ
- Xử lý: Trong ngày (nếu trước 3 giờ chiều)

---

### 4. Yêu cầu Xác minh

**Xác minh Người dùng:**
- ✅ Email đã xác minh
- ✅ Số điện thoại đã xác minh
- ✅ KYC hoàn thành (cho số tiền lớn)

**Xác minh Tài khoản Ngân hàng:**
- ✅ Tên chủ tài khoản khớp với tên người dùng
- ✅ Số tài khoản ngân hàng hợp lệ
- ✅ Mã ngân hàng hợp lệ

---

## 🗄️ Cấu trúc Database

### Bảng mới: bank_accounts

```sql
CREATE TABLE bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bank_code VARCHAR(20) NOT NULL COMMENT 'VCB, VTB, BIDV, etc.',
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(100) NOT NULL,
  branch_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  status ENUM('active', 'pending', 'rejected', 'deleted') DEFAULT 'pending',
  verification_method VARCHAR(50) COMMENT 'manual, auto, napas',
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_account (user_id, bank_code, account_number)
);
```

### Cập nhật: wallet_transactions

```sql
-- Đã có type 'withdrawal' trong ENUM
ALTER TABLE wallet_transactions 
MODIFY COLUMN type ENUM('deposit', 'withdrawal', 'purchase', 'refund', 'subscription') NOT NULL;

-- Thêm các trường tham chiếu
ALTER TABLE wallet_transactions
ADD COLUMN bank_account_id INT NULL AFTER reference_id,
ADD COLUMN withdrawal_fee DECIMAL(10,2) DEFAULT 0.00 AFTER amount,
ADD COLUMN net_amount DECIMAL(10,2) NULL COMMENT 'Số tiền sau phí' AFTER withdrawal_fee,
ADD FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id);
```

### Bảng mới: withdrawal_requests

```sql
CREATE TABLE withdrawal_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  user_id INT NOT NULL,
  bank_account_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL COMMENT 'amount - fee',
  status ENUM('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled') DEFAULT 'pending',
  
  -- Đánh giá của Admin
  reviewed_by INT NULL COMMENT 'ID admin',
  reviewed_at TIMESTAMP NULL,
  review_notes TEXT,
  
  -- Xử lý
  processed_by INT NULL COMMENT 'ID admin',
  processed_at TIMESTAMP NULL,
  processing_notes TEXT,
  bank_transaction_id VARCHAR(100) COMMENT 'Mã tham chiếu ngân hàng',
  
  -- Hoàn thành
  completed_at TIMESTAMP NULL,
  
  -- Từ chối
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transaction_id) REFERENCES wallet_transactions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  FOREIGN KEY (processed_by) REFERENCES users(id),
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

---

## 🔄 Luồng Rút tiền

### Luồng Người dùng

```
1. User nhấp "Rút tiền"
   │
   ▼
2. Chọn/Thêm tài khoản ngân hàng
   │
   ├─► Tài khoản mới?
   │   │
   │   ├─► Nhập thông tin ngân hàng
   │   ├─► Xác minh tên chủ tài khoản
   │   └─► Lưu để dùng sau
   │
   ▼
3. Nhập số tiền rút
   │
   ├─► Kiểm tra tối thiểu (100.000 VNĐ)
   ├─► Kiểm tra tối đa (50.000.000 VNĐ)
   ├─► Kiểm tra hạn mức hàng ngày
   └─► Kiểm tra số dư ví
   │
   ▼
4. Hiển thị tính phí
   │
   Số tiền: 1.000.000 VNĐ
   Phí: 5.000 VNĐ
   Bạn nhận được: 995.000 VNĐ
   │
   ▼
5. Xác nhận rút tiền
   │
   ▼
6. Tạo yêu cầu rút tiền
   │
   ├─► Trừ từ ví
   ├─► Tạo giao dịch (pending)
   ├─► Tạo yêu cầu rút tiền
   └─► Gửi thông báo
   │
   ▼
7. Chờ xử lý
   │
   Trạng thái: Pending → Approved → Processing → Completed
   │
   ▼
8. Nhận tiền vào tài khoản ngân hàng (1-3 ngày)
```

---

### Luồng Admin

```
1. Admin nhận yêu cầu rút tiền
   │
   ▼
2. Đánh giá yêu cầu
   │
   ├─► Kiểm tra xác minh người dùng
   ├─► Kiểm tra thông tin tài khoản ngân hàng
   ├─► Kiểm tra lịch sử giao dịch
   └─► Kiểm tra các mẫu gian lận
   │
   ▼
3. Quyết định
   │
   ├─► Phê duyệt
   │   │
   │   ├─► Đánh dấu đã phê duyệt
   │   ├─► Xếp hàng để xử lý
   │   └─► Thông báo cho user
   │
   └─► Từ chối
       │
       ├─► Đánh dấu bị từ chối
       ├─► Hoàn tiền về ví
       └─► Thông báo cho user kèm lý do
   │
   ▼
4. Xử lý các yêu cầu đã phê duyệt (theo lô)
   │
   ├─► Tạo file chuyển khoản ngân hàng
   ├─► Upload lên hệ thống ngân hàng
   └─► Cập nhật trạng thái sang processing
   │
   ▼
5. Xác nhận hoàn thành
   │
   ├─► Nhận xác nhận từ ngân hàng
   ├─► Cập nhật trạng thái sang completed
   └─► Thông báo cho user
```

---

## 💻 Thiết kế API

### 1. Quản lý Tài khoản Ngân hàng

**Thêm Tài khoản Ngân hàng**
```
POST /wallet/bank-accounts

Request:
{
  "bank_code": "VCB",
  "account_number": "1234567890",
  "account_holder_name": "NGUYEN VAN A",
  "branch_name": "Chi nhánh Hà Nội"
}

Response:
{
  "success": true,
  "bank_account": {
    "id": 1,
    "bank_code": "VCB",
    "bank_name": "Vietcombank",
    "account_number": "1234567890",
    "account_holder_name": "NGUYEN VAN A",
    "status": "pending",
    "is_verified": false
  }
}
```

**Lấy Danh sách Tài khoản Ngân hàng**
```
GET /wallet/bank-accounts

Response:
{
  "success": true,
  "bank_accounts": [
    {
      "id": 1,
      "bank_code": "VCB",
      "bank_name": "Vietcombank",
      "account_number": "****7890",
      "account_holder_name": "NGUYEN VAN A",
      "is_verified": true,
      "is_default": true
    }
  ]
}
```

**Xóa Tài khoản Ngân hàng**
```
DELETE /wallet/bank-accounts/:id

Response:
{
  "success": true,
  "message": "Xóa tài khoản ngân hàng thành công"
}
```

---

### 2. Các thao tác Rút tiền

**Tính Phí Rút tiền**
```
POST /wallet/withdrawal/calculate-fee

Request:
{
  "amount": 1000000
}

Response:
{
  "success": true,
  "amount": 1000000,
  "fee": 5000,
  "net_amount": 995000,
  "fee_percentage": 0.5
}
```

**Tạo Yêu cầu Rút tiền**
```
POST /wallet/withdrawal

Request:
{
  "bank_account_id": 1,
  "amount": 1000000
}

Response:
{
  "success": true,
  "withdrawal": {
    "id": 123,
    "amount": 1000000,
    "fee": 5000,
    "net_amount": 995000,
    "status": "pending",
    "estimated_completion": "2026-01-24",
    "created_at": "2026-01-21T10:00:00Z"
  }
}
```

**Lấy Lịch sử Rút tiền**
```
GET /wallet/withdrawal/history?page=1&limit=20

Response:
{
  "success": true,
  "withdrawals": [
    {
      "id": 123,
      "amount": 1000000,
      "fee": 5000,
      "net_amount": 995000,
      "status": "completed",
      "bank_account": {
        "bank_name": "Vietcombank",
        "account_number": "****7890"
      },
      "created_at": "2026-01-21T10:00:00Z",
      "completed_at": "2026-01-23T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

**Hủy Rút tiền**
```
POST /wallet/withdrawal/:id/cancel

Response:
{
  "success": true,
  "message": "Đã hủy rút tiền. Số tiền đã được hoàn về ví.",
  "refund_amount": 1000000
}
```

---

### 3. API Admin

**Lấy Danh sách Yêu cầu Rút tiền Đang chờ**
```
GET /admin/withdrawals?status=pending&page=1&limit=50

Response:
{
  "success": true,
  "withdrawals": [
    {
      "id": 123,
      "user": {
        "id": 1,
        "name": "Nguyen Van A",
        "email": "user@example.com"
      },
      "amount": 1000000,
      "fee": 5000,
      "net_amount": 995000,
      "bank_account": {
        "bank_name": "Vietcombank",
        "account_number": "1234567890",
        "account_holder_name": "NGUYEN VAN A"
      },
      "status": "pending",
      "created_at": "2026-01-21T10:00:00Z"
    }
  ]
}
```

**Phê duyệt Rút tiền**
```
POST /admin/withdrawals/:id/approve

Request:
{
  "notes": "Đã xác minh và phê duyệt"
}

Response:
{
  "success": true,
  "message": "Đã phê duyệt yêu cầu rút tiền"
}
```

**Từ chối Rút tiền**
```
POST /admin/withdrawals/:id/reject

Request:
{
  "reason": "Thông tin tài khoản ngân hàng không hợp lệ"
}

Response:
{
  "success": true,
  "message": "Đã từ chối yêu cầu rút tiền và hoàn tiền"
}
```

**Đánh dấu Hoàn thành**
```
POST /admin/withdrawals/:id/complete

Request:
{
  "bank_transaction_id": "FT2026012112345",
  "notes": "Chuyển khoản thành công"
}

Response:
{
  "success": true,
  "message": "Đã đánh dấu rút tiền hoàn thành"
}
```

---

## 🔐 Biện pháp Bảo mật

### 1. Xác minh Người dùng

**Xác minh Email:**
```javascript
if (!user.email_verified) {
  return res.status(403).json({
    message: 'Vui lòng xác minh email trước khi rút tiền'
  });
}
```

**Xác minh Số điện thoại:**
```javascript
if (!user.phone_verified) {
  return res.status(403).json({
    message: 'Vui lòng xác minh số điện thoại trước khi rút tiền'
  });
}
```

**KYC cho Số tiền Lớn:**
```javascript
if (amount > 10000000 && !user.kyc_verified) {
  return res.status(403).json({
    message: 'Yêu cầu xác minh KYC cho rút tiền trên 10.000.000 VNĐ'
  });
}
```

---

### 2. Phát hiện Gian lận

**Kiểm tra Hạn mức Hàng ngày:**
```javascript
const todayWithdrawals = await getTodayWithdrawals(userId);
if (todayWithdrawals + amount > DAILY_LIMIT) {
  return res.status(400).json({
    message: 'Vượt quá hạn mức rút tiền hàng ngày'
  });
}
```

**Phát hiện Mẫu Đáng ngờ:**
```javascript
// Nhiều lần rút tiền trong thời gian ngắn
// Tài khoản mới với rút tiền lớn
// Tên chủ tài khoản không khớp
// Mẫu rút tiền bất thường
```

**Theo dõi IP:**
```javascript
// Ghi log địa chỉ IP cho mỗi lần rút tiền
// Cảnh báo khi IP thay đổi
// Chặn IP đáng ngờ
```

---

### 3. Xác minh Tài khoản Ngân hàng

**Kiểm tra Tên:**
```javascript
const userFullName = normalizeVietnameseName(user.full_name);
const accountHolderName = normalizeVietnameseName(bankAccount.account_holder_name);

if (userFullName !== accountHolderName) {
  return res.status(400).json({
    message: 'Tên chủ tài khoản phải khớp với tên đã đăng ký'
  });
}
```

**Xác minh NAPAS (Tương lai):**
```javascript
// Tích hợp với API NAPAS để xác minh tài khoản ngân hàng
const isValid = await napasService.verifyBankAccount({
  bank_code: bankAccount.bank_code,
  account_number: bankAccount.account_number
});
```

---

## 📱 Thiết kế Frontend

### Form Rút tiền

```jsx
<WithdrawalForm>
  <BankAccountSelector
    accounts={bankAccounts}
    onSelect={handleBankSelect}
    onAddNew={handleAddBank}
  />
  
  <AmountInput
    value={amount}
    onChange={handleAmountChange}
    min={100000}
    max={50000000}
    balance={walletBalance}
  />
  
  <FeeCalculation
    amount={amount}
    fee={fee}
    netAmount={netAmount}
  />
  
  <ConfirmButton
    onClick={handleWithdraw}
    disabled={!isValid}
  >
    Rút tiền
  </ConfirmButton>
</WithdrawalForm>
```

### Quản lý Tài khoản Ngân hàng

```jsx
<BankAccountList>
  {bankAccounts.map(account => (
    <BankAccountCard
      key={account.id}
      account={account}
      onSetDefault={handleSetDefault}
      onDelete={handleDelete}
    />
  ))}
  
  <AddBankAccountButton onClick={handleAddBank} />
</BankAccountList>
```

---

## 📊 Các giai đoạn Triển khai

### Giai đoạn 1: Rút tiền Cơ bản (Tuần 1-2)

**Backend:**
- [ ] Tạo các bảng database
- [ ] Implement CRUD tài khoản ngân hàng
- [ ] Implement tạo yêu cầu rút tiền
- [ ] Implement tính phí
- [ ] Thêm các quy tắc validation

**Frontend:**
- [ ] UI quản lý tài khoản ngân hàng
- [ ] Form rút tiền
- [ ] Lịch sử rút tiền

**Testing:**
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

---

### Giai đoạn 2: Panel Admin (Tuần 3)

**Backend:**
- [ ] API quản lý rút tiền cho admin
- [ ] Logic phê duyệt/từ chối
- [ ] Cập nhật trạng thái
- [ ] Thông báo

**Frontend:**
- [ ] Dashboard rút tiền cho admin
- [ ] Giao diện phê duyệt/từ chối
- [ ] UI xử lý hàng loạt

---

### Giai đoạn 3: Tính năng Nâng cao (Tuần 4)

**Tính năng:**
- [ ] Thông báo email
- [ ] Thông báo SMS
- [ ] Hạn mức rút tiền theo tier
- [ ] Xử lý nhanh
- [ ] Xác minh tài khoản ngân hàng (NAPAS)

---

### Giai đoạn 4: Tối ưu hóa (Tuần 5)

**Cải tiến:**
- [ ] Tối ưu hóa hiệu suất
- [ ] Caching
- [ ] Analytics
- [ ] Báo cáo
- [ ] Phát hiện gian lận

---

## 💰 Phân tích Chi phí

### Chi phí Phát triển

| Hạng mục | Công sức | Chi phí (VNĐ) |
|----------|----------|---------------|
| Phát triển Backend | 40 giờ | 20.000.000 |
| Phát triển Frontend | 30 giờ | 15.000.000 |
| Panel Admin | 20 giờ | 10.000.000 |
| Testing & QA | 20 giờ | 10.000.000 |
| **Tổng cộng** | **110 giờ** | **55.000.000** |

### Chi phí Vận hành

| Hạng mục | Chi phí Hàng tháng (VNĐ) |
|----------|--------------------------|
| Phí chuyển khoản ngân hàng | Thay đổi |
| Thông báo SMS | 500.000 |
| Dịch vụ email | 200.000 |
| Nhân viên hỗ trợ | 15.000.000 |
| **Tổng cộng** | **~15.700.000** |

---

## 🎯 Chỉ số Thành công

### KPIs

1. **Tỷ lệ Rút tiền Thành công**
   - Mục tiêu: > 95%
   - Đo lường: Hoàn thành / Tổng yêu cầu

2. **Thời gian Xử lý Trung bình**
   - Mục tiêu: < 2 ngày
   - Đo lường: Completed_at - Created_at

3. **Độ Hài lòng Người dùng**
   - Mục tiêu: > 4,5/5
   - Đo lường: Khảo sát sau khi rút tiền

4. **Tỷ lệ Gian lận**
   - Mục tiêu: < 0,1%
   - Đo lường: Bị từ chối do gian lận / Tổng số

---

## ⚠️ Rủi ro & Giảm thiểu

### Rủi ro 1: Gian lận

**Rủi ro:** Người dùng có thể cố gắng rút tiền gian lận

**Giảm thiểu:**
- Yêu cầu xác minh email/số điện thoại
- KYC cho số tiền lớn
- Phê duyệt admin cho lần rút đầu tiên
- Thuật toán phát hiện mẫu

---

### Rủi ro 2: Thất bại Chuyển khoản Ngân hàng

**Rủi ro:** Chuyển khoản ngân hàng có thể thất bại

**Giảm thiểu:**
- Cơ chế retry
- Tùy chọn xử lý thủ công
- Thông báo lỗi rõ ràng
- Hoàn tiền về ví khi thất bại

---

### Rủi ro 3: Tuân thủ

**Rủi ro:** Vấn đề tuân thủ quy định

**Giảm thiểu:**
- Tư vấn đội ngũ pháp lý
- Triển khai KYC/AML
- Giới hạn giao dịch
- Audit trail

---

## 📚 Tài liệu Tham khảo

### Quy định Ngân hàng Việt Nam

- Quy định của Ngân hàng Nhà nước Việt Nam (NHNN)
- Luật Chống rửa tiền (AML)
- Yêu cầu Tìm hiểu Khách hàng (KYC)
- Quy định thanh toán điện tử

### Tiêu chuẩn Kỹ thuật

- NAPAS (Tổng công ty Thanh toán Quốc gia Việt Nam)
- ISO 20022 (Messaging tài chính)
- PCI DSS (Tiêu chuẩn Bảo mật Dữ liệu Ngành Thẻ thanh toán)

---

## ✅ Kết luận

### Khuyến nghị

**Triển khai theo giai đoạn:**

1. **Giai đoạn 1 (Ưu tiên):** Rút tiền cơ bản với phê duyệt thủ công của admin
2. **Giai đoạn 2:** Panel admin để xử lý hiệu quả
3. **Giai đoạn 3:** Tính năng nâng cao (thông báo, xác minh)
4. **Giai đoạn 4:** Tối ưu hóa và tự động hóa

### Thời gian

- **Giai đoạn 1:** 2 tuần
- **Giai đoạn 2:** 1 tuần
- **Giai đoạn 3:** 1 tuần
- **Giai đoạn 4:** 1 tuần
- **Tổng cộng:** 5 tuần

### Ngân sách

- Phát triển: 55.000.000 VNĐ
- Vận hành hàng tháng: 15.700.000 VNĐ

---

**Trạng thái:** 📋 Sẵn sàng để phê duyệt  
**Bước tiếp theo:** Xin phê duyệt từ các bên liên quan và bắt đầu Giai đoạn 1  
**Độ ưu tiên:** Trung bình (sau khi tích hợp VNPay/MoMo ổn định)

**🎉 Hoàn thành kế hoạch tính năng rút tiền!**
