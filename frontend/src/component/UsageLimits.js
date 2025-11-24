import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { useConfirmContext } from '../context/ConfirmContext';
import UpgradePrompt from './UpgradePrompt';
import shared from '../styles/shared.module.css';
import styles from '../styles/components/UsageLimits.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function UsageLimits({ usage, limits, darkMode = false }) {
  const { t } = useLanguage();
  const { confirm } = useConfirmContext();
  const [currentTier, setCurrentTier] = useState('free');

  const getPercentage = (used, limit) => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const getColorClass = (percentage) => {
    if (percentage >= 100) return styles.red;
    if (percentage >= 80) return styles.yellow;
    return styles.green;
  };

  // Ensure values are numbers
  const queriesCount = Number(usage.usage.queries_count) || 0;
  const fileSizeMB = Number(usage.usage.file_uploads_size_mb) || 0;
  
  const queriesPercentage = getPercentage(queriesCount, limits.queries_per_day);
  const fileSizePercentage = getPercentage(fileSizeMB, limits.file_size_mb);

  // Load current tier
  useEffect(() => {
    const loadTier = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/subscription/current`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentTier(res.data.tier?.name || 'free');
      } catch (err) {
        console.error('Error loading tier:', err);
      }
    };
    loadTier();
  }, []);

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
      // Reload page or refresh data
      window.location.reload();
    } catch (err) {
      console.error('Error upgrading:', err);
    }
  };

  return (
    <div className={`${shared.card} ${darkMode ? shared.darkMode : ''} ${shared.marginBottom}`}>
      <h4 className={`${shared.subtitle} ${darkMode ? shared.darkMode : ''}`}>
        {t('usage.todayUsage')}
      </h4>

      {/* Upgrade Prompt for Queries */}
      {queriesPercentage >= 80 && limits.queries_per_day !== -1 && (
        <UpgradePrompt
          darkMode={darkMode}
          usagePercentage={queriesPercentage}
          limitType="queries"
          currentTier={currentTier}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* Queries Usage */}
      <div className={styles.section}>
        <div className={styles.sectionRow}>
          <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>{t('usage.queries')}</span>
          <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>
            {queriesCount} / {limits.queries_per_day === -1 ? '∞' : limits.queries_per_day}
          </span>
        </div>
        {limits.queries_per_day !== -1 && (
          <div className={`${styles.progressBar} ${darkMode ? styles.darkMode : ''}`}>
            <div
              className={`${styles.progressFill} ${getColorClass(queriesPercentage)}`}
              style={{ width: `${queriesPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* File Uploads Usage */}
      <div className={styles.section}>
        <div className={styles.sectionRow}>
          <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>{t('usage.fileUploads')}</span>
          <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>
            {Number(usage.usage.file_uploads_count) || 0}
          </span>
        </div>
      </div>

      {/* File Size Usage */}
      <div className={styles.section}>
        <div className={styles.sectionRow}>
          <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>{t('usage.fileSize')}</span>
          <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>
            {fileSizeMB.toFixed(2)} MB / {limits.file_size_mb === -1 ? '∞' : limits.file_size_mb + ' MB'}
          </span>
        </div>
        {limits.file_size_mb !== -1 && (
          <div className={`${styles.progressBar} ${darkMode ? styles.darkMode : ''}`}>
            <div
              className={`${styles.progressFill} ${getColorClass(fileSizePercentage)}`}
              style={{ width: `${fileSizePercentage}%` }}
            />
          </div>
        )}
        {/* Upgrade Prompt for File Size */}
        {fileSizePercentage >= 80 && limits.file_size_mb !== -1 && (
          <UpgradePrompt
            darkMode={darkMode}
            usagePercentage={fileSizePercentage}
            limitType="file size"
            currentTier={currentTier}
            onUpgrade={handleUpgrade}
          />
        )}
      </div>

      {/* Advanced RAG Usage */}
      {(Number(usage.usage.advanced_rag_count) || 0) > 0 && (
        <div className={`${styles.advancedRagSection} ${darkMode ? styles.darkMode : ''}`}>
          <div className={styles.sectionRow}>
            <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>{t('usage.advancedRAG')}</span>
            <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>
              {Number(usage.usage.advanced_rag_count) || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

