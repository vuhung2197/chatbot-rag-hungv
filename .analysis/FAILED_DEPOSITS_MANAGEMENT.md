# Quản Lý Giao Dịch Nạp Tiền Không Thành Công

## Tổng Quan

Hệ thống đã được cập nhật để theo dõi và quản lý các giao dịch nạp tiền không thành công. Tính năng này giúp người dùng:
- Xem tổng số tiền nạp không thành công
- Theo dõi các giao dịch đang chờ xử lý (pending)
- Phân tích nguyên nhân thất bại để cải thiện trải nghiệm

## ✅ Xác Nhận: Số Tiền Không Được Tính Vào Tổng

**Câu hỏi:** Số tiền nạp không thành công có được cộng vào tổng tiền không?

**Trả lời:** **KHÔNG** ❌

### Logic Tính Toán

```sql
-- Chỉ các giao dịch COMPLETED được tính vào tổng
SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' 
    THEN wt.amount ELSE 0 END) as total_deposits
```

### Các Trạng Thái Giao Dịch

| Trạng Thái | Mô Tả | Được Tính Vào Tổng? | Được Cộng Vào Số Dư? |
|------------|-------|---------------------|----------------------|
| ✅ `completed` | Nạp tiền thành công | ✅ CÓ | ✅ CÓ |
| ❌ `failed` | Nạp tiền thất bại | ❌ KHÔNG | ❌ KHÔNG |
| ⏳ `pending` | Đang chờ xử lý | ❌ KHÔNG | ❌ KHÔNG |

## Tính Năng Mới

### 1. Thống Kê Mở Rộng

Endpoint `/wallet/stats` giờ đây trả về thêm các thông tin:

```json
{
  "balance": 100.00,
  "currency": "USD",
  "total_transactions": 10,
  "total_deposits": 500.00,          // ✅ Chỉ giao dịch thành công
  "total_spent": 400.00,
  "failed_deposit_amount": 50.00,    // ❌ Tổng số tiền nạp thất bại
  "pending_deposit_amount": 25.00,   // ⏳ Tổng số tiền đang chờ
  "total_failed_deposits": 3,        // ❌ Số lần nạp thất bại
  "total_pending_deposits": 1,       // ⏳ Số lần đang chờ
  "last_transaction_at": "2026-01-22T10:30:00.000Z"
}
```

### 2. API Endpoint Mới

**Endpoint:** `GET /wallet/deposits/failed-pending`

**Mô tả:** Lấy danh sách chi tiết các giao dịch nạp tiền thất bại và đang chờ xử lý

**Query Parameters:**
- `status` (optional): 
  - `'failed'` - Chỉ lấy giao dịch thất bại
  - `'pending'` - Chỉ lấy giao dịch đang chờ
  - Không truyền - Lấy cả hai loại

**Request Example:**
```bash
# Lấy tất cả giao dịch failed và pending
GET /wallet/deposits/failed-pending
Authorization: Bearer <token>

# Chỉ lấy giao dịch failed
GET /wallet/deposits/failed-pending?status=failed
Authorization: Bearer <token>

# Chỉ lấy giao dịch pending
GET /wallet/deposits/failed-pending?status=pending
Authorization: Bearer <token>
```

**Response Example:**
```json
{
  "transactions": [
    {
      "id": 123,
      "wallet_id": 1,
      "amount": 50.00,
      "balance_before": 100.00,
      "balance_after": 100.00,
      "description": "Deposit 50.00 USD",
      "payment_method": "vnpay",
      "payment_gateway_id": "20260122101234",
      "status": "failed",
      "metadata": {
        "currency": "USD",
        "order_id": "DEPOSIT_123_1234567890",
        "initiated_at": "2026-01-22T10:12:34.000Z",
        "failed_at": "2026-01-22T10:15:00.000Z"
      },
      "created_at": "2026-01-22T10:12:34.000Z",
      "currency": "USD"
    }
  ],
  "total": 3,
  "currency": "USD"
}
```

## Chuyển Đổi Tiền Tệ

Tất cả số liệu đều được tự động chuyển đổi sang đơn vị tiền tệ hiện tại của ví:

### Ví Dụ
- **Ví USD:** 
  - `failed_deposit_amount: 50.00` USD
  
- **Ví VND (sau khi chuyển đổi):**
  - `failed_deposit_amount: 1,200,000` VND (50 × 24,000)

## Các File Đã Thay Đổi

### 1. Backend Controller
**File:** `backend/controllers/walletController.js`

**Thay đổi:**
- ✅ Cập nhật `getWalletStats()` - Thêm tracking cho failed/pending deposits
- ✅ Thêm `getFailedAndPendingDeposits()` - Endpoint mới để lấy danh sách chi tiết

