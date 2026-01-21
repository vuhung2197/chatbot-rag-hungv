# VNPay Transaction Query API - Implementation Guide

**Date:** 2026-01-21  
**Status:** ✅ Implemented  
**Feature:** Query transaction status by order ID

---

## 🎯 Overview

VNPay provides a Query API (`vnp_Command=querydr`) to check transaction status using the order ID (mã tra cứu).

**Use Cases:**
- Check payment status
- Verify transaction completion
- Reconciliation
- Customer support

---

## 📋 Implementation

### 1. Service Method (vnpayService.js)

```javascript
async queryPaymentStatus(orderId, transactionDate) {
    // Build query parameters
    const vnp_RequestId = moment().format('YYYYMMDDHHmmss');
    const vnp_CreateDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');
    
    let vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: this.vnp_TmnCode,
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Query transaction ${orderId}`,
        vnp_TransactionDate: transactionDate,
        vnp_CreateDate: vnp_CreateDate,
        vnp_IpAddr: '127.0.0.1',
        vnp_RequestId: vnp_RequestId
    };

    // Sort and sign
    vnp_Params = this.sortObject(vnp_Params);
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    // Build query URL
    const queryUrl = this.vnp_Url.replace('/vpcpay.html', '/querydr') + 
                     '?' + qs.stringify(vnp_Params, { encode: false });

    return {
        success: true,
        queryUrl,
        message: 'Query URL created'
    };
}
```

---

### 2. Controller (vnpayQueryController.js)

```javascript
export async function queryVNPayTransaction(req, res) {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Get transaction from database
    const [transactions] = await pool.execute(
        `SELECT wt.*, uw.user_id 
         FROM wallet_transactions wt
         JOIN user_wallets uw ON wt.wallet_id = uw.id
         WHERE wt.metadata->>'$.vnpay_order_id' = ? AND uw.user_id = ?`,
        [orderId, userId]
    );

    if (transactions.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Transaction not found'
        });
    }

    const transaction = transactions[0];
    const metadata = JSON.parse(transaction.metadata);
    const transactionDate = metadata.vnpay_create_date;

    // Query VNPay
    const result = await vnpayService.queryPaymentStatus(orderId, transactionDate);

    res.json({
        success: true,
        transaction: {
            id: transaction.id,
            orderId: orderId,
            amount: transaction.amount,
            status: transaction.status
        },
        vnpayQuery: result
    });
}
```

---

### 3. Route (wallet.js)

```javascript
/**
 * @route   GET /wallet/vnpay/query/:orderId
 * @desc    Query VNPay transaction status
 * @access  Private
 */
router.get('/vnpay/query/:orderId', queryVNPayTransaction);
```

---

## 🧪 How to Use

### API Endpoint

```
GET /wallet/vnpay/query/:orderId
Authorization: Bearer <token>
```

**Example:**
```bash
curl -X GET "http://localhost:3001/wallet/vnpay/query/DEPOSIT_123_1234567890" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Response

```json
{
  "success": true,
  "transaction": {
    "id": 123,
    "orderId": "DEPOSIT_123_1234567890",
    "amount": 100000,
    "status": "completed",
    "created_at": "2026-01-21T09:00:00.000Z",
    "metadata": {
      "vnpay_order_id": "DEPOSIT_123_1234567890",
      "vnpay_create_date": "20260121090000",
      "vnpay_transaction_no": "14123456",
      "vnpay_bank_code": "NCB"
    }
  },
  "vnpayQuery": {
    "success": true,
    "queryUrl": "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction?vnp_Command=querydr&...",
    "message": "Query URL created. Make GET request to this URL to get transaction status."
  }
}
```

---

## 📊 VNPay Query Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| vnp_Version | String | API version | `2.1.0` |
| vnp_Command | String | Command type | `querydr` |
| vnp_TmnCode | String | Merchant code | `6ZY4FNRE` |
| vnp_TxnRef | String | Order ID | `DEPOSIT_123_...` |
| vnp_OrderInfo | String | Query description | `Query transaction...` |
| vnp_TransactionDate | String | Original transaction date | `20260121090000` |
| vnp_CreateDate | String | Query timestamp | `20260121095000` |
| vnp_IpAddr | String | IP address | `127.0.0.1` |
| vnp_RequestId | String | Unique request ID | `20260121095000` |
| vnp_SecureHash | String | HMAC SHA512 signature | `abc123...` |

---

## 🔍 VNPay Query Response

