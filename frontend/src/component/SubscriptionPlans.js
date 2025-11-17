import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { useConfirmContext } from '../context/ConfirmContext';
import shared from '../styles/shared.module.css';
import buttons from '../styles/buttons.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/SubscriptionPlans.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SubscriptionPlans({ darkMode = false, onUpgrade, refreshTrigger }) {
  const { t, language } = useLanguage();
  const { confirm } = useConfirmContext();
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    loadTiers();
    loadCurrentSubscription();
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
      const res = await axios.get(`${API_URL}/subscription/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentTier(res.data.tier?.name || 'free');
    } catch (err) {
      console.error('Error loading current subscription:', err);
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
        { tierName, billingCycle: 'monthly' },
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
                {tier.price_monthly > 0 ? (
                  <>
                    <span className={`${styles.price} ${darkMode ? styles.darkMode : ''}`}>
                      ${tier.price_monthly}
                    </span>
                    <span className={`${styles.priceLabel} ${darkMode ? styles.darkMode : ''}`}>
                      /{t('subscription.month')}
                    </span>
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

