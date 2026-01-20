# Frontend Integration Guide - Wallet System

**Date:** 2026-01-20  
**Version:** 1.0  
**Status:** Complete

---

## 📋 Quick Start

### Step 1: Add Route to App.js

```javascript
// In App.js
import WalletDashboard from './component/WalletDashboard';

// Add route
<Route path="/wallet" element={<WalletDashboard />} />
```

### Step 2: Add Navigation Link

```javascript
// In your navigation component
<Link to="/wallet" className="nav-link">
  <i className="fas fa-wallet"></i>
  Wallet
</Link>
```

### Step 3: Verify Backend is Running

```bash
# Check backend status
docker-compose ps backend

# Should see: Up and running on port 3001
```

---

## 🔧 Complete Integration Steps

### 1. Update App.js

**File:** `frontend/src/App.js`

Add import:
```javascript
import WalletDashboard from './component/WalletDashboard';
```

Add route (inside `<Routes>`):
```javascript
<Route path="/wallet" element={<WalletDashboard />} />
```

### 2. Add Navigation Link

**Option A: In Main Navigation**
```javascript
<nav className="main-nav">
  <Link to="/">Home</Link>
  <Link to="/chat">Chat</Link>
  <Link to="/wallet">
    <i className="fas fa-wallet"></i>
    Wallet
  </Link>
  <Link to="/profile">Profile</Link>
</nav>
```

**Option B: In User Menu**
```javascript
<div className="user-menu">
  <Link to="/profile">
    <i className="fas fa-user"></i>
    Profile
  </Link>
  <Link to="/wallet">
    <i className="fas fa-wallet"></i>
    My Wallet
  </Link>
  <Link to="/subscription">
    <i className="fas fa-crown"></i>
    Subscription
  </Link>
</div>
```

### 3. Add Font Awesome Icons

If not already included, add to `public/index.html`:

```html
<link 
  rel="stylesheet" 
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
/>
```

### 4. Optional: Add Payment Method Endpoint

**Backend:** Add to `walletController.js`

```javascript
export async function getPaymentMethods(req, res) {
    try {
        const [methods] = await pool.execute(
            `SELECT id, name, display_name, description, 
                    min_amount, max_amount, currency, is_active
             FROM payment_methods
             WHERE is_active = TRUE
             ORDER BY name ASC`
        );
        res.json(methods);
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({ message: 'Error getting payment methods' });
    }
}
```

**Routes:** Add to `wallet.js`

```javascript
router.get('/payment-methods', getPaymentMethods);
```

---

## 🎨 Styling Customization

### Color Scheme

You can customize colors in CSS files:

**Primary Color:**
```css
/* Change from #4f46e5 to your brand color */
.btn-deposit {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR_DARK 100%);
}
```

**Balance Card Gradient:**
```css
.wallet-balance-card {
  background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
}
```

### Responsive Breakpoints

Current breakpoints:
- Mobile: `max-width: 640px`
- Tablet: `max-width: 768px`
- Desktop: `1200px` max-width

---

## 🧪 Testing Checklist

### Before Testing
- [ ] Backend is running
- [ ] Database has wallet tables
- [ ] User is logged in
- [ ] JWT token is valid

### Test Scenarios

#### 1. View Wallet
```
1. Navigate to /wallet
2. Should see balance card
3. Should see statistics
4. Should see empty transaction list (if new)
```

#### 2. Deposit Flow
```
1. Click "Deposit Funds"
2. Modal should open
3. Enter amount (e.g., 100000 VND)
4. Select payment method (VNPay or MoMo)
5. Click "Continue to Payment"
6. Should redirect to payment gateway
7. Complete payment in sandbox
8. Should redirect back with success message
9. Balance should update
10. Transaction should appear in history
```

#### 3. Transaction History
```
1. Should see recent transactions
2. Click filter tabs (All, Deposits, etc.)
3. Should filter correctly
4. If >10 transactions, pagination should work
```

#### 4. Error Handling
```
1. Try deposit with invalid amount (e.g., -100)
2. Should show error message
3. Try deposit without payment method
4. Should disable submit button
```

---

## 🔌 API Endpoints Reference

### Wallet Endpoints

```javascript
// Get wallet info
GET /wallet
Headers: { Authorization: 'Bearer TOKEN' }
Response: { wallet: { id, balance, currency, status, ... } }

// Get statistics
GET /wallet/stats
Headers: { Authorization: 'Bearer TOKEN' }
Response: { total_deposits, total_spent, total_transactions, ... }

// Get transactions
GET /wallet/transactions?page=1&limit=10&type=deposit
Headers: { Authorization: 'Bearer TOKEN' }
Response: { transactions: [...], pagination: {...} }

// Create deposit
POST /wallet/deposit
Headers: { Authorization: 'Bearer TOKEN' }
Body: { amount: 100000, currency: 'VND', payment_method: 'vnpay' }
Response: { transaction_id, payment_url, ... }

// Get payment methods (optional)
GET /wallet/payment-methods
Headers: { Authorization: 'Bearer TOKEN' }
Response: [{ name, display_name, min_amount, max_amount, ... }]
```

