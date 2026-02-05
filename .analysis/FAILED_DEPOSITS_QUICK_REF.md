# 📋 QUICK REFERENCE - Failed Deposits API

## 🔍 Kiểm Tra Nhanh

### Câu Hỏi: Failed deposits có được tính vào tổng không?
```
❌ KHÔNG - Chỉ status='completed' được tính
```

---

## 📡 API Endpoints

### 1. Lấy Thống Kê Ví
```http
GET /wallet/stats
Authorization: Bearer {token}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `total_deposits` | number | ✅ Tổng nạp thành công |
| `failed_deposit_amount` | number | ❌ Tổng nạp thất bại |
| `pending_deposit_amount` | number | ⏳ Tổng đang chờ |
| `total_failed_deposits` | number | ❌ Số lần thất bại |
| `total_pending_deposits` | number | ⏳ Số lần chờ |

### 2. Lấy Danh Sách Failed/Pending
```http
GET /wallet/deposits/failed-pending
GET /wallet/deposits/failed-pending?status=failed
GET /wallet/deposits/failed-pending?status=pending
Authorization: Bearer {token}
```

**Response:**
```json
{
  "transactions": [...],
  "total": 5,
  "currency": "VND"
}
```

---

## 💰 Chuyển Đổi Tiền Tệ

| From | To | Rate | Example |
|------|-----|------|---------|
| USD | VND | × 24,000 | $100 → ₫2,400,000 |
| VND | USD | ÷ 24,000 | ₫2,400,000 → $100 |

**Auto-conversion:**
- ✅ `total_deposits`
- ✅ `total_spent`
- ✅ `failed_deposit_amount`
- ✅ `pending_deposit_amount`
- ✅ Transaction amounts

---

## 📊 Transaction Status

| Status | Icon | Counted? | Added to Balance? |
|--------|------|----------|-------------------|
| `completed` | ✅ | YES | YES |
| `failed` | ❌ | NO | NO |
| `pending` | ⏳ | NO | NO |

---

## 🔧 Testing Commands

### Test Stats Endpoint
```bash
curl -X GET http://localhost:3001/wallet/stats \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

### Test Failed/Pending List
```bash
# All
curl -X GET http://localhost:3001/wallet/deposits/failed-pending \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Failed only
curl -X GET "http://localhost:3001/wallet/deposits/failed-pending?status=failed" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Pending only  
curl -X GET "http://localhost:3001/wallet/deposits/failed-pending?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

---

## ✅ Verification Checklist

- [ ] Failed deposits NOT in `total_deposits` ✓
- [ ] Failed deposits tracked in `failed_deposit_amount` ✓
- [ ] Pending deposits NOT in `total_deposits` ✓
- [ ] Pending deposits tracked in `pending_deposit_amount` ✓
- [ ] Currency conversion applies to all amounts ✓
- [ ] Can filter by status (failed/pending) ✓

---

## 📁 Modified Files

```
backend/
├── controllers/
│   └── walletController.js      ← Updated getWalletStats()
│                                 ← Added getFailedAndPendingDeposits()
└── routes/
    └── wallet.js                 ← Added new route
```

---

## 🎯 Key Points

1. ✅ **Accuracy:** Only completed deposits count towards total
2. ✅ **Transparency:** Failed/pending deposits are tracked separately
3. ✅ **Currency:** All amounts auto-convert to wallet currency
4. ✅ **Management:** Can view detailed list of failed/pending
5. ✅ **Integrity:** Balance always matches completed transactions

---

💡 **Pro Tip:** Use `status=failed` query param to debug payment gateway issues!
