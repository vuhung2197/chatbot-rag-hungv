export const WALLET_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    LOCKED: 'locked'
};

export const TRANSACTION_TYPE = {
    DEPOSIT: 'deposit',
    WITHDRAW: 'withdraw',
    PURCHASE: 'purchase',
    SUBSCRIPTION: 'subscription'
};

export const TRANSACTION_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

export const CURRENCY = {
    USD: 'USD',
    VND: 'VND'
};

export const DEFAULTS = {
    CURRENCY: 'USD',
    BALANCE: 0.00
};

export const ACTIONS = {
    CURRENCY_CHANGE: 'currency_change'
};

export const WITHDRAWAL_FEE_USD = 0.5;

export const PAYMENT_METHOD = {
    VNPAY: 'vnpay',
    MOMO: 'momo',
    BANK_TRANSFER: 'bank_transfer'
};