### Payment Callbacks (Public)

```javascript
// VNPay return
GET /wallet/vnpay/return?vnp_Amount=...&vnp_SecureHash=...
No auth required
Redirects to: /wallet?payment=success&amount=100

// VNPay IPN
GET /wallet/vnpay/ipn?vnp_Amount=...&vnp_SecureHash=...
No auth required
Response: { RspCode: '00', Message: 'Confirm Success' }

// MoMo return
GET /wallet/momo/return?orderId=...&signature=...
No auth required
Redirects to: /wallet?payment=success&amount=100

// MoMo IPN
POST /wallet/momo/ipn
Body: { orderId, transId, resultCode, signature, ... }
No auth required
Response: { status: 0, message: 'Success' }
```

---

## 🐛 Troubleshooting

### Issue: "Failed to load wallet data"

**Causes:**
- Backend not running
- Invalid JWT token
- Database connection error

**Solutions:**
```bash
# Check backend
docker-compose ps backend
docker-compose logs backend --tail=20

# Check token in localStorage
console.log(localStorage.getItem('token'))

# Try logout and login again
```

### Issue: "Payment URL not received"

**Causes:**
- Payment gateway credentials not configured
- Invalid amount
- Payment method not active

**Solutions:**
```bash
# Check .env file
cat backend/.env | grep VNPAY
cat backend/.env | grep MOMO

# Check payment methods in database
docker-compose exec db mysql -u root -p123456 chatbot \
  -e "SELECT * FROM payment_methods WHERE is_active = TRUE;"
```

### Issue: "Balance not updating after payment"

**Causes:**
- Callback not received
- Signature verification failed
- Transaction already processed

**Solutions:**
```bash
# Check backend logs
docker-compose logs backend --tail=50 | grep -i "payment\|callback"

# Check transaction status
docker-compose exec db mysql -u root -p123456 chatbot \
  -e "SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 5;"

# Manually trigger callback (testing only)
curl -X POST http://localhost:3001/wallet/payment-callback \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": 1, "status": "success", "gateway_id": "test"}'
```

---

## 📱 Mobile Responsive

All components are mobile-responsive:

- **Wallet Dashboard:** Stacks vertically on mobile
- **Deposit Modal:** Full-width on small screens
- **Transaction List:** Simplified layout on mobile
- **Filter Tabs:** Horizontal scroll on mobile

Test on different screen sizes:
- Mobile: 375px width
- Tablet: 768px width
- Desktop: 1200px width

---

## ♿ Accessibility

Components follow accessibility best practices:

- ✅ Semantic HTML
- ✅ ARIA labels where needed
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Color contrast (WCAG AA)
- ✅ Screen reader friendly

---

## 🚀 Performance Tips

### Optimize API Calls

```javascript
// Use React Query or SWR for caching
import { useQuery } from 'react-query';

const { data: wallet } = useQuery('wallet', fetchWallet, {
  staleTime: 30000, // 30 seconds
  cacheTime: 300000 // 5 minutes
});
```

### Lazy Load Components

```javascript
// In App.js
const WalletDashboard = lazy(() => import('./component/WalletDashboard'));

<Suspense fallback={<Loading />}>
  <Route path="/wallet" element={<WalletDashboard />} />
</Suspense>
```

### Optimize Images

```javascript
// Use WebP format for icons
<img src="payment-icon.webp" alt="Payment" loading="lazy" />
```

---

## 📊 Analytics Integration

### Track Wallet Events

```javascript
// In WalletDashboard.js
useEffect(() => {
  // Track page view
  analytics.track('Wallet Viewed', {
    balance: wallet?.balance,
    currency: wallet?.currency
  });
}, [wallet]);

// In DepositModal.js
const handleSubmit = async (e) => {
  // Track deposit initiation
  analytics.track('Deposit Initiated', {
    amount,
    payment_method,
    currency
  });
  
  // ... rest of code
};
```

---

## 🎯 Next Steps

### After Integration

1. **Test thoroughly**
   - All payment methods
   - Different amounts
   - Error scenarios
   - Mobile devices

2. **Get payment gateway credentials**
   - VNPay sandbox: https://sandbox.vnpayment.vn/
   - MoMo test: https://business.momo.vn/

3. **Configure webhooks**
   - Use ngrok for local testing
   - Set up public URLs for production

4. **Monitor & optimize**
   - Track conversion rates
   - Monitor error rates
   - Optimize performance

---

## 📚 Additional Resources

- **Backend API Docs:** `.analysis/WALLET_API_TEST_GUIDE.md`
- **Phase 2 Summary:** `.analysis/PHASE2_COMPLETE_SUMMARY.md`
- **VNPay Docs:** https://sandbox.vnpayment.vn/apis/
- **MoMo Docs:** https://developers.momo.vn/

---

**Integration Complete!** 🎉

Your wallet system is now ready to use. Test thoroughly and deploy with confidence!
