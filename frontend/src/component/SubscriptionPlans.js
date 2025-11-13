import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SubscriptionPlans({ darkMode = false, onUpgrade, refreshTrigger }) {
  const { t, language } = useLanguage();
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

    if (!window.confirm(t('subscription.upgradeConfirm'))) {
      return;
    }

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
      <div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#fff' : '#333' }}>
        {t('common.loading')}...
      </div>
    );
  }

  const bgColor = darkMode ? '#2d2d2d' : '#f9f9f9';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';
  const cardBg = darkMode ? '#1a1a1a' : '#fff';

  const getTierColor = (tierName) => {
    switch (tierName) {
      case 'free':
        return darkMode ? '#666' : '#999';
      case 'pro':
        return '#7137ea';
      case 'team':
        return '#28a745';
      default:
        return textColor;
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
    <div style={{
      padding: '20px',
      backgroundColor: bgColor,
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      marginTop: '20px',
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: '20px',
        fontSize: '18px',
        color: textColor,
      }}>
        📦 {t('subscription.plans')}
      </h3>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#4a1f1f' : '#fee',
          color: darkMode ? '#ff6b6b' : '#c33',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
      }}>
        {tiers.map((tier) => {
          const features = parseFeatures(tier.features);
          const isCurrent = tier.name === currentTier;
          const isUpgrading = upgrading === tier.name;
          const canUpgradeToThis = canUpgrade(tier.name);
          const isLowerTier = !isCurrent && !canUpgradeToThis;

          return (
            <div
              key={tier.id}
              style={{
                padding: '24px',
                backgroundColor: cardBg,
                borderRadius: '8px',
                border: `2px solid ${isCurrent ? getTierColor(tier.name) : borderColor}`,
                position: 'relative',
                opacity: isCurrent ? 1 : 0.9,
              }}
            >
              {isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '4px 8px',
                  backgroundColor: getTierColor(tier.name),
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  {t('subscription.current')}
                </div>
              )}

              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                color: getTierColor(tier.name),
                fontWeight: '600',
              }}>
                {tier.display_name}
              </h4>

              <div style={{ marginBottom: '16px' }}>
                {tier.price_monthly > 0 ? (
                  <>
                    <span style={{ fontSize: '32px', fontWeight: '700', color: textColor }}>
                      ${tier.price_monthly}
                    </span>
                    <span style={{ fontSize: '14px', color: darkMode ? '#999' : '#666', marginLeft: '4px' }}>
                      /{t('subscription.month')}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '32px', fontWeight: '700', color: textColor }}>
                    {t('subscription.free')}
                  </span>
                )}
              </div>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: darkMode ? '#ccc' : '#666',
              }}>
                {features.queries_per_day === -1 ? (
                  <li style={{ marginBottom: '8px' }}>✓ {t('subscription.unlimitedQueries')}</li>
                ) : (
                  <li style={{ marginBottom: '8px' }}>✓ {features.queries_per_day} {t('subscription.queriesPerDay')}</li>
                )}
                {features.advanced_rag && (
                  <li style={{ marginBottom: '8px' }}>✓ {t('subscription.advancedRAG')}</li>
                )}
                {features.file_upload_mb === -1 ? (
                  <li style={{ marginBottom: '8px' }}>✓ {t('subscription.unlimitedFileUpload')}</li>
                ) : (
                  <li style={{ marginBottom: '8px' }}>✓ {features.file_upload_mb}MB {t('subscription.fileUpload')}</li>
                )}
                {features.chat_history_days === -1 ? (
                  <li style={{ marginBottom: '8px' }}>✓ {t('subscription.unlimitedHistory')}</li>
                ) : (
                  <li style={{ marginBottom: '8px' }}>✓ {features.chat_history_days} {t('subscription.daysHistory')}</li>
                )}
                {features.priority_support && (
                  <li style={{ marginBottom: '8px' }}>✓ {t('subscription.prioritySupport')}</li>
                )}
                {features.api_access && (
                  <li style={{ marginBottom: '8px' }}>✓ {t('subscription.apiAccess')}</li>
                )}
                {features.team_collaboration && (
                  <li style={{ marginBottom: '8px' }}>✓ {t('subscription.teamCollaboration')}</li>
                )}
              </ul>

              <button
                onClick={() => handleUpgrade(tier.name)}
                disabled={isCurrent || isUpgrading || isLowerTier}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: isCurrent ? '#999' : isLowerTier ? '#ccc' : getTierColor(tier.name),
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (isCurrent || isUpgrading || isLowerTier) ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  opacity: (isCurrent || isUpgrading || isLowerTier) ? 0.6 : 1,
                }}
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

