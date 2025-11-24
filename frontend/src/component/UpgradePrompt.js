import React from 'react';
import { useLanguage } from './LanguageContext';
import shared from '../styles/shared.module.css';
import buttons from '../styles/buttons.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/UpgradePrompt.module.css';

export default function UpgradePrompt({ 
  darkMode = false, 
  usagePercentage = 0,
  limitType = 'queries',
  onUpgrade,
  currentTier = 'free'
}) {
  const { t } = useLanguage();

  // Only show if usage is >= 80% and not already on highest tier
  if (usagePercentage < 80 || currentTier === 'enterprise') {
    return null;
  }

  const isNearLimit = usagePercentage >= 80 && usagePercentage < 100;
  const isAtLimit = usagePercentage >= 100;

  const getMessage = () => {
    if (isAtLimit) {
      const message = t('subscription.limitReachedUpgrade') || 
        `You've reached your {limitType} limit. Upgrade to continue using the service.`;
      return message.replace('{limitType}', limitType);
    }
    const message = t('subscription.nearLimitUpgrade') || 
      `You're using {percentage}% of your {limitType} limit. Consider upgrading for more capacity.`;
    return message
      .replace('{percentage}', Math.round(usagePercentage))
      .replace('{limitType}', limitType);
  };

  const getRecommendedTier = () => {
    if (currentTier === 'free') return 'pro';
    if (currentTier === 'pro') return 'team';
    return 'enterprise';
  };

  return (
    <div className={`${styles.prompt} ${isAtLimit ? styles.promptCritical : styles.promptWarning} ${darkMode ? styles.darkMode : ''}`}>
      <div className={styles.icon}>
        {isAtLimit ? '🚫' : '⚠️'}
      </div>
      <div className={styles.content}>
        <h4 className={`${styles.title} ${darkMode ? styles.darkMode : ''}`}>
          {isAtLimit 
            ? (t('subscription.limitReached') || 'Limit Reached')
            : (t('subscription.nearLimit') || 'Near Limit')}
        </h4>
        <p className={`${styles.message} ${darkMode ? styles.darkMode : ''}`}>
          {getMessage()}
        </p>
        {onUpgrade && (
          <button
            onClick={() => onUpgrade(getRecommendedTier())}
            className={`${buttons.button} ${buttons.buttonPrimary} ${styles.upgradeButton}`}
          >
            {t('subscription.upgrade')} → {getRecommendedTier().charAt(0).toUpperCase() + getRecommendedTier().slice(1)}
          </button>
        )}
      </div>
    </div>
  );
}