### 2. Backend Routes
**File:** `backend/routes/wallet.js`

**Thay đổi:**
- ✅ Thêm route `GET /wallet/deposits/failed-pending`
- ✅ Import function `getFailedAndPendingDeposits`

## Cách Sử Dụng Trong Frontend

### 1. Hiển Thị Thống Kê Mở Rộng

```javascript
// Trong WalletDashboard.js
const [stats, setStats] = useState(null);

useEffect(() => {
    const fetchStats = async () => {
        const response = await axios.get('http://localhost:3001/wallet/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
    };
    fetchStats();
}, []);

// Hiển thị
{stats && (
    <div className="failed-stats">
        <div className="stat-card warning">
            <span>Giao Dịch Thất Bại:</span>
            <span>{stats.total_failed_deposits}</span>
            <span>{formatCurrency(stats.failed_deposit_amount, stats.currency)}</span>
        </div>
        <div className="stat-card info">
            <span>Đang Chờ Xử Lý:</span>
            <span>{stats.total_pending_deposits}</span>
            <span>{formatCurrency(stats.pending_deposit_amount, stats.currency)}</span>
        </div>
    </div>
)}
```

### 2. Hiển Thị Danh Sách Giao Dịch Thất Bại

```javascript
// Component mới: FailedDepositsModal.js
const [failedDeposits, setFailedDeposits] = useState([]);

const fetchFailedDeposits = async () => {
    const response = await axios.get(
        'http://localhost:3001/wallet/deposits/failed-pending',
        { headers: { Authorization: `Bearer ${token}` } }
    );
    setFailedDeposits(response.data.transactions);
};

// Render
{failedDeposits.map(tx => (
    <div key={tx.id} className={`transaction-item ${tx.status}`}>
        <div className="tx-info">
            <span className="tx-amount">
                {formatCurrency(tx.amount, tx.currency)}
            </span>
            <span className="tx-method">{tx.payment_method}</span>
            <span className="tx-date">
                {new Date(tx.created_at).toLocaleDateString()}
            </span>
        </div>
        <span className={`tx-status ${tx.status}`}>
            {tx.status === 'failed' ? '❌ Thất bại' : '⏳ Đang chờ'}
        </span>
    </div>
))}
```

## Testing

### 1. Test Thống Kê
```bash
# Lấy thống kê ví
curl -X GET http://localhost:3001/wallet/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Kiểm tra các trường mới
# - failed_deposit_amount
# - pending_deposit_amount
# - total_failed_deposits
# - total_pending_deposits
```

### 2. Test Danh Sách Giao Dịch
```bash
# Lấy tất cả failed và pending
curl -X GET http://localhost:3001/wallet/deposits/failed-pending \
  -H "Authorization: Bearer YOUR_TOKEN"

# Chỉ lấy failed
curl -X GET "http://localhost:3001/wallet/deposits/failed-pending?status=failed" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Chỉ lấy pending
curl -X GET "http://localhost:3001/wallet/deposits/failed-pending?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Lợi Ích

### Cho Người Dùng
1. ✅ **Minh bạch:** Biết chính xác số tiền nạp thất bại
2. ✅ **Kiểm soát:** Theo dõi các giao dịch đang chờ xử lý
3. ✅ **Tin cậy:** Xác nhận số tiền thực tế được cộng vào ví

### Cho Admin/Developer
1. ✅ **Phân tích:** Thống kê tỷ lệ thành công/thất bại
2. ✅ **Debug:** Dễ dàng xác định vấn đề với payment gateway
3. ✅ **Cải thiện:** Tối ưu hóa quy trình thanh toán dựa trên dữ liệu

## Tóm Tắt

| Câu Hỏi | Trả Lời |
|---------|---------|
| Số tiền failed có được tính vào tổng? | ❌ KHÔNG |
| Số tiền pending có được tính vào tổng? | ❌ KHÔNG |
| Có thể theo dõi số tiền failed? | ✅ CÓ (thông qua `failed_deposit_amount`) |
| Có thể xem danh sách giao dịch failed? | ✅ CÓ (endpoint `/deposits/failed-pending`) |
| Có tự động chuyển đổi tiền tệ? | ✅ CÓ (USD ↔ VND) |

## Kết Luận

Hệ thống hiện tại đã đảm bảo:
- ✅ **Tính chính xác:** Chỉ giao dịch thành công được tính vào tổng
- ✅ **Tính minh bạch:** Theo dõi đầy đủ các giao dịch không thành công
- ✅ **Tính nhất quán:** Chuyển đổi tiền tệ được áp dụng đồng bộ cho tất cả số liệu
