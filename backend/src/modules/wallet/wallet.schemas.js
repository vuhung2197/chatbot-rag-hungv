import { z } from 'zod';

// ─── Deposit ───
export const createDepositSchema = {
    body: z.object({
        // z.coerce.number() để chấp nhận cả string "100000" từ frontend
        amount: z.coerce
            .number('Amount must be a number')
            .positive('Amount must be positive')
            .max(100_000_000, 'Amount too large'),
        // currency có thể null/undefined từ frontend → fallback 'USD'
        currency: z.enum(['USD', 'VND']).nullable().optional().default('USD')
            .transform(v => v ?? 'USD'),
        // Lấy từ DB: vnpay, momo, stripe, paypal, bank_transfer
        payment_method: z.string().min(1, 'Payment method is required')
    })
};

// ─── Withdrawal ───
export const withdrawSchema = {
    body: z.object({
        bank_account_id: z.coerce
            .number('Bank account ID must be a number')
            .int('Bank account ID must be an integer')
            .positive('Bank account ID must be positive'),
        amount: z.coerce
            .number('Amount must be a number')
            .positive('Amount must be positive')
    })
};

export const calculateFeeSchema = {
    body: z.object({
        amount: z.coerce
            .number('Amount must be a number')
            .positive('Amount must be positive')
    })
};

// ─── Bank Account ───
export const addBankAccountSchema = {
    body: z.object({
        bank_code: z.string().min(2, 'Bank code too short').max(20, 'Bank code too long'),
        bank_name: z.string().min(2, 'Bank name too short').max(100, 'Bank name too long'),
        account_number: z.string()
            .min(5, 'Account number too short')
            .max(30, 'Account number too long')
            .regex(/^[0-9]+$/, 'Account number must be numeric'),
        account_holder_name: z.string()
            .min(2, 'Name too short')
            .max(100, 'Name too long'),
        branch_name: z.string().max(100).optional()
    })
};

export const deleteBankAccountSchema = {
    params: z.object({
        id: z.coerce.number().int().positive('Invalid bank account ID')
    })
};

// ─── Wallet Currency ───
export const updateCurrencySchema = {
    body: z.object({
        currency: z.string().min(3, 'Invalid currency').max(3, 'Invalid currency')
    })
};

// ─── Transactions Query ───
export const getTransactionsSchema = {
    query: z.object({
        page: z.coerce.number().int().positive().optional().default(1),
        limit: z.coerce.number().int().positive().max(100).optional().default(20),
        type: z.enum(['deposit', 'withdrawal', 'purchase', 'subscription']).optional()
    })
};

// ─── Failed/Pending Deposits Query ───
export const getFailedPendingSchema = {
    query: z.object({
        status: z.enum(['failed', 'pending']).optional()
    })
};

// ─── VNPay Query ───
export const queryVnpaySchema = {
    params: z.object({
        orderId: z.string().min(1, 'Order ID is required')
    })
};
