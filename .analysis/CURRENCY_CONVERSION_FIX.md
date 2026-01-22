# Currency Conversion Fix for Wallet Statistics

## Problem Description

When the user's wallet currency is set to **VND**, the total deposits and total spent statistics were not being converted from USD to VND. This caused the statistics to display incorrect values.

### Root Cause

The `getWalletStats` endpoint in `walletController.js` was returning raw statistics from the database, where all transactions are stored in **USD**. When the frontend tried to format these values using the user's current currency (VND), it was simply applying VND formatting to USD amounts, resulting in incorrect displays.

For example:
- If a user deposited $100 USD (which became 2,400,000 VND after conversion)
- The database stored this as 100 USD in the transaction
- When wallet was switched to VND, the stats showed "100 VND" instead of "2,400,000 VND"

## Solution

Updated the `getWalletStats` function in `backend/controllers/walletController.js` to convert the statistics to the user's current wallet currency before sending them to the frontend.

### Code Changes

**File:** `backend/controllers/walletController.js`

**Before:**
```javascript
export async function getWalletStats(req, res) {
    // ... query database ...
    
    res.json(stats[0]);
}
```

**After:**
```javascript
export async function getWalletStats(req, res) {
    // ... query database ...
    
    const result = stats[0];
    
    // Convert total_deposits and total_spent to wallet currency if needed
    // Transactions are stored in USD, so convert to VND if wallet is in VND
    if (result.currency === 'VND') {
        result.total_deposits = currencyService.convertCurrency(
            parseFloat(result.total_deposits) || 0,
            'USD',
            'VND'
        );
        result.total_spent = currencyService.convertCurrency(
            parseFloat(result.total_spent) || 0,
            'USD',
            'VND'
        );
    }

    res.json(result);
}
```

## How It Works

1. **Database Storage:** All transactions remain stored in USD for consistency
2. **Currency Conversion:** When the wallet currency is VND, the backend converts the statistics using the exchange rate (1 USD = 24,000 VND)
3. **Frontend Display:** The frontend receives pre-converted values and applies the appropriate formatting

## Testing

To verify the fix:

1. **Create a wallet in USD** and make a deposit (e.g., $100)
2. **Switch to VND** using the currency selector
3. **Check the statistics:**
   - Total Deposits should show ~2,400,000 VND (not 100 VND)
   - Total Spent should show the correct VND amount
   - Balance should be correctly converted

## Exchange Rate

The current exchange rate is defined in `backend/services/currencyService.js`:
- **USD to VND:** 1 USD = 24,000 VND
- **VND to USD:** 1 VND = 0.0000417 USD

## Related Files

- `backend/controllers/walletController.js` - Contains the fix
- `backend/services/currencyService.js` - Currency conversion logic
- `frontend/src/component/WalletDashboard.js` - Displays the statistics
