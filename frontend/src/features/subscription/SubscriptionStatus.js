import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmContext } from '../../context/ConfirmContext';
import shared from '../../styles/shared.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/SubscriptionStatus.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SubscriptionStatus({ darkMode = false, refreshTrigger }) {
  const { t, language } = useLanguage();
  const { confirm } = useConfirmContext();
  const [subscription, setSubscription] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [walletCurrency, setWalletCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(25000);


  useEffect(() => {
    loadSubscription();
    loadWalletAndRates();
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  const loadSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/subscription/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscription(res.data.subscription);
      setTier(res.data.tier);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletAndRates = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const [walletRes, ratesRes] = await Promise.all([
        axios.get(`${API_URL}/wallet`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/wallet/currencies`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setWalletCurrency(walletRes.data.wallet.currency || 'USD');
      if (ratesRes.data.exchangeRates?.USD_TO_VND) {
        setExchangeRate(ratesRes.data.exchangeRates.USD_TO_VND);
      }
    } catch (err) {
      console.error('Error loading wallet info:', err);
    }
  };

  const handleUpgrade = async (tierName) => {
    const confirmed = await confirm({
      title: t('subscription.upgradeConfirm'),
      message: t('subscription.upgradeConfirm'),
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    setUpgrading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/upgrade`,
        { tierName, billingCycle: 'monthly' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.upgradeError'));
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: t('subscription.cancelConfirm'),
      message: t('subscription.cancelConfirm'),
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.cancelError'));
    }
  };

  const handleRenew = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/renew`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.renewError'));
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription) return;
    const newAutoRenew = !subscription.auto_renew;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/auto-renew`,
        { autoRenew: newAutoRenew },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''}`}>
        {t('common.loading')}...
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString || dateString === '0' || dateString === 0) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US');
    } catch (e) {
      return '';
    }
  };

  const getTierColorClass = (tierName) => {
    switch (tierName) {
      case 'free':
        return styles.free;
      case 'pro':
        return styles.pro;
      case 'team':
        return styles.team;
      default:
        return '';
    }
  };

  const formatPrice = (priceUSD) => {
    let price = Number(priceUSD) || 0;
    if (walletCurrency === 'VND') {
      price = price * exchangeRate;
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(price);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''}`}>
      <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
        💳 {t('subscription.title')}
      </h3>

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}

      {tier && (
        <div className={`${shared.card} ${darkMode ? shared.darkMode : ''}`}>
          <div className={styles.cardHeader}>
            <div>
              <h4 className={`${styles.tierName} ${getTierColorClass(tier.name)} ${darkMode ? styles.darkMode : ''}`}>
                {tier.display_name}
              </h4>
              {subscription && (
                <div className={`${styles.status} ${darkMode ? styles.darkMode : ''}`}>
                  {subscription.status === 'active' ? '✓ ' + t('subscription.active') :
                    subscription.status === 'trial' ? '⏱ ' + t('subscription.trial') :
                      subscription.status === 'cancelled' ? '⚠ ' + t('subscription.cancelled') :
                        subscription.status}
                </div>
              )}
            </div>
            <div className={styles.priceContainer}>
              {tier.price_monthly && Number(tier.price_monthly) > 0 ? (
                <>
                  <div className={`${styles.price} ${darkMode ? styles.darkMode : ''}`}>
                    {subscription?.billing_cycle === 'yearly'
                      ? formatPrice(tier.price_yearly)
                      : formatPrice(tier.price_monthly)
                    }
                  </div>
                  <div className={`${styles.priceLabel} ${darkMode ? styles.darkMode : ''}`}>
                    /{subscription?.billing_cycle === 'yearly' ? t('subscription.year') : t('subscription.month')}
                  </div>
                </>
              ) : (
                <div className={`${styles.price} ${darkMode ? styles.darkMode : ''}`}>
                  {t('subscription.free')}
                </div>
              )}
            </div>
          </div>

          {subscription && (
            <div className={`${styles.subscriptionInfo} ${darkMode ? styles.darkMode : ''}`}>
              <div className={styles.infoRow}>
                <strong>{t('subscription.periodStart')}:</strong> {formatDate(subscription.current_period_start)}
              </div>
              <div className={styles.infoRow}>
                <strong>{t('subscription.periodEnd')}:</strong> {formatDate(subscription.current_period_end)}
              </div>

              <div className={styles.infoRow}>
                <strong>{t('subscription.autoRenew')}:</strong>{' '}
                <span className={subscription.auto_renew ? styles.autoRenewOn : styles.autoRenewOff}>
                  {subscription.auto_renew ? t('subscription.autoRenewEnabled') : t('subscription.autoRenewDisabled')}
                </span>
                <button
                  onClick={handleToggleAutoRenew}
                  className={styles.toggleButton}
                  title={subscription.auto_renew ? t('subscription.autoRenewDisable') : t('subscription.autoRenewEnable')}
                >
                  <i className={`fas ${subscription.auto_renew ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                </button>
              </div>

              {Boolean(subscription.cancel_at_period_end) && (
                <div className={`${messages.warning} ${darkMode ? messages.darkMode : ''}`}>
                  ⚠ {t('subscription.willCancel')}
                </div>
              )}
            </div>
          )}

          <div className={styles.buttonContainer}>
            {subscription && Boolean(subscription.cancel_at_period_end) && (
              <button
                onClick={handleRenew}
                className={`${buttons.button} ${buttons.buttonSuccess}`}
              >
                {t('subscription.renew')}
              </button>
            )}

            {subscription && subscription.status === 'active' && !Boolean(subscription.cancel_at_period_end) && tier.name !== 'free' && (
              <button
                onClick={handleCancel}
                className={`${buttons.button} ${buttons.buttonDanger}`}
              >
                {t('subscription.cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Features List */}
      {tier && tier.features && (
        <div className={`${styles.featuresCard} ${darkMode ? styles.darkMode : ''}`}>
          <h4 className={`${styles.featuresTitle} ${darkMode ? styles.darkMode : ''}`}>
            {t('subscription.features')}
          </h4>
          <ul className={`${styles.featuresList} ${darkMode ? styles.darkMode : ''}`}>
            {tier.features.queries_per_day === -1 ? (
              <li>{t('subscription.unlimitedQueries')}</li>
            ) : (
              <li>{tier.features.queries_per_day} {t('subscription.queriesPerDay')}</li>
            )}
            {Boolean(tier.features.advanced_rag) && (
              <li>{t('subscription.advancedRAG')}</li>
            )}
            {tier.features.file_upload_mb === -1 ? (
              <li>{t('subscription.unlimitedFileUpload')}</li>
            ) : (
              <li>{tier.features.file_upload_mb}MB {t('subscription.fileUpload')}</li>
            )}
            {tier.features.chat_history_days === -1 ? (
              <li>{t('subscription.unlimitedHistory')}</li>
            ) : (
              <li>{tier.features.chat_history_days} {t('subscription.daysHistory')}</li>
            )}
            {Boolean(tier.features.priority_support) && (
              <li>{t('subscription.prioritySupport')}</li>
            )}
            {Boolean(tier.features.api_access) && (
              <li>{t('subscription.apiAccess')}</li>
            )}
            {Boolean(tier.features.team_collaboration) && (
              <li>{t('subscription.teamCollaboration')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

