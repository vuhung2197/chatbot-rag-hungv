// Wallet translations
export const walletTranslations = {
    vi: {
        // WalletDashboard
        myWallet: 'Ví của tôi',
        depositFunds: 'Nạp tiền',
        loadingWallet: 'Đang tải ví...',
        tryAgain: 'Thử lại',
        availableBalance: 'Số dư khả dụng',
        active: 'Hoạt động',
        inactive: 'Không hoạt động',
        unknown: 'Không rõ',
        deposit: 'Nạp tiền',
        withdraw: 'Rút tiền',
        soon: 'Sớm',
        totalDeposits: 'Tổng nạp',
        totalSpent: 'Tổng chi',
        transactions: 'Giao dịch',

        // Payment Status
        paymentSuccessful: 'Thanh toán thành công!',
        paymentFailed: 'Thanh toán thất bại',
        paymentCancelled: 'Đã hủy thanh toán',
        hasBeenAdded: 'đã được thêm vào ví của bạn.',
        paymentCouldNotBeProcessed: 'Không thể xử lý thanh toán của bạn.',
        youCancelledPayment: 'Bạn đã hủy thanh toán.',

        // DepositModal
        depositTitle: 'Nạp tiền',
        currentBalance: 'Số dư hiện tại:',
        amount: 'Số tiền',
        enterAmount: 'Nhập số tiền',
        min: 'Tối thiểu',
        max: 'Tối đa',
        quickSelect: 'Chọn nhanh:',
        paymentMethod: 'Phương thức thanh toán',
        cancel: 'Hủy',
        continueToPayment: 'Tiếp tục thanh toán',
        processing: 'Đang xử lý...',
        securePayment: 'Thanh toán của bạn được bảo mật và mã hóa',
        pleaseEnterValidAmount: 'Vui lòng nhập số tiền hợp lệ',
        minimumDeposit: 'Số tiền nạp tối thiểu là',
        maximumDeposit: 'Số tiền nạp tối đa là',

        // TransactionHistory
        transactionHistory: 'Lịch sử giao dịch',
        all: 'Tất cả',
        deposits: 'Nạp tiền',
        purchases: 'Mua hàng',
        subscriptions: 'Đăng ký',
        noTransactions: 'Chưa có giao dịch',
        transactionHistoryWillAppear: 'Lịch sử giao dịch sẽ xuất hiện ở đây',
        loadingTransactions: 'Đang tải giao dịch...',

        // Transaction Status
        completed: 'Hoàn thành',
        pending: 'Đang xử lý',
        failed: 'Thất bại',
        cancelled: 'Đã hủy',

        // Pagination
        previous: 'Trước',
        next: 'Tiếp',
        pageOf: 'Trang',
        of: 'của',

        // Currency
        currency: 'Đơn vị tiền tệ',
        changeCurrency: 'Đổi đơn vị tiền tệ',
        from: 'Từ',
        to: 'Sang',
        exchangeRate: 'Tỷ giá',
        currencyChangeWarning: 'Số dư của bạn sẽ được chuyển đổi sang đơn vị tiền tệ mới. Hành động này không thể hoàn tác.',
        confirm: 'Xác nhận',
        currencyChanged: 'Đã đổi đơn vị tiền tệ',
        currencyChangedTo: 'Đã chuyển sang',
        newBalance: 'Số dư mới',
        subscriptionUpgrade: 'Nâng cấp gói',
        monthly: 'tháng',
        yearly: 'năm',
        currencyChangedFrom: 'Đổi tiền tệ từ'
    },
    en: {
        // WalletDashboard
        myWallet: 'My Wallet',
        depositFunds: 'Deposit Funds',
        loadingWallet: 'Loading wallet...',
        tryAgain: 'Try Again',
        availableBalance: 'Available Balance',
        active: 'Active',
        inactive: 'Inactive',
        unknown: 'Unknown',
        deposit: 'Deposit',
        withdraw: 'Withdraw',
        soon: 'Soon',
        totalDeposits: 'Total Deposits',
        totalSpent: 'Total Spent',
        transactions: 'Transactions',

        // Payment Status
        paymentSuccessful: 'Payment Successful!',
        paymentFailed: 'Payment Failed',
        paymentCancelled: 'Payment Cancelled',
        hasBeenAdded: 'has been added to your wallet.',
        paymentCouldNotBeProcessed: 'Your payment could not be processed.',
        youCancelledPayment: 'You cancelled the payment.',

        // DepositModal
        depositTitle: 'Deposit Funds',
        currentBalance: 'Current Balance:',
        amount: 'Amount',
        enterAmount: 'Enter amount',
        min: 'Min',
        max: 'Max',
        quickSelect: 'Quick Select:',
        paymentMethod: 'Payment Method',
        cancel: 'Cancel',
        continueToPayment: 'Continue to Payment',
        processing: 'Processing...',
        securePayment: 'Your payment is secure and encrypted',
        pleaseEnterValidAmount: 'Please enter a valid amount',
        minimumDeposit: 'Minimum deposit is',
        maximumDeposit: 'Maximum deposit is',

        // TransactionHistory
        transactionHistory: 'Transaction History',
        all: 'All',
        deposits: 'Deposits',
        purchases: 'Purchases',
        subscriptions: 'Subscriptions',
        noTransactions: 'No transactions yet',
        transactionHistoryWillAppear: 'Your transaction history will appear here',
        loadingTransactions: 'Loading transactions...',

        // Transaction Status
        completed: 'Completed',
        pending: 'Pending',
        failed: 'Failed',
        cancelled: 'Cancelled',

        // Pagination
        previous: 'Previous',
        next: 'Next',
        pageOf: 'Page',
        of: 'of',

        // Currency
        currency: 'Currency',
        changeCurrency: 'Change Currency',
        from: 'From',
        to: 'To',
        exchangeRate: 'Exchange Rate',
        currencyChangeWarning: 'Your balance will be converted to the new currency. This action cannot be undone.',
        confirm: 'Confirm',
        currencyChanged: 'Currency Changed',
        currencyChangedTo: 'Changed to',
        newBalance: 'New balance',
        subscriptionUpgrade: 'Subscription upgrade to',
        monthly: 'monthly',
        yearly: 'yearly',
        currencyChangedFrom: 'Currency changed from'
    }
};

// Helper function to get translation
export const getWalletText = (key, language = 'vi') => {
    return walletTranslations[language]?.[key] || walletTranslations.en[key] || key;
};
