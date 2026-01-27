import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import shared from '../../styles/shared.module.css';
import styles from '../../styles/components/UsageChart.module.css';

export default function UsageChart({ stats = [], period = 'week', darkMode = false }) {
  const { t, language } = useLanguage();

  if (!stats || stats.length === 0) {
    return (
      <div className={`${shared.emptyState} ${darkMode ? shared.darkMode : ''}`}>
        {t('usage.noData')}
      </div>
    );
  }

  // Prepare data for charts
  const chartData = stats.map(stat => ({
    date: stat.date,
    queries: parseInt(stat.total_queries) || 0,
    files: parseInt(stat.total_file_uploads) || 0,
    size: parseFloat(stat.total_file_size) || 0,
    tokens: parseInt(stat.total_tokens) || 0
  }));

  // Find max values for scaling
  const maxQueries = Math.max(...chartData.map(d => d.queries), 1);
  const maxFiles = Math.max(...chartData.map(d => d.files), 1);
  const maxSize = Math.max(...chartData.map(d => d.size), 1);
  const maxTokens = Math.max(...chartData.map(d => d.tokens), 1);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      if (period === 'day') {
        return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
          month: 'short',
          day: 'numeric'
        });
      } else if (period === 'week') {
        return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
          month: 'short',
          day: 'numeric'
        });
      } else {
        return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
          month: 'short',
          year: 'numeric'
        });
      }
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={`${styles.chartContainer} ${darkMode ? styles.darkMode : ''}`}>
      <h4 className={`${styles.chartTitle} ${darkMode ? styles.darkMode : ''}`}>
        📈 {t('usage.usageTrends') || 'Usage Trends'}
      </h4>

      {/* Queries Chart */}
      <div className={styles.chartSection}>
        <div className={`${styles.chartLabel} ${darkMode ? styles.darkMode : ''}`}>
          {t('usage.queries')}
        </div>
        <div className={styles.barChart}>
          {chartData.map((data, index) => (
            <div key={index} className={styles.barItem}>
              <div className={styles.barWrapper}>
                <div
                  className={`${styles.bar} ${styles.barQueries}`}
                  style={{ height: `${(data.queries / maxQueries) * 100}%` }}
                  title={`${data.queries} queries`}
                />
              </div>
              <div className={`${styles.barLabel} ${darkMode ? styles.darkMode : ''}`}>
                {formatDate(data.date)}
              </div>
              <div className={`${styles.barValue} ${darkMode ? styles.darkMode : ''}`}>
                {data.queries}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File Uploads Chart */}
      <div className={styles.chartSection}>
        <div className={`${styles.chartLabel} ${darkMode ? styles.darkMode : ''}`}>
          {t('usage.fileUploads')}
        </div>
        <div className={styles.barChart}>
          {chartData.map((data, index) => (
            <div key={index} className={styles.barItem}>
              <div className={styles.barWrapper}>
                <div
                  className={`${styles.bar} ${styles.barFiles}`}
                  style={{ height: `${(data.files / maxFiles) * 100}%` }}
                  title={`${data.files} files`}
                />
              </div>
              <div className={`${styles.barLabel} ${darkMode ? styles.darkMode : ''}`}>
                {formatDate(data.date)}
              </div>
              <div className={`${styles.barValue} ${darkMode ? styles.darkMode : ''}`}>
                {data.files}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File Size Chart */}
      <div className={styles.chartSection}>
        <div className={`${styles.chartLabel} ${darkMode ? styles.darkMode : ''}`}>
          {t('usage.fileSize')} (MB)
        </div>
        <div className={styles.barChart}>
          {chartData.map((data, index) => (
            <div key={index} className={styles.barItem}>
              <div className={styles.barWrapper}>
                <div
                  className={`${styles.bar} ${styles.barSize}`}
                  style={{ height: `${(data.size / maxSize) * 100}%` }}
                  title={`${data.size.toFixed(2)} MB`}
                />
              </div>
              <div className={`${styles.barLabel} ${darkMode ? styles.darkMode : ''}`}>
                {formatDate(data.date)}
              </div>
              <div className={`${styles.barValue} ${darkMode ? styles.darkMode : ''}`}>
                {data.size.toFixed(1)}MB
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tokens Chart */}
      {maxTokens > 0 && (
        <div className={styles.chartSection}>
          <div className={`${styles.chartLabel} ${darkMode ? styles.darkMode : ''}`}>
            {t('usage.tokens')}
          </div>
          <div className={styles.barChart}>
            {chartData.map((data, index) => (
              <div key={index} className={styles.barItem}>
                <div className={styles.barWrapper}>
                  <div
                    className={`${styles.bar} ${styles.barTokens}`}
                    style={{ height: `${(data.tokens / maxTokens) * 100}%` }}
                    title={`${data.tokens.toLocaleString()} tokens`}
                  />
                </div>
                <div className={`${styles.barLabel} ${darkMode ? styles.darkMode : ''}`}>
                  {formatDate(data.date)}
                </div>
                <div className={`${styles.barValue} ${darkMode ? styles.darkMode : ''}`}>
                  {(data.tokens / 1000).toFixed(1)}K
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

