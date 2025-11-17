import React from 'react';
import { useLanguage } from './LanguageContext';
import shared from '../styles/shared.module.css';
import styles from '../styles/components/UsageLimits.module.css';

export default function UsageLimits({ usage, limits, darkMode = false }) {
  const { t } = useLanguage();

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

  return (
    <div className={`${shared.card} ${darkMode ? shared.darkMode : ''} ${shared.marginBottom}`}>
      <h4 className={`${shared.subtitle} ${darkMode ? shared.darkMode : ''}`}>
        {t('usage.todayUsage')}
      </h4>

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
        {queriesPercentage >= 80 && limits.queries_per_day !== -1 && (
          <div className={`${styles.warning} ${queriesPercentage >= 100 ? styles.red : styles.yellow}`}>
            {queriesPercentage >= 100 ? '⚠ ' + t('usage.limitReached') : '⚠ ' + t('usage.nearLimit')}
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
        {fileSizePercentage >= 80 && limits.file_size_mb !== -1 && (
          <div className={`${styles.warning} ${fileSizePercentage >= 100 ? styles.red : styles.yellow}`}>
            {fileSizePercentage >= 100 ? '⚠ ' + t('usage.limitReached') : '⚠ ' + t('usage.nearLimit')}
          </div>
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

