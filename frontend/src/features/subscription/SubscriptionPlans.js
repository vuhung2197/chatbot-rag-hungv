import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmContext } from '../../context/ConfirmContext';
import shared from '../../styles/shared.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/SubscriptionPlans.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ─── Helpers ───

const TIER_COLOR_MAP = { free: 'free', pro: 'pro', team: 'team' };
const TIER_ORDER = { free: 0, pro: 1, team: 2, enterprise: 3 };

function getTierColorClass(tierName) {
  return styles[TIER_COLOR_MAP[tierName]] || '';
}

function parseFeatures(features) {
  if (typeof features === 'string') {
    try { return JSON.parse(features); } catch { return {}; }
  }
  return features || {};
}

function getYearlyDiscount(tier) {
  if (!tier.price_yearly || !tier.price_monthly) return null;
  const monthlyTotal = Number(tier.price_monthly) * 12;
  const yearlyPrice = Number(tier.price_yearly);
  if (yearlyPrice < monthlyTotal) {
    return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
  }
  return null;
}

function getPrice(tier, billingCycle, walletCurrency, exchangeRate) {
  let price = billingCycle === 'yearly' && tier.price_yearly
    ? Number(tier.price_yearly) : Number(tier.price_monthly) || 0;
  if (walletCurrency === 'VND') {
    price = Math.ceil((price * exchangeRate) / 1000) * 1000;
  }
  return price;
}

function formatCurrency(amount, walletCurrency) {
  const locale = walletCurrency === 'VND' ? 'vi-VN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: walletCurrency }).format(amount);
}

function getButtonLabel({ isCurrent, isUpgrading, isLowerTier, tierName, t }) {
  if (isCurrent) return t('subscription.currentPlan');
  if (isUpgrading) return t('subscription.upgrading');
  if (isLowerTier) return t('subscription.downgradeNotAllowed');
  if (tierName === 'free') return t('subscription.currentPlan');
  return t('subscription.upgrade');
}

function getButtonClass(tierName, isLowerTier, darkMode) {
  const tierBtnMap = { pro: buttons.buttonPrimary, team: buttons.buttonSuccess };
  const tierBtn = isLowerTier ? buttons.buttonSecondary : (tierBtnMap[tierName] || '');
  return `${buttons.button} ${buttons.buttonFullWidth} ${tierBtn} ${darkMode ? buttons.darkMode : ''}`;
}

// ─── Extracted: Feature list for a single plan card ───
function PlanFeaturesList({ features, darkMode, t }) {
  const quantityFeatures = [
    { key: 'queries_per_day', unlimited: t('subscription.unlimitedQueries'), label: t('subscription.queriesPerDay') },
    { key: 'file_upload_mb', unlimited: t('subscription.unlimitedFileUpload'), label: t('subscription.fileUpload'), suffix: 'MB' },
    { key: 'chat_history_days', unlimited: t('subscription.unlimitedHistory'), label: t('subscription.daysHistory') },
  ];

  const booleanFeatures = [
    { key: 'advanced_rag', label: t('subscription.advancedRAG') },
    { key: 'priority_support', label: t('subscription.prioritySupport') },
    { key: 'api_access', label: t('subscription.apiAccess') },
    { key: 'team_collaboration', label: t('subscription.teamCollaboration') },
  ];

  return (
    <ul className={`${styles.featuresList} ${darkMode ? styles.darkMode : ''}`}>
      {quantityFeatures.map(f => (
        <li key={f.key} className={styles.featureItem}>
          ✓ {features[f.key] === -1
            ? f.unlimited
            : `${f.suffix ? features[f.key] + f.suffix : features[f.key]} ${f.label}`}
        </li>
      ))}
      {booleanFeatures
        .filter(f => features[f.key])
        .map(f => <li key={f.key} className={styles.featureItem}>✓ {f.label}</li>)}
    </ul>
  );
}

// ─── Extracted: Price display for a plan card ───
function PlanPriceDisplay({ tier, price, billingCycle, walletCurrency, darkMode, t }) {
  if (price <= 0) {
    return (
      <span className={`${styles.price} ${darkMode ? styles.darkMode : ''}`}>
        {t('subscription.free')}
      </span>
    );
  }

  const discount = getYearlyDiscount(tier);
  const priceLabel = billingCycle === 'yearly' && tier.price_yearly
    ? (t('subscription.year') || '/year')
    : `/${t('subscription.month')}`;

  return (
    <>
      <span className={`${styles.price} ${darkMode ? styles.darkMode : ''}`}>
        {formatCurrency(price, walletCurrency)}
      </span>
      <span className={`${styles.priceLabel} ${darkMode ? styles.darkMode : ''}`}>
        {priceLabel}
      </span>
      {billingCycle === 'yearly' && !!discount && (
        <div className={styles.yearlyDiscount}>
          {t('subscription.save') || 'Save'} {discount}%
        </div>
      )}
      {billingCycle === 'yearly' && tier.price_monthly > 0 && (
        <div className={`${styles.monthlyEquivalent} ${darkMode ? styles.darkMode : ''}`}>
          {formatCurrency(price / 12, walletCurrency)}/{t('subscription.month')}
        </div>
      )}
    </>
  );
}

// ─── Extracted: Billing Cycle Selector ───
function BillingCycleSelector({ billingCycle, setBillingCycle, tiers, darkMode, t }) {
  const maxDiscount = Math.max(...tiers.map(tier => getYearlyDiscount(tier) || 0));

  return (
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
        {maxDiscount > 0 && (
          <span className={styles.discountBadge}>
            {t('subscription.save') || 'Save'} {maxDiscount}%
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Main Component ───
export default function SubscriptionPlans({ darkMode = false, onUpgrade, refreshTrigger }) {
  const { t, language } = useLanguage();
  const { confirm } = useConfirmContext();
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [walletCurrency, setWalletCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(25000);

  useEffect(() => {
    loadTiers();
    loadCurrentSubscription();
    loadWalletAndRates();
  }, [refreshTrigger]);

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
    if (tierName === currentTier) return;

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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await Promise.all([loadCurrentSubscription(), loadTiers()]);
      if (onUpgrade) onUpgrade();
      setError('');
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

  const canUpgrade = (tierName) => {
    if (!currentTier) return true;
    return (TIER_ORDER[tierName] || 0) > (TIER_ORDER[currentTier] || 0);
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

      <BillingCycleSelector
        billingCycle={billingCycle}
        setBillingCycle={setBillingCycle}
        tiers={tiers}
        darkMode={darkMode}
        t={t}
      />

      <div className={styles.plansGrid}>
        {tiers.map((tier) => {
          const features = parseFeatures(tier.features);
          const isCurrent = tier.name === currentTier;
          const isUpgrading = upgrading === tier.name;
          const canUpgradeToThis = canUpgrade(tier.name);
          const isLowerTier = !isCurrent && !canUpgradeToThis;
          const tierColorClass = getTierColorClass(tier.name);
          const price = getPrice(tier, billingCycle, walletCurrency, exchangeRate);

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
                <PlanPriceDisplay
                  tier={tier}
                  price={price}
                  billingCycle={billingCycle}
                  walletCurrency={walletCurrency}
                  darkMode={darkMode}
                  t={t}
                />
              </div>

              <PlanFeaturesList features={features} darkMode={darkMode} t={t} />

              <button
                onClick={() => handleUpgrade(tier.name)}
                disabled={isCurrent || isUpgrading || isLowerTier}
                className={getButtonClass(tier.name, isLowerTier, darkMode)}
              >
                {getButtonLabel({ isCurrent, isUpgrading, isLowerTier, tierName: tier.name, t })}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
