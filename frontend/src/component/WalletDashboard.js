import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { getWalletText } from '../utils/walletTranslations';
import '../styles/WalletDashboard.css';
import DepositModal from './DepositModal';
import TransactionHistory from './TransactionHistory';

const WalletDashboard = () => {
    const { language } = useLanguage();
    const t = (key) => getWalletText(key, language);
    const [wallet, setWallet] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);

    useEffect(() => {
        fetchWalletData();
        checkPaymentStatus();
    }, []);

    const checkPaymentStatus = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('payment');
        const amount = urlParams.get('amount');
        const message = urlParams.get('message');

        if (status) {
            setPaymentStatus({ status, amount, message });
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);

            // Auto-refresh wallet after successful payment
            if (status === 'success') {
                setTimeout(() => {
                    fetchWalletData();
                }, 1000);
            }
        }
    };

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // Fetch wallet info and stats in parallel
            const [walletRes, statsRes] = await Promise.all([
                axios.get('http://localhost:3001/wallet', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:3001/wallet/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setWallet(walletRes.data.wallet);
            setStats(statsRes.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching wallet data:', err);
            setError(err.response?.data?.message || 'Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    const handleDepositSuccess = () => {
        setShowDepositModal(false);
        fetchWalletData();
    };

    const formatCurrency = (amount, currency = 'USD') => {
        if (currency === 'VND') {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="wallet-dashboard">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{t('loadingWallet')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="wallet-dashboard">
                <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    <p>{error}</p>
                    <button onClick={fetchWalletData} className="btn-retry">
                        {t('tryAgain')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="wallet-dashboard">
            <div className="wallet-header">
                <h1>
                    <i className="fas fa-wallet"></i>
                    {t('myWallet')}
                </h1>
                <button
                    className="btn-deposit"
                    onClick={() => setShowDepositModal(true)}
                >
                    <i className="fas fa-plus"></i>
                    {t('depositFunds')}
                </button>
            </div>

            {/* Payment Status Alert */}
            {paymentStatus && (
                <div className={`payment-alert ${paymentStatus.status}`}>
                    {paymentStatus.status === 'success' && (
                        <>
                            <i className="fas fa-check-circle"></i>
                            <div>
                                <strong>{t('paymentSuccessful')}</strong>
                                <p>
                                    {paymentStatus.amount && `${formatCurrency(paymentStatus.amount, wallet?.currency)} ${t('hasBeenAdded')}`}
                                </p>
                            </div>
                        </>
                    )}
                    {paymentStatus.status === 'failed' && (
                        <>
                            <i className="fas fa-times-circle"></i>
                            <div>
                                <strong>{t('paymentFailed')}</strong>
                                <p>{paymentStatus.message || t('paymentCouldNotBeProcessed')}</p>
                            </div>
                        </>
                    )}
                    {paymentStatus.status === 'cancelled' && (
                        <>
                            <i className="fas fa-info-circle"></i>
                            <div>
                                <strong>{t('paymentCancelled')}</strong>
                                <p>{t('youCancelledPayment')}</p>
                            </div>
                        </>
                    )}
                    <button
                        className="btn-close-alert"
                        onClick={() => setPaymentStatus(null)}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* Wallet Balance Card */}
            <div className="wallet-balance-card">
                <div className="balance-info">
                    <span className="balance-label">{t('availableBalance')}</span>
                    <h2 className="balance-amount">
                        {formatCurrency(wallet?.balance || 0, wallet?.currency)}
                    </h2>
                    <span className="balance-status">
                        <i className={`fas fa-circle ${wallet?.status === 'active' ? 'active' : 'inactive'}`}></i>
                        {wallet?.status === 'active' ? t('active') : wallet?.status === 'inactive' ? t('inactive') : t('unknown')}
                    </span>
                </div>
                <div className="balance-actions">
                    <button
                        className="btn-action primary"
                        onClick={() => setShowDepositModal(true)}
                    >
                        <i className="fas fa-arrow-down"></i>
                        {t('deposit')}
                    </button>
                    <button className="btn-action secondary" disabled>
                        <i className="fas fa-arrow-up"></i>
                        {t('withdraw')}
                        <span className="coming-soon">{t('soon')}</span>
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon deposits">
                            <i className="fas fa-arrow-down"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{t('totalDeposits')}</span>
                            <span className="stat-value">
                                {formatCurrency(stats.total_deposits || 0, wallet?.currency)}
                            </span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon spent">
                            <i className="fas fa-shopping-cart"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{t('totalSpent')}</span>
                            <span className="stat-value">
                                {formatCurrency(stats.total_spent || 0, wallet?.currency)}
                            </span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon transactions">
                            <i className="fas fa-exchange-alt"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{t('transactions')}</span>
                            <span className="stat-value">{stats.total_transactions || 0}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction History */}
            <TransactionHistory currency={wallet?.currency} />

            {/* Deposit Modal */}
            {showDepositModal && (
                <DepositModal
                    onClose={() => setShowDepositModal(false)}
                    onSuccess={handleDepositSuccess}
                    currentBalance={wallet?.balance}
                    currency={wallet?.currency}
                />
            )}
        </div>
    );
};

export default WalletDashboard;
