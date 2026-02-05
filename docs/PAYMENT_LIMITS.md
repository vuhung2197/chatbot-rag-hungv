## Hướng Dẫn Cập Nhật Giới Hạn Nạp Tiền

### 📊 **GIỚI HẠN HIỆN TẠI**

| Phương thức | Tối thiểu | Tối đa | Lý do giới hạn |
|------------|-----------|--------|----------------|
| **VNPay** | 10,000 VND | 50,000,000 VND | Giới hạn cứng từ VNPay/Ngân hàng |
| **MoMo** | 10,000 VND | 50,000,000 VND | Giới hạn cứng từ MoMo |
| **Stripe** | $0.50 | $999,999 | Có thể tùy chỉnh |
| **PayPal** | $0.50 | $10,000 | Có thể tùy chỉnh |

---

### ⚠️ **KHÔNG THỂ BỎ GIỚI HẠN HOÀN TOÀN**

**VNPay và MoMo có giới hạn BẮT BUỘC**:
- ❌ Không thể giảm dưới **10,000 VND** (1,000 VND = ~$0.04)
- ❌ Không thể tăng quá **50,000,000 VND/giao dịch** (50 triệu = ~$2,000)

Nếu cố tình gửi số tiền ngoài giới hạn này → **VNPay/MoMo sẽ từ chối** → Giao dịch thất bại.

---

### ✅ **CÁCH CẬP NHẬT (Nếu muốn thay đổi)**

#### **Bước 1: Cập nhật Database**

```bash
# Kết nối PostgreSQL
psql -U postgres -d chatbot

# Hoặc chạy file SQL
psql -U postgres -d chatbot -f db/update_payment_limits.sql
```

Hoặc bằng SQL trực tiếp:

```sql
-- Giữ nguyên giới hạn VNPay/MoMo (BẮT BUỘC)
UPDATE payment_methods 
SET min_amount = 10000.00, max_amount = 50000000.00
WHERE name IN ('vnpay', 'momo');

-- Giảm tối thiểu cho Stripe (tùy chọn)
UPDATE payment_methods 
SET min_amount = 0.50, max_amount = 999999.00
WHERE name = 'stripe';
```

#### **Bước 2: Khởi động lại Backend**

```bash
cd backend
npm start
```

---

### 🎯 **KHUYẾN NGHỊ**

1. **Giữ nguyên** giới hạn VNPay/MoMo (10k - 50M VND)
2. **Logic hiện tại ĐÃ ĐÚNG** - validation theo đúng giới hạn payment gateway
3. Nếu muốn cho phép nạp ít hơn → Dùng **Stripe** với minimum $0.50

---

### 💡 **GỢI Ý THAY THẾ**

Nếu muốn cho người dùng nạp số tiền nhỏ hơn 10,000 VND:

#### **Option 1: Thêm Stripe (hỗ trợ từ $0.50)**
```javascript
// Frontend cho phép chọn Stripe nếu amount < 10,000 VND
if (amountVND < 10000) {
    recommendedMethod = 'stripe'; // ~$0.50 = 12,500 VND
}
```

#### **Option 2: Bỏ qua validation (KHÔNG KHUYẾN NGHỊ)**
```javascript
// Trong walletController.js - COMMENT OUT validation
// if (amountForValidation < method.min_amount || ...) {
//     return res.status(400).json({...});
// }
```

⚠️ **Lưu ý**: Nếu bỏ validation, VNPay vẫn sẽ từ chối giao dịch < 10k VND, dẫn đến trải nghiệm xấu cho người dùng.

---

### 📝 **TÓM TẮT**

- ✅ **10,000 VND** là giới hạn tối thiểu BẮT BUỘC của VNPay/MoMo
- ✅ Code hiện tại **ĐÃ CHÍNH XÁC** (10k - 50M VND)
- ✅ Đã tạo file `update_payment_limits.sql` nếu cần adjust
- ❌ **KHÔNG NÊN** bỏ validation vì sẽ gây lỗi từ payment gateway
