import React from 'react';
import { useLanguage } from './LanguageContext';

export default function UsageLimits({ usage, limits, darkMode = false }) {
  const { t } = useLanguage();

  const bgColor = darkMode ? '#2d2d2d' : '#f9f9f9';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';
  const cardBg = darkMode ? '#1a1a1a' : '#fff';

  const getPercentage = (used, limit) => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const getColor = (percentage) => {
    if (percentage >= 100) return '#dc3545'; // Red
    if (percentage >= 80) return '#ffc107'; // Yellow
    return '#28a745'; // Green
  };

  // Ensure values are numbers
  const queriesCount = Number(usage.usage.queries_count) || 0;
  const fileSizeMB = Number(usage.usage.file_uploads_size_mb) || 0;
  
  const queriesPercentage = getPercentage(queriesCount, limits.queries_per_day);
  const fileSizePercentage = getPercentage(fileSizeMB, limits.file_size_mb);

  return (
    <div style={{
      padding: '16px',
      backgroundColor: cardBg,
      borderRadius: '6px',
      border: `1px solid ${borderColor}`,
      marginBottom: '16px',
    }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: textColor }}>
        {t('usage.todayUsage')}
      </h4>

      {/* Queries Usage */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '14px',
        }}>
          <span style={{ color: textColor }}>{t('usage.queries')}</span>
          <span style={{ color: textColor }}>
            {queriesCount} / {limits.queries_per_day === -1 ? '∞' : limits.queries_per_day}
          </span>
        </div>
        {limits.queries_per_day !== -1 && (
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: darkMode ? '#333' : '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${queriesPercentage}%`,
              height: '100%',
              backgroundColor: getColor(queriesPercentage),
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}
        {queriesPercentage >= 80 && limits.queries_per_day !== -1 && (
          <div style={{
            fontSize: '12px',
            color: queriesPercentage >= 100 ? '#dc3545' : '#ffc107',
            marginTop: '4px',
          }}>
            {queriesPercentage >= 100 ? '⚠ ' + t('usage.limitReached') : '⚠ ' + t('usage.nearLimit')}
          </div>
        )}
      </div>

      {/* File Uploads Usage */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '14px',
        }}>
          <span style={{ color: textColor }}>{t('usage.fileUploads')}</span>
          <span style={{ color: textColor }}>
            {Number(usage.usage.file_uploads_count) || 0}
          </span>
        </div>
      </div>

      {/* File Size Usage */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '14px',
        }}>
          <span style={{ color: textColor }}>{t('usage.fileSize')}</span>
          <span style={{ color: textColor }}>
            {fileSizeMB.toFixed(2)} MB / {limits.file_size_mb === -1 ? '∞' : limits.file_size_mb + ' MB'}
          </span>
        </div>
        {limits.file_size_mb !== -1 && (
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: darkMode ? '#333' : '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${fileSizePercentage}%`,
              height: '100%',
              backgroundColor: getColor(fileSizePercentage),
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}
        {fileSizePercentage >= 80 && limits.file_size_mb !== -1 && (
          <div style={{
            fontSize: '12px',
            color: fileSizePercentage >= 100 ? '#dc3545' : '#ffc107',
            marginTop: '4px',
          }}>
            {fileSizePercentage >= 100 ? '⚠ ' + t('usage.limitReached') : '⚠ ' + t('usage.nearLimit')}
          </div>
        )}
      </div>

      {/* Advanced RAG Usage */}
      {(Number(usage.usage.advanced_rag_count) || 0) > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${borderColor}` }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
          }}>
            <span style={{ color: textColor }}>{t('usage.advancedRAG')}</span>
            <span style={{ color: textColor }}>
              {Number(usage.usage.advanced_rag_count) || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

