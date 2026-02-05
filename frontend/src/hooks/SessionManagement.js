import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useConfirmContext } from '../context/ConfirmContext';
import shared from '../styles/shared.module.css';
import buttons from '../styles/buttons.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/SessionManagement.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SessionManagement({ darkMode = false }) {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data.sessions || []);
    } catch (err) {
      setError(t('session.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    const confirmed = await confirm({
      title: t('session.revokeConfirm') || 'Xác nhận',
      message: t('session.revokeConfirm'),
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    setRevoking(sessionId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/auth/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Reload sessions
      await loadSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    const confirmed = await confirm({
      title: t('session.revokeAllConfirm') || 'Xác nhận',
      message: t('session.revokeAllConfirm'),
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    setRevoking('all');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_URL}/auth/sessions/all/others`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Show success message with details
      if (res.data.revokedCount > 0) {
        const message = res.data.messageDetail || res.data.message || 'Đã hủy tất cả phiên khác';
        setError(''); // Clear any previous errors
        // Note: We could add a success state here, but for now just reload
      }
      
      // Reload sessions
      await loadSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi revoke sessions');
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return '💻';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return '📱';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return '📱';
    }
    return '💻';
  };

  if (loading) {
    return (
      <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''} ${styles.loading}`}>
        {t('session.loading')}
      </div>
    );
  }

  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''} ${styles.container}`}>
      <div className={styles.header}>
        <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
          🔐 {t('session.title')}
        </h3>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOthers}
            disabled={revoking === 'all'}
            className={`${buttons.button} ${buttons.buttonDanger} ${buttons.buttonSmall} ${darkMode ? buttons.darkMode : ''}`}
          >
            {revoking === 'all' ? t('session.revoking') : t('session.revokeAll')}
          </button>
        )}
      </div>

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className={`${shared.emptyState} ${darkMode ? shared.darkMode : ''}`}>
          {t('session.noSessions')}
        </div>
      ) : (
        <div className={styles.sessionsList}>
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`${styles.sessionCard} ${darkMode ? styles.darkMode : ''}`}
            >
              <div className={styles.sessionInfo}>
                <div className={styles.sessionHeader}>
                  <span className={styles.deviceIcon}>
                    {getDeviceIcon(session.userAgent)}
                  </span>
                  <div>
                    <div className={styles.deviceName}>
                      {session.deviceInfo}
                      {session.isCurrent && (
                        <span className={styles.currentBadge}>
                          {t('session.current')}
                        </span>
                      )}
                    </div>
                    <div className={styles.sessionMeta}>
                      {session.ipAddress} • {formatDate(session.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => handleRevoke(session.id)}
                  disabled={revoking === session.id}
                  className={`${buttons.button} ${buttons.buttonSmall} ${buttons.buttonDanger} ${darkMode ? buttons.darkMode : ''}`}
                >
                  {revoking === session.id ? t('session.revoking') : t('session.revoke')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={styles.tipBox}>
        💡 {t('session.tip')}
      </div>
    </div>
  );
}

