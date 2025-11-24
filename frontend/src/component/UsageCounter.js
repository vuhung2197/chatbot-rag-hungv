import React, { useState, useEffect } from 'react';
import axios from 'axios';
import shared from '../styles/shared.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/UsageCounter.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function UsageCounter({ darkMode }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUsage() {
    try {
      const res = await axios.get(`${API_URL}/usage/today`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setUsage(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching usage:', err);
      setLoading(false);
    }
  }

  if (loading || !usage) {
    return null;
  }

  // Get usage values from backend response
  const queriesCount = Number(usage.usage?.queries_count) || 0;
  const advancedRagCount = Number(usage.usage?.advanced_rag_count) || 0;
  const queriesLimit = usage.limits?.queries_per_day || 50;
  const queriesPercent = usage.percentage?.queries || 0;
  
  // Advanced RAG doesn't have a limit in the response, so we'll just show the count
  const isNearLimit = queriesPercent >= 80;
  const isAtLimit = queriesPercent >= 100;

  const containerClasses = [
    styles.container,
    darkMode ? styles.darkMode : '',
    isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ''
  ].filter(Boolean).join(' ');

  const valueClasses = [
    styles.value,
    darkMode ? styles.darkMode : '',
    isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ''
  ].filter(Boolean).join(' ');

  const progressFillClasses = [
    styles.progressFill,
    isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className={`${styles.title} ${darkMode ? styles.darkMode : ''}`}>
        📊 Usage Today
      </div>
      
      {/* Queries */}
      <div className={styles.queriesSection}>
        <div className={styles.row}>
          <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>Queries:</span>
          <span className={valueClasses}>
            {queriesCount} / {queriesLimit === -1 ? '∞' : queriesLimit}
          </span>
        </div>
        {queriesLimit !== -1 && (
          <div className={`${styles.progressBar} ${darkMode ? styles.darkMode : ''}`}>
            <div
              className={progressFillClasses}
              style={{ width: `${Math.min(100, queriesPercent)}%` }}
            />
          </div>
        )}
      </div>

      {/* Advanced RAG */}
      {advancedRagCount > 0 && (
        <div className={styles.advancedRagSection}>
          <div className={styles.row}>
            <span className={`${styles.label} ${darkMode ? styles.darkMode : ''}`}>Advanced RAG:</span>
            <span className={`${styles.value} ${darkMode ? styles.darkMode : ''}`}>
              {advancedRagCount}
            </span>
          </div>
        </div>
      )}

      {/* Alert */}
      {isAtLimit && (
        <div className={`${messages.error} ${messages.darkMode} ${styles.alertCompact}`}>
          ⚠️ Limit reached!
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className={`${messages.warning} ${messages.darkMode} ${styles.alertCompact}`}>
          ⚠️ Near limit
        </div>
      )}
    </div>
  );
}

