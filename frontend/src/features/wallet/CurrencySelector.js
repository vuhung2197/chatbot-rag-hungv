import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { getWalletText } from '../../utils/walletTranslations';
import '../../styles/CurrencySelector.css';

const CurrencySelector = ({ currentCurrency, onCurrencyChange }) => {
    const { language } = useLanguage();
    const t = (key) => getWalletText(key, language);
    const [currencies, setCurrencies] = useState([]);
    const [exchangeRates, setExchangeRates] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(null);

    useEffect(() => {
        fetchCurrencies();
    }, []);

    const fetchCurrencies = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/wallet/currencies', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setCurrencies(response.data.currencies);
            setExchangeRates(response.data.exchangeRates);
        } catch (err) {
            console.error('Error fetching currencies:', err);
        }
    };

    const handleCurrencySelect = (currency) => {
        if (currency === currentCurrency) return;

        setSelectedCurrency(currency);
        setShowConfirm(true);
    };

    const confirmCurrencyChange = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.put(
                'http://localhost:3001/wallet/currency',
                { currency: selectedCurrency },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Call parent callback to refresh wallet data
            if (onCurrencyChange) {
                onCurrencyChange(response.data.wallet);
            }

            setShowConfirm(false);
            setSelectedCurrency(null);
        } catch (err) {
            console.error('Error changing currency:', err);
            alert(err.response?.data?.message || 'Failed to change currency');
        } finally {
            setLoading(false);
        }
    };

    const cancelCurrencyChange = () => {
        setShowConfirm(false);
        setSelectedCurrency(null);
    };

    const getExchangeInfo = () => {
        if (!exchangeRates || !selectedCurrency || !currentCurrency) return null;

        const rate = currentCurrency === 'USD' && selectedCurrency === 'VND'
            ? exchangeRates.USD_TO_VND
            : exchangeRates.VND_TO_USD;

        return {
            from: currentCurrency,
            to: selectedCurrency,
            rate: rate
        };
    };

    return (
        <div className="currency-selector">
            <label className="currency-label">
                <i className="fas fa-exchange-alt"></i>
                {t('currency') || 'Currency'}
            </label>
            <div className="currency-options">
                {currencies.map((currency) => (
                    <button
                        key={currency.code}
                        className={`currency-option ${currentCurrency === currency.code ? 'active' : ''}`}
                        onClick={() => handleCurrencySelect(currency.code)}
                        disabled={loading}
                    >
                        {/* <span className="currency-symbol">{currency.symbol}</span> */}
                        <span className="currency-code">{currency.code}</span>
                    </button>
                ))}
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="modal-overlay" onClick={cancelCurrencyChange}>
                    <div className="currency-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <i className="fas fa-exchange-alt"></i>
                                {t('changeCurrency') || 'Change Currency'}
                            </h3>
                            <button className="btn-close" onClick={cancelCurrencyChange}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="currency-change-info">
                                <div className="currency-from">
                                    <span className="label">{t('from') || 'From'}:</span>
                                    <span className="value">{currentCurrency}</span>
                                </div>
                                <i className="fas fa-arrow-right"></i>
                                <div className="currency-to">
                                    <span className="label">{t('to') || 'To'}:</span>
                                    <span className="value">{selectedCurrency}</span>
                                </div>
                            </div>

                            {getExchangeInfo() && (
                                <div className="exchange-rate-info">
                                    <i className="fas fa-info-circle"></i>
                                    <p>
                                        {t('exchangeRate') || 'Exchange Rate'}: 1 {getExchangeInfo().from} = {getExchangeInfo().rate.toLocaleString()} {getExchangeInfo().to}
                                    </p>
                                </div>
                            )}

                            <div className="warning-message">
                                <i className="fas fa-exclamation-triangle"></i>
                                <p>{t('currencyChangeWarning') || 'Your balance will be converted to the new currency. This action cannot be undone.'}</p>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-cancel"
                                onClick={cancelCurrencyChange}
                                disabled={loading}
                            >
                                {t('cancel') || 'Cancel'}
                            </button>
                            <button
                                className="btn-confirm"
                                onClick={confirmCurrencyChange}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        {t('processing') || 'Processing...'}
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check"></i>
                                        {t('confirm') || 'Confirm'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurrencySelector;
