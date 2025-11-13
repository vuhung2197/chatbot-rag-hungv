import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import UsageLimits from './UsageLimits';

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
      <div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#fff' : '#333' }}>
        {t('common.loading')}...
      </div>
    );
  }

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
        📊 {t('usage.dashboard')}
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

      {/* Usage Limits Component */}
      {usage && limits && (
        <UsageLimits usage={usage} limits={limits} darkMode={darkMode} />
      )}

      {/* Period Selector */}
      <div style={{ marginTop: '20px', marginBottom: '16px' }}>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: cardBg,
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '6px',
            fontSize: '14px',
          }}
        >
          <option value="day">{t('usage.last7Days')}</option>
          <option value="week">{t('usage.last30Days')}</option>
          <option value="month">{t('usage.last12Months')}</option>
        </select>
      </div>

      {/* Statistics Summary */}
      {stats.length > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: cardBg,
          borderRadius: '6px',
          border: `1px solid ${borderColor}`,
          marginTop: '16px',
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: textColor }}>
            {t('usage.statistics')}
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '12px', color: darkMode ? '#999' : '#666', marginBottom: '4px' }}>
                {t('usage.totalQueries')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: textColor }}>
                {stats.reduce((sum, s) => sum + (parseInt(s.total_queries) || 0), 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: darkMode ? '#999' : '#666', marginBottom: '4px' }}>
                {t('usage.totalFiles')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: textColor }}>
                {stats.reduce((sum, s) => sum + (parseInt(s.total_file_uploads) || 0), 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: darkMode ? '#999' : '#666', marginBottom: '4px' }}>
                {t('usage.totalSize')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: textColor }}>
                {stats.reduce((sum, s) => sum + (parseFloat(s.total_file_size) || 0), 0).toFixed(2)} MB
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: darkMode ? '#999' : '#666', marginBottom: '4px' }}>
                {t('usage.totalTokens')}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: textColor }}>
                {stats.reduce((sum, s) => sum + (parseInt(s.total_tokens) || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {stats.length === 0 && !loading && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: darkMode ? '#999' : '#666',
          fontSize: '14px',
        }}>
          {t('usage.noData')}
        </div>
      )}
    </div>
  );
}

