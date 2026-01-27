import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { getWalletText } from '../../utils/walletTranslations';
import '../../styles/TransactionHistory.css';

const TransactionHistory = ({ currency = 'USD', refreshTrigger = 0 }) => {
    const { language } = useLanguage();
    const t = (key) => getWalletText(key, language);
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState('all'); // all, deposit, purchase, subscription

    useEffect(() => {
        fetchTransactions();
    }, [currentPage, filter, refreshTrigger]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            let url = `http://localhost:3001/wallet/transactions?page=${currentPage}&limit=10`;
            if (filter !== 'all') {
                url += `&type=${filter}`;
            }

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTransactions(response.data.transactions);
            setPagination(response.data.pagination);
            setError(null);
        } catch (err) {
            console.error('Error fetching transactions:', err);
            setError(err.response?.data?.message || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (currency === 'VND') {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(Math.abs(amount));
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(Math.abs(amount));
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'deposit':
                return 'fa-arrow-down';
            case 'purchase':
                return 'fa-shopping-cart';
            case 'subscription':
                return 'fa-crown';
            case 'refund':
                return 'fa-undo';
            default:
                return 'fa-exchange-alt';
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            completed: { class: 'success', icon: 'fa-check-circle', text: t('completed') },
            pending: { class: 'warning', icon: 'fa-clock', text: t('pending') },
            failed: { class: 'error', icon: 'fa-times-circle', text: t('failed') },
            cancelled: { class: 'neutral', icon: 'fa-ban', text: t('cancelled') }
        };
        return badges[status] || badges.pending;
    };

    if (loading && transactions.length === 0) {
        return (
            <div className="transaction-history">
                <h3>{t('transactionHistory')}</h3>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{t('loadingTransactions')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="transaction-history">
            <div className="history-header">
                <h3>
                    <i className="fas fa-history"></i>
                    {t('transactionHistory')}
                </h3>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => { setFilter('all'); setCurrentPage(1); }}
                    >
                        {t('all')}
                    </button>
                    <button
                        className={`filter-tab ${filter === 'deposit' ? 'active' : ''}`}
                        onClick={() => { setFilter('deposit'); setCurrentPage(1); }}
                    >
                        {t('deposits')}
                    </button>
                    <button
                        className={`filter-tab ${filter === 'purchase' ? 'active' : ''}`}
                        onClick={() => { setFilter('purchase'); setCurrentPage(1); }}
                    >
                        {t('purchases')}
                    </button>
                    <button
                        className={`filter-tab ${filter === 'subscription' ? 'active' : ''}`}
                        onClick={() => { setFilter('subscription'); setCurrentPage(1); }}
                    >
                        {t('subscriptions')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                </div>
            )}

            {transactions.length === 0 && !loading ? (
                <div className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>{t('noTransactions')}</p>
                    <small>{t('transactionHistoryWillAppear')}</small>
                </div>
            ) : (
                <>
                    <div className="transactions-list">
                        {transactions.map((transaction) => {
                            const statusBadge = getStatusBadge(transaction.status);
                            const isPositive = transaction.amount > 0;

                            return (
                                <div key={transaction.id} className="transaction-item">
                                    <div className="transaction-icon">
                                        <i className={`fas ${getTransactionIcon(transaction.type)}`}></i>
                                    </div>

                                    <div className="transaction-details">
                                        <div className="transaction-main">
                                            <span className="transaction-description">
                                                {(() => {
                                                    // Helper to translate description
                                                    const desc = transaction.description || '';
                                                    if (desc.startsWith('Deposit')) {
                                                        const parts = desc.split(' ');
                                                        // Example: "Deposit 100000 VND" -> "Nạp tiền 100000 VND"
                                                        if (parts.length >= 3) {
                                                            return `${t('deposit')} ${parts.slice(1).join(' ')}`;
                                                        }
                                                        return t('deposit');
                                                    }
                                                    if (desc.startsWith('Subscription upgrade to')) {
                                                        // Example: "Subscription upgrade to Pro (monthly)"
                                                        // Extract tier name and cycle
                                                        const tierMatch = desc.match(/to (.*?) \((.*?)\)/);
                                                        if (tierMatch) {
                                                            const tierName = tierMatch[1];
                                                            const cycle = tierMatch[2] === 'monthly' ? t('monthly') : t('yearly');
                                                            return `${t('subscriptionUpgrade')} ${tierName} (${cycle})`;
                                                        }
                                                        return t('subscription');
                                                    }
                                                    if (desc.startsWith('Currency changed from')) {
                                                        // Example: "Currency changed from USD to VND"
                                                        const parts = desc.split(' ');
                                                        return `${t('currencyChangedFrom')} ${parts[3]} ${t('to')} ${parts[5]}`;
                                                    }
                                                    // Fallback for untranslated descriptions
                                                    return desc || `${transaction.type} transaction`;
                                                })()}
                                            </span>
                                            <span className={`transaction-amount ${isPositive ? 'positive' : 'negative'}`}>
                                                {isPositive ? '+' : '-'}{formatCurrency(transaction.amount)}
                                            </span>
                                        </div>

                                        <div className="transaction-meta">
                                            <span className="transaction-date">
                                                <i className="far fa-calendar"></i>
                                                {formatDate(transaction.created_at)}
                                            </span>

                                            <span className={`transaction-status ${statusBadge.class}`}>
                                                <i className={`fas ${statusBadge.icon}`}></i>
                                                {statusBadge.text}
                                            </span>

                                            {transaction.payment_method && (
                                                <span className="transaction-method">
                                                    <i className="fas fa-credit-card"></i>
                                                    {transaction.payment_method.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="btn-page"
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                            >
                                <i className="fas fa-chevron-left"></i>
                                {t('previous')}
                            </button>

                            <span className="page-info">
                                {t('pageOf')} {pagination.page} {t('of')} {pagination.totalPages}
                            </span>

                            <button
                                className="btn-page"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === pagination.totalPages || loading}
                            >
                                {t('next')}
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TransactionHistory;
