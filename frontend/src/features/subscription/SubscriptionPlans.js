import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmContext } from '../../context/ConfirmContext';
import shared from '../../styles/shared.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/SubscriptionPlans.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SubscriptionPlans({ darkMode = false, onUpgrade, refreshTrigger }) {
  const { t, language } = useLanguage();
  const { confirm } = useConfirmContext();
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [walletCurrency, setWalletCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(24000);

  useEffect(() => {
    loadTiers();
    loadCurrentSubscription();
    loadWalletAndRates();
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  const loadTiers = async () => {
    try {
      const res = await axios.get(`${API_URL}/subscription/tiers`);
      setTiers(res.data.tiers || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API_URL}/subscription/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentTier(res.data.tier?.name || 'free');
    } catch (err) {
      console.error('Error loading current subscription:', err);
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
    if (tierName === currentTier) {
      return; // Already on this tier
    }

    const confirmed = await confirm({
      title: t('subscription.upgradeConfirm'),
      message: t('subscription.upgradeConfirm'),
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    setUpgrading(tierName);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/upgrade`,
        { tierName, billingCycle },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Success - reload subscription and tiers
      await Promise.all([
        loadCurrentSubscription(),
        loadTiers()
      ]);

      if (onUpgrade) {
        onUpgrade(); // Callback to refresh parent components
      }

      // Show success message (optional)
      setError('');
      console.log('✅ Subscription upgraded successfully');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.upgradeError'));
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''}`}>
        {t('common.loading')}...
      </div>
    );
  }

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

  const parseFeatures = (features) => {
    if (typeof features === 'string') {
      try {
        return JSON.parse(features);
      } catch {
        return {};
      }
    }
    return features || {};
  };

  // Define tier order (lower number = lower tier)
  const getTierOrder = (tierName) => {
    const order = {
      'free': 0,
      'pro': 1,
      'team': 2,
      'enterprise': 3
    };
    return order[tierName] || 0;
  };

  const canUpgrade = (tierName) => {
    if (!currentTier) return true; // No current tier, can upgrade to any
    const currentOrder = getTierOrder(currentTier);
    const targetOrder = getTierOrder(tierName);
    return targetOrder > currentOrder; // Only allow upgrade to higher tier
  };

  const getPrice = (tier) => {
    let price = billingCycle === 'yearly' && tier.price_yearly
      ? Number(tier.price_yearly)
      : Number(tier.price_monthly) || 0;

    // Convert to wallet currency if needed (tier prices are in USD)
    if (walletCurrency !== 'USD') {
      if (walletCurrency === 'VND') {
        price = price * exchangeRate;
        // Round to nearest 1,000 for cleaner VND prices
        price = Math.ceil(price / 1000) * 1000;
      }
    }

    return price;
  };

  const getPriceLabel = (tier) => {
    if (billingCycle === 'yearly' && tier.price_yearly) {
      return t('subscription.year') || '/year';
    }
    return `/${t('subscription.month')}`;
  };

  const getYearlyDiscount = (tier) => {
    if (!tier.price_yearly || !tier.price_monthly) return null;
    const monthlyTotal = Number(tier.price_monthly) * 12;
    const yearlyPrice = Number(tier.price_yearly);
    if (yearlyPrice < monthlyTotal) {
      const discount = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100;
      return Math.round(discount);
    }
    return null;
  };

  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''}`}>
      <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
        📦 {t('subscription.plans')}
      </h3>

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}

      {/* Billing Cycle Selector */}
      <div className={styles.billingCycleSelector}>
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`${styles.cycleButton} ${billingCycle === 'monthly' ? styles.active : ''} ${darkMode ? styles.darkMode : ''}`}
        >
          {t('subscription.monthly') || 'Monthly'}
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`${styles.cycleButton} ${billingCycle === 'yearly' ? styles.active : ''} ${darkMode ? styles.darkMode : ''}`}
        >
          {t('subscription.yearly') || 'Yearly'}
          {tiers.some(t => getYearlyDiscount(t)) && (
            <span className={styles.discountBadge}>
              {t('subscription.save') || 'Save'} {Math.max(...tiers.map(t => getYearlyDiscount(t) || 0))}%
            </span>
          )}
        </button>
      </div>

      <div className={styles.plansGrid}>
        {tiers.map((tier) => {
          const features = parseFeatures(tier.features);
          const isCurrent = tier.name === currentTier;
          const isUpgrading = upgrading === tier.name;
          const canUpgradeToThis = canUpgrade(tier.name);
          const isLowerTier = !isCurrent && !canUpgradeToThis;
          const tierColorClass = getTierColorClass(tier.name);

          return (
            <div
              key={tier.id}
              className={`${styles.planCard} ${isCurrent ? styles.current : ''} ${isCurrent ? tierColorClass : ''} ${darkMode ? styles.darkMode : ''}`}
            >
              {isCurrent && (
                <div className={`${styles.currentBadge} ${tierColorClass} ${darkMode ? styles.darkMode : ''}`}>
                  {t('subscription.current')}
                </div>
              )}

              <h4 className={`${styles.planName} ${tierColorClass} ${darkMode ? styles.darkMode : ''}`}>
                {tier.display_name}
              </h4>

              <div className={styles.priceContainer}>
                {getPrice(tier) > 0 ? (
                  <>
                    <span className={`${styles.price} ${darkMode ? styles.darkMode : ''}`}>
                      {new Intl.NumberFormat(walletCurrency === 'VND' ? 'vi-VN' : 'en-US', {
                        style: 'currency',
                        currency: walletCurrency
                      }).format(getPrice(tier))}
                    </span>
                    <span className={`${styles.priceLabel} ${darkMode ? styles.darkMode : ''}`}>
                      {getPriceLabel(tier)}
                    </span>
                    {billingCycle === 'yearly' && getYearlyDiscount(tier) && (
                      <div className={styles.yearlyDiscount}>
                        {t('subscription.save') || 'Save'} {getYearlyDiscount(tier)}%
                      </div>
                    )}
                    {billingCycle === 'yearly' && tier.price_monthly > 0 && (
                      <div className={`${styles.monthlyEquivalent} ${darkMode ? styles.darkMode : ''}`}>
                        {new Intl.NumberFormat(walletCurrency === 'VND' ? 'vi-VN' : 'en-US', {
                          style: 'currency',
                          currency: walletCurrency
                        }).format(getPrice(tier) / 12)}/{t('subscription.month')}
                      </div>
                    )}
                  </>
                ) : (
                  <span className={`${styles.price} ${darkMode ? styles.darkMode : ''}`}>
                    {t('subscription.free')}
                  </span>
                )}
              </div>

              <ul className={`${styles.featuresList} ${darkMode ? styles.darkMode : ''}`}>
                {features.queries_per_day === -1 ? (
                  <li className={styles.featureItem}>✓ {t('subscription.unlimitedQueries')}</li>
                ) : (
                  <li className={styles.featureItem}>✓ {features.queries_per_day} {t('subscription.queriesPerDay')}</li>
                )}
                {features.advanced_rag && (
                  <li className={styles.featureItem}>✓ {t('subscription.advancedRAG')}</li>
                )}
                {features.file_upload_mb === -1 ? (
                  <li className={styles.featureItem}>✓ {t('subscription.unlimitedFileUpload')}</li>
                ) : (
                  <li className={styles.featureItem}>✓ {features.file_upload_mb}MB {t('subscription.fileUpload')}</li>
                )}
                {features.chat_history_days === -1 ? (
                  <li className={styles.featureItem}>✓ {t('subscription.unlimitedHistory')}</li>
                ) : (
                  <li className={styles.featureItem}>✓ {features.chat_history_days} {t('subscription.daysHistory')}</li>
                )}
                {features.priority_support && (
                  <li className={styles.featureItem}>✓ {t('subscription.prioritySupport')}</li>
                )}
                {features.api_access && (
                  <li className={styles.featureItem}>✓ {t('subscription.apiAccess')}</li>
                )}
                {features.team_collaboration && (
                  <li className={styles.featureItem}>✓ {t('subscription.teamCollaboration')}</li>
                )}
              </ul>

              <button
                onClick={() => handleUpgrade(tier.name)}
                disabled={isCurrent || isUpgrading || isLowerTier}
                className={`${buttons.button} ${buttons.buttonFullWidth} ${isLowerTier ? buttons.buttonSecondary : tier.name === 'pro' ? buttons.buttonPrimary : tier.name === 'team' ? buttons.buttonSuccess : ''} ${darkMode ? buttons.darkMode : ''}`}
              >
                {isCurrent
                  ? t('subscription.currentPlan')
                  : isUpgrading
                    ? t('subscription.upgrading')
                    : isLowerTier
                      ? t('subscription.downgradeNotAllowed')
                      : tier.name === 'free'
                        ? t('subscription.currentPlan')
                        : t('subscription.upgrade')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

