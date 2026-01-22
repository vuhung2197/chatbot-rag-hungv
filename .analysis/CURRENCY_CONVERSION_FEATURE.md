# Currency Conversion Feature

## Overview
This feature allows users to switch between USD and VND currencies in their wallet. The balance is automatically converted using the current exchange rate.

## Features

### 1. **Currency Selector Component**
- Located at the top of the Wallet Dashboard
- Shows two currency options: USD ($) and VND (₫)
- Active currency is highlighted
- Click to switch between currencies

### 2. **Automatic Balance Conversion**
- When switching currencies, the balance is automatically converted
- Exchange rate: 1 USD = 24,000 VND (configurable)
- Conversion is logged in transaction history

### 3. **Confirmation Modal**
- Shows before/after currency and balance
- Displays current exchange rate
- Warning about irreversibility
- Requires user confirmation

## Backend Implementation

### New Files
- `backend/services/currencyService.js` - Currency conversion logic

### Updated Files
- `backend/controllers/walletController.js` - Added 3 new endpoints
- `backend/routes/wallet.js` - Added routes for currency operations

### New API Endpoints

#### 1. GET `/wallet/currencies`
Get supported currencies and exchange rates

**Response:**
```json
{
  "currencies": [
    {
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "decimals": 2
    },
    {
      "code": "VND",
      "name": "Vietnamese Dong",
      "symbol": "₫",
      "decimals": 0
    }
  ],
  "exchangeRates": {
    "USD_TO_VND": 24000,
    "VND_TO_USD": 0.00004166666666666667,
    "lastUpdated": "2026-01-22T03:10:00.000Z"
  }
}
```

#### 2. GET `/wallet/payment-methods`
Get available payment methods

**Response:**
```json
[
  {
    "name": "vnpay",
    "display_name": "VNPay",
    "provider": "vnpay",
    "min_amount": 10000,
    "max_amount": 50000000,
    "is_active": true
  },
  {
    "name": "momo",
    "display_name": "MoMo",
    "provider": "momo",
    "min_amount": 10000,
    "max_amount": 50000000,
    "is_active": true
  }
]
```

#### 3. PUT `/wallet/currency`
Update wallet currency (converts balance)

**Request:**
```json
{
  "currency": "VND"
}
```

**Response:**
```json
{
  "message": "Currency updated successfully",
  "wallet": {
    "balance": 240000,
    "currency": "VND",
    "oldBalance": 10,
    "oldCurrency": "USD"
  }
}
```

## Frontend Implementation

### New Files
- `frontend/src/component/CurrencySelector.js` - Currency selector component
- `frontend/src/styles/CurrencySelector.css` - Component styles

### Updated Files
- `frontend/src/component/WalletDashboard.js` - Integrated currency selector
- `frontend/src/utils/walletTranslations.js` - Added currency translations

### Component Usage

```jsx
import CurrencySelector from './CurrencySelector';

<CurrencySelector 
  currentCurrency={wallet?.currency || 'USD'}
  onCurrencyChange={handleCurrencyChange}
/>
```

## Database Changes

### Transaction Logging
When currency is changed, a transaction is created with:
- `type`: 'deposit'
- `amount`: 0
- `balance_before`: old balance
- `balance_after`: new balance (converted)
- `description`: "Currency changed from {old} to {new}"
- `metadata`: JSON with conversion details

Example metadata:
```json
{
  "action": "currency_change",
  "old_currency": "USD",
  "new_currency": "VND",
  "old_balance": 10.00,
  "new_balance": 240000,
  "exchange_rate": 24000,
  "changed_at": "2026-01-22T03:10:00.000Z"
}
```

## Exchange Rate Configuration

### Current Rate
- 1 USD = 24,000 VND
- 1 VND = 0.0000417 USD

### Updating Exchange Rate
The exchange rate can be updated programmatically:

```javascript
import currencyService from './services/currencyService.js';

// Update rate (admin only)
currencyService.updateExchangeRate(25000); // 1 USD = 25,000 VND
```

### Future Enhancement
- Integrate with external API for real-time rates
- Add admin panel to configure rates
- Support more currencies

## User Flow

1. User opens Wallet Dashboard
2. Sees current currency (USD or VND)
3. Clicks on desired currency button
4. Confirmation modal appears showing:
   - Current currency and balance
   - Target currency
   - Exchange rate
   - Converted balance preview
   - Warning message
5. User confirms or cancels
6. If confirmed:
   - Balance is converted
   - Wallet is updated
   - Transaction is logged
   - Success message shown
   - Dashboard refreshes

## Testing

### Test Cases

1. **Switch from USD to VND**
   - Balance: $10.00
   - Expected: ₫240,000

2. **Switch from VND to USD**
   - Balance: ₫240,000
   - Expected: $10.00

3. **Cancel currency change**
   - Currency and balance remain unchanged

4. **Same currency selection**
   - No change, returns current wallet info

5. **Invalid currency**
   - Returns 400 error with supported currencies

## Localization

### Vietnamese (vi)
- Đơn vị tiền tệ
- Đổi đơn vị tiền tệ
- Tỷ giá
- Xác nhận

### English (en)
- Currency
- Change Currency
- Exchange Rate
- Confirm

## Security Considerations

1. **Authentication Required**
   - All currency endpoints require valid JWT token
   - User can only change their own wallet currency

2. **Transaction Logging**
   - All currency changes are logged
   - Audit trail in `wallet_transactions` table

3. **Validation**
   - Currency must be in supported list
   - Balance conversion is atomic (database transaction)

4. **Rate Manipulation Prevention**
   - Exchange rates stored server-side
   - Client cannot modify rates

## Performance

- Currency conversion is O(1) operation
- Database update is atomic
- No external API calls (currently)
- Minimal impact on page load

## Future Enhancements

1. **Real-time Exchange Rates**
   - Integrate with forex API
   - Update rates periodically

2. **More Currencies**
   - EUR, GBP, JPY, etc.
   - Multi-currency support

3. **Exchange Rate History**
   - Track rate changes over time
   - Show historical conversions

4. **Admin Panel**
   - Configure exchange rates
   - Set conversion fees
   - View currency statistics

5. **Currency Preference**
   - Save user's preferred currency
   - Auto-select on login

## Troubleshooting

### Issue: Currency not changing
- Check browser console for errors
- Verify JWT token is valid
- Check backend logs for errors

### Issue: Wrong conversion amount
- Verify exchange rate in `currencyService.js`
- Check database for correct balance

### Issue: Modal not showing
- Check CurrencySelector component is imported
- Verify CSS is loaded
- Check browser console for errors
