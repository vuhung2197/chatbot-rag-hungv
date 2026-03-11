import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmContext } from '../../context/ConfirmContext';
import shared from '../../styles/shared.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/SubscriptionStatus.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ─── Helper: Map tier name to CSS class ───
const TIER_COLOR_MAP = { free: 'free', pro: 'pro', team: 'team' };

function getTierColorClass(tierName) {
  return styles[TIER_COLOR_MAP[tierName]] || '';
}

// ─── Helper: Format date ───
function formatDate(dateString, language) {
  if (!dateString || dateString === '0' || dateString === 0) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US');
  } catch (e) {
    return '';
  }
}

// ─── Helper: Format subscription status label ───
function getStatusLabel(status, t) {
  const statusMap = {
    active: '✓ ' + t('subscription.active'),
    trial: '⏱ ' + t('subscription.trial'),
    cancelled: '⚠ ' + t('subscription.cancelled'),
  };
  return statusMap[status] || status;
}

// ─── Helper: Format price function factory ───
function createPriceFormatter(walletCurrency, exchangeRate) {
  return (priceUSD) => {
    let price = Number(priceUSD) || 0;
    if (walletCurrency === 'VND') {
      price = price * exchangeRate;
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };
}

// ─── Extracted: Features List Component ───
function FeaturesList({ features, darkMode, t }) {
  if (!features) return null;

  const featureItems = [
    features.queries_per_day === -1
      ? t('subscription.unlimitedQueries')
      : `${features.queries_per_day} ${t('subscription.queriesPerDay')}`,
    features.file_upload_mb === -1
      ? t('subscription.unlimitedFileUpload')
      : `${features.file_upload_mb}MB ${t('subscription.fileUpload')}`,
    features.chat_history_days === -1
      ? t('subscription.unlimitedHistory')
      : `${features.chat_history_days} ${t('subscription.daysHistory')}`,
  ];

  const booleanFeatures = [
    { key: 'advanced_rag', label: t('subscription.advancedRAG') },
    { key: 'priority_support', label: t('subscription.prioritySupport') },
    { key: 'api_access', label: t('subscription.apiAccess') },
    { key: 'team_collaboration', label: t('subscription.teamCollaboration') },
  ];

  return (
    <div className={`${styles.featuresCard} ${darkMode ? styles.darkMode : ''}`}>
      <h4 className={`${styles.featuresTitle} ${darkMode ? styles.darkMode : ''}`}>
        {t('subscription.features')}
      </h4>
      <ul className={`${styles.featuresList} ${darkMode ? styles.darkMode : ''}`}>
        {featureItems.map((item, i) => <li key={i}>{item}</li>)}
        {booleanFeatures
          .filter(f => Boolean(features[f.key]))
          .map(f => <li key={f.key}>{f.label}</li>)}
      </ul>
    </div>
  );
}

// ─── Extracted: Subscription Info Component ───
function SubscriptionInfo({ subscription, darkMode, language, t, onToggleAutoRenew }) {
  if (!subscription) return null;

  return (
    <div className={`${styles.subscriptionInfo} ${darkMode ? styles.darkMode : ''}`}>
      <div className={styles.infoRow}>
        <strong>{t('subscription.periodStart')}:</strong> {formatDate(subscription.current_period_start, language)}
      </div>
      <div className={styles.infoRow}>
        <strong>{t('subscription.periodEnd')}:</strong> {formatDate(subscription.current_period_end, language)}
      </div>
      <div className={styles.infoRow}>
        <strong>{t('subscription.autoRenew')}:</strong>{' '}
        <span className={subscription.auto_renew ? styles.autoRenewOn : styles.autoRenewOff}>
          {subscription.auto_renew ? t('subscription.autoRenewEnabled') : t('subscription.autoRenewDisabled')}
        </span>
        <button
          onClick={onToggleAutoRenew}
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
  );
}

// ─── Extracted: Action Buttons Component ───
function ActionButtons({ subscription, tier, t, onRenew, onCancel }) {
  if (!subscription) return null;

  const showRenew = Boolean(subscription.cancel_at_period_end);
  const showCancel = subscription.status === 'active' && !Boolean(subscription.cancel_at_period_end) && tier.name !== 'free';

  return (
    <div className={styles.buttonContainer}>
      {showRenew && (
        <button onClick={onRenew} className={`${buttons.button} ${buttons.buttonSuccess}`}>
          {t('subscription.renew')}
        </button>
      )}
      {showCancel && (
        <button onClick={onCancel} className={`${buttons.button} ${buttons.buttonDanger}`}>
          {t('subscription.cancel')}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───
export default function SubscriptionStatus({ darkMode = false, refreshTrigger }) {
  const { t, language } = useLanguage();
  const { confirm } = useConfirmContext();
  const [subscription, setSubscription] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletCurrency, setWalletCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(25000);

  useEffect(() => {
    loadSubscription();
    loadWalletAndRates();
  }, [refreshTrigger]);

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
        axios.get(`${API_URL}/wallet`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/wallet/currencies`, { headers: { Authorization: `Bearer ${token}` } })
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

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/upgrade`,
        { tierName, billingCycle: 'monthly' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.upgradeError'));
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
      await axios.post(`${API_URL}/subscription/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.cancelError'));
    }
  };

  const handleRenew = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/subscription/renew`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.renewError'));
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/auto-renew`,
        { autoRenew: !subscription.auto_renew },
        { headers: { Authorization: `Bearer ${token}` } }
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

  const formatPrice = createPriceFormatter(walletCurrency, exchangeRate);

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
                  {getStatusLabel(subscription.status, t)}
                </div>
              )}
            </div>
            <div className={styles.priceContainer}>
              {tier.price_monthly && Number(tier.price_monthly) > 0 ? (
                <>
                  <div className={`${styles.price} ${darkMode ? styles.darkMode : ''}`}>
                    {subscription?.billing_cycle === 'yearly'
                      ? formatPrice(tier.price_yearly)
                      : formatPrice(tier.price_monthly)}
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

          <SubscriptionInfo
            subscription={subscription}
            darkMode={darkMode}
            language={language}
            t={t}
            onToggleAutoRenew={handleToggleAutoRenew}
          />

          <ActionButtons
            subscription={subscription}
            tier={tier}
            t={t}
            onRenew={handleRenew}
            onCancel={handleCancel}
          />
        </div>
      )}

      {tier && tier.features && (
        <FeaturesList features={tier.features} darkMode={darkMode} t={t} />
      )}
    </div>
  );
}
