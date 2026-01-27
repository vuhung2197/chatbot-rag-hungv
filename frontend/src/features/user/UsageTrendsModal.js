import React, { useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import UsageChart from './UsageChart';
import shared from '../../styles/shared.module.css';
import forms from '../../styles/forms.module.css';
import messages from '../../styles/messages.module.css';
import buttons from '../../styles/buttons.module.css';
import styles from '../../styles/components/UsageTrendsModal.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function UsageTrendsModal({ darkMode = false, isOpen, onClose, refreshTrigger }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('week');

  React.useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, period, refreshTrigger]);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/usage/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data.stats || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('usage.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.modal} ${darkMode ? styles.darkMode : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={`${styles.title} ${darkMode ? styles.darkMode : ''}`}>
            📈 Usage Trends
          </h2>
          <button
            onClick={onClose}
            className={`${styles.closeButton} ${darkMode ? styles.darkMode : ''}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {error && (
            <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
              {error}
            </div>
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

          {loading ? (
            <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''}`}>
              {t('common.loading')}...
            </div>
          ) : stats.length > 0 ? (
            <UsageChart stats={stats} period={period} darkMode={darkMode} />
          ) : (
            <div className={`${shared.emptyState} ${darkMode ? shared.darkMode : ''}`}>
              {t('usage.noData')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

