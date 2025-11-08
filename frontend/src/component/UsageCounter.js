import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

  const { queries, advanced_rag } = usage.usage;
  const { queries: queriesLimit, advanced_rag: advancedRagLimit } = usage.limits;
  const queriesPercent = usage.percentage.queries;
  const advancedRagPercent = usage.percentage.advanced_rag;

  const isNearLimit = queriesPercent >= 80 || advancedRagPercent >= 80;
  const isAtLimit = queriesPercent >= 100 || advancedRagPercent >= 100;

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: darkMode ? '#2d3748' : '#fff',
        border: `1px solid ${isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : darkMode ? '#4a5568' : '#e2e8f0'}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: '12px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: 200,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: darkMode ? '#f7fafc' : '#1a202c' }}>
        📊 Usage Today
      </div>
      
      {/* Queries */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ color: darkMode ? '#cbd5e0' : '#4a5568' }}>Queries:</span>
          <span style={{ 
            fontWeight: 600,
            color: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : darkMode ? '#68d391' : '#48bb78'
          }}>
            {queries} / {queriesLimit}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: darkMode ? '#4a5568' : '#e2e8f0',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, queriesPercent)}%`,
              background: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#48bb78',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Advanced RAG */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ color: darkMode ? '#cbd5e0' : '#4a5568' }}>Advanced RAG:</span>
          <span style={{ 
            fontWeight: 600,
            color: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : darkMode ? '#68d391' : '#48bb78'
          }}>
            {advanced_rag} / {advancedRagLimit}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: darkMode ? '#4a5568' : '#e2e8f0',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, advancedRagPercent)}%`,
              background: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#48bb78',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Alert */}
      {isAtLimit && (
        <div
          style={{
            marginTop: 8,
            padding: 6,
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 4,
            fontSize: '11px',
            textAlign: 'center',
          }}
        >
          ⚠️ Limit reached!
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div
          style={{
            marginTop: 8,
            padding: 6,
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: 4,
            fontSize: '11px',
            textAlign: 'center',
          }}
        >
          ⚠️ Near limit
        </div>
      )}
    </div>
  );
}

