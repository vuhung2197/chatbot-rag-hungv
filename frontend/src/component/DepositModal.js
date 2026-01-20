import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { getWalletText } from '../utils/walletTranslations';
import '../styles/DepositModal.css';

const DepositModal = ({ onClose, onSuccess, currentBalance, currency = 'USD' }) => {
    const { language } = useLanguage();
    const t = (key) => getWalletText(key, language);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('vnpay');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const fetchPaymentMethods = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/wallet/payment-methods', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const activeMethods = response.data.filter(m => m.is_active);
            setPaymentMethods(activeMethods);

            if (activeMethods.length > 0) {
                setPaymentMethod(activeMethods[0].name);
            }
        } catch (err) {
            console.error('Error fetching payment methods:', err);
            // Use default methods if API fails
            setPaymentMethods([
                { name: 'vnpay', display_name: 'VNPay', min_amount: 10000, max_amount: 50000000 },
                { name: 'momo', display_name: 'MoMo', min_amount: 10000, max_amount: 50000000 }
            ]);
        }
    };

    const selectedMethod = paymentMethods.find(m => m.name === paymentMethod);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const depositAmount = parseFloat(amount);

        // Validation
        if (!depositAmount || depositAmount <= 0) {
            setError(t('pleaseEnterValidAmount'));
            return;
        }

        if (selectedMethod) {
            if (depositAmount < selectedMethod.min_amount) {
                setError(`${t('minimumDeposit')} ${formatCurrency(selectedMethod.min_amount)}`);
                return;
            }
            if (depositAmount > selectedMethod.max_amount) {
                setError(`${t('maximumDeposit')} ${formatCurrency(selectedMethod.max_amount)}`);
                return;
            }
        }

        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const response = await axios.post(
                'http://localhost:3001/wallet/deposit',
                {
                    amount: depositAmount,
                    currency: currency,
                    payment_method: paymentMethod
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            // Redirect to payment URL
            if (response.data.payment_url) {
                window.location.href = response.data.payment_url;
            } else {
                setError('Payment URL not received');
            }
        } catch (err) {
            console.error('Error creating deposit:', err);
            setError(err.response?.data?.message || 'Failed to create deposit');
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (currency === 'VND') {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(value);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    const quickAmounts = currency === 'VND'
        ? [50000, 100000, 200000, 500000, 1000000]
        : [10, 20, 50, 100, 200];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="deposit-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <i className="fas fa-plus-circle"></i>
                        {t('depositTitle')}
                    </h2>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="modal-body">
                    {/* Current Balance */}
                    <div className="current-balance">
                        <span>{t('currentBalance')}</span>
                        <strong>{formatCurrency(currentBalance || 0)}</strong>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Amount Input */}
                        <div className="form-group">
                            <label htmlFor="amount">
                                {t('amount')} {currency === 'VND' ? '(VND)' : '(USD)'}
                            </label>
                            <div className="amount-input-wrapper">
                                <span className="currency-symbol">
                                    {currency === 'VND' ? '₫' : '$'}
                                </span>
                                <input
                                    type="number"
                                    id="amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={t('enterAmount')}
                                    min={selectedMethod?.min_amount || 0}
                                    max={selectedMethod?.max_amount || 999999999}
                                    step={currency === 'VND' ? 1000 : 1}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            {selectedMethod && (
                                <small className="form-hint">
                                    {t('min')}: {formatCurrency(selectedMethod.min_amount)} |
                                    {t('max')}: {formatCurrency(selectedMethod.max_amount)}
                                </small>
                            )}
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="quick-amounts">
                            <span className="quick-amounts-label">{t('quickSelect')}</span>
                            <div className="quick-amounts-grid">
                                {quickAmounts.map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        type="button"
                                        className={`btn-quick-amount ${parseFloat(amount) === quickAmount ? 'active' : ''}`}
                                        onClick={() => setAmount(quickAmount.toString())}
                                        disabled={loading}
                                    >
                                        {formatCurrency(quickAmount)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Method Selection */}
                        <div className="form-group">
                            <label>{t('paymentMethod')}</label>
                            <div className="payment-methods-grid">
                                {paymentMethods.map((method) => (
                                    <label
                                        key={method.name}
                                        className={`payment-method-card ${paymentMethod === method.name ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value={method.name}
                                            checked={paymentMethod === method.name}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            disabled={loading}
                                        />
                                        <div className="method-content">
                                            <div className="method-icon">
                                                {method.name === 'vnpay' && <i className="fas fa-credit-card"></i>}
                                                {method.name === 'momo' && <i className="fas fa-mobile-alt"></i>}
                                                {method.name === 'stripe' && <i className="fab fa-stripe"></i>}
                                            </div>
                                            <div className="method-info">
                                                <span className="method-name">{method.display_name}</span>
                                                <span className="method-description">
                                                    {method.name === 'vnpay' && 'ATM, Visa, MasterCard'}
                                                    {method.name === 'momo' && 'MoMo Wallet'}
                                                    {method.name === 'stripe' && 'Credit/Debit Card'}
                                                </span>
                                            </div>
                                            <i className="fas fa-check-circle check-icon"></i>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="error-message">
                                <i className="fas fa-exclamation-circle"></i>
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={onClose}
                                disabled={loading}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={loading || !amount || !paymentMethod}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        {t('processing')}
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-arrow-right"></i>
                                        {t('continueToPayment')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Security Notice */}
                    <div className="security-notice">
                        <i className="fas fa-shield-alt"></i>
                        <span>{t('securePayment')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepositModal;
