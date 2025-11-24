import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import UsageLimits from './UsageLimits';
import UsageChart from './UsageChart';
import shared from '../styles/shared.module.css';
import forms from '../styles/forms.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/UsageDashboard.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function UsageDashboard({ darkMode = false, refreshTrigger }) {
  const { t, language } = useLanguage();
  const [usage, setUsage] = useState(null);
  const [limits, setLimits] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    loadData();
  }, [period]);

  // Refresh when refreshTrigger changes (e.g., after file upload)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadData();
    }
  }, [refreshTrigger]);

  // Listen for file upload events from other components
  useEffect(() => {
    const handleFileUpload = () => {
      // Small delay to ensure backend has saved the usage
      setTimeout(() => {
        loadData();
      }, 500);
    };

    window.addEventListener('fileUploaded', handleFileUpload);
    return () => {
      window.removeEventListener('fileUploaded', handleFileUpload);
    };
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [usageRes, limitsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/usage/today`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/usage/limits`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/usage/stats?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setUsage(usageRes.data);
      setLimits(limitsRes.data.limits);
      setStats(statsRes.data.stats || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('usage.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''}`}>
        {t('common.loading')}...
      </div>
    );
  }

  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''}`}>
      <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
        📊 {t('usage.dashboard')}
      </h3>

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}

      {/* Usage Limits Component */}
      {usage && limits && (
        <UsageLimits usage={usage} limits={limits} darkMode={darkMode} />
      )}

      {/* Period Selector */}
      <div className={styles.periodSelector}>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={`${forms.select} ${darkMode ? forms.darkMode : ''}`}
        >
          <option value="day">{t('usage.last7Days')}</option>
          <option value="week">{t('usage.last30Days')}</option>
          <option value="month">{t('usage.last12Months')}</option>
        </select>
      </div>

      {/* Usage Charts */}
      {stats.length > 0 && (
        <UsageChart 
          stats={stats} 
          period={period} 
          darkMode={darkMode} 
        />
      )}

      {/* Statistics Summary */}
      {stats.length > 0 && (
        <div className={`${styles.statsCard} ${darkMode ? styles.darkMode : ''}`}>
          <h4 className={`${styles.statsTitle} ${darkMode ? styles.darkMode : ''}`}>
            {t('usage.statistics')}
          </h4>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statLabel} ${darkMode ? styles.darkMode : ''}`}>
                {t('usage.totalQueries')}
              </div>
              <div className={`${styles.statValue} ${darkMode ? styles.darkMode : ''}`}>
                {stats.reduce((sum, s) => sum + (parseInt(s.total_queries) || 0), 0)}
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statLabel} ${darkMode ? styles.darkMode : ''}`}>
                {t('usage.totalFiles')}
              </div>
              <div className={`${styles.statValue} ${darkMode ? styles.darkMode : ''}`}>
                {stats.reduce((sum, s) => sum + (parseInt(s.total_file_uploads) || 0), 0)}
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statLabel} ${darkMode ? styles.darkMode : ''}`}>
                {t('usage.totalSize')}
              </div>
              <div className={`${styles.statValue} ${darkMode ? styles.darkMode : ''}`}>
                {stats.reduce((sum, s) => sum + (parseFloat(s.total_file_size) || 0), 0).toFixed(2)} MB
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statLabel} ${darkMode ? styles.darkMode : ''}`}>
                {t('usage.totalTokens')}
              </div>
              <div className={`${styles.statValue} ${darkMode ? styles.darkMode : ''}`}>
                {stats.reduce((sum, s) => sum + (parseInt(s.total_tokens) || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {stats.length === 0 && !loading && (
        <div className={`${shared.emptyState} ${darkMode ? shared.darkMode : ''}`}>
          {t('usage.noData')}
        </div>
      )}
    </div>
  );
}