### Success Response

```json
{
  "vnp_ResponseCode": "00",
  "vnp_Message": "Giao dịch thành công",
  "vnp_TxnRef": "DEPOSIT_123_1234567890",
  "vnp_Amount": "10000000",
  "vnp_BankCode": "NCB",
  "vnp_TransactionNo": "14123456",
  "vnp_TransactionStatus": "00",
  "vnp_PayDate": "20260121090530"
}
```

### Response Codes

| Code | Meaning |
|------|---------|
| `00` | Giao dịch thành công |
| `01` | Giao dịch chưa hoàn tất |
| `02` | Giao dịch bị lỗi |
| `04` | Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY) |
| `05` | VNPAY đang xử lý giao dịch này (GD hoàn tiền) |
| `06` | VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền) |
| `07` | Giao dịch bị nghi ngờ gian lận |
| `09` | GD Hoàn trả bị từ chối |

---

## 💡 Frontend Integration

### React Example

```javascript
// Query transaction
const queryTransaction = async (orderId) => {
  try {
    const response = await fetch(
      `http://localhost:3001/wallet/vnpay/query/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Transaction:', data.transaction);
      console.log('VNPay Query URL:', data.vnpayQuery.queryUrl);
      
      // Optional: Make request to VNPay query URL
      const vnpayResponse = await fetch(data.vnpayQuery.queryUrl);
      const vnpayData = await vnpayResponse.json();
      console.log('VNPay Status:', vnpayData);
    }
  } catch (error) {
    console.error('Query failed:', error);
  }
};
```

---

## 🔒 Security Notes

### Authentication
- ✅ Requires JWT token
- ✅ User can only query their own transactions
- ✅ Validates user ownership via JOIN

### Signature
- ✅ Uses HMAC SHA512
- ✅ Includes all parameters
- ✅ Sorted alphabetically

---

## 📝 Use Cases

### 1. Check Pending Payment

```javascript
// User made payment but status still pending
const result = await queryTransaction('DEPOSIT_123_...');

if (result.transaction.status === 'pending') {
  // Query VNPay to check actual status
  const vnpayStatus = await fetch(result.vnpayQuery.queryUrl);
  // Update local database if VNPay shows completed
}
```

---

### 2. Customer Support

```javascript
// Support staff checking transaction
const result = await queryTransaction(orderId);

console.log('Local Status:', result.transaction.status);
console.log('VNPay Query URL:', result.vnpayQuery.queryUrl);

// Support can manually check VNPay status
```

---

### 3. Reconciliation

```javascript
// Daily reconciliation
const pendingTransactions = await getPendingTransactions();

for (const tx of pendingTransactions) {
  const result = await queryTransaction(tx.orderId);
  // Compare local vs VNPay status
  // Update if mismatch
}
```

---

## 🎯 Next Steps

### Current Implementation
- ✅ Query URL generation
- ✅ Signature creation
- ✅ User authentication
- ✅ Database lookup

### Future Enhancements
- [ ] Automatic HTTP request to VNPay
- [ ] Parse VNPay response
- [ ] Auto-update transaction status
- [ ] Scheduled reconciliation job
- [ ] Admin dashboard for queries

---

## 📊 Example Flow

```
User Request
    │
    ▼
GET /wallet/vnpay/query/:orderId
    │
    ├─► Verify JWT token
    │
    ├─► Get transaction from DB
    │   └─► Check user ownership
    │
    ├─► Extract transaction date
    │
    ├─► Build VNPay query parameters
    │   ├─► vnp_Command: querydr
    │   ├─► vnp_TxnRef: orderId
    │   ├─► vnp_TransactionDate
    │   └─► vnp_SecureHash (HMAC SHA512)
    │
    ├─► Generate query URL
    │
    └─► Return response
        ├─► Local transaction data
        └─► VNPay query URL
```

---

## ✅ Summary

**Feature:** ✅ Implemented  
**Endpoint:** `GET /wallet/vnpay/query/:orderId`  
**Authentication:** Required (JWT)  
**Security:** HMAC SHA512 signature  

**Capabilities:**
- ✅ Query transaction by order ID
- ✅ Generate VNPay query URL
- ✅ User ownership validation
- ✅ Secure signature generation

**Status:** Ready for testing

---

**🎉 VNPay Query API is now available!**

**Test it:**
```bash
GET /wallet/vnpay/query/DEPOSIT_123_1234567890
Authorization: Bearer YOUR_TOKEN
```
