import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { useConfirmContext } from '../context/ConfirmContext';

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

  const bgColor = darkMode ? '#2d2d2d' : '#f9f9f9';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';
  const cardBg = darkMode ? '#1a1a1a' : '#fff';
  const buttonBg = '#7137ea';
  const dangerBg = '#dc3545';

  if (loading) {
    return (
        <div style={{
          padding: '20px',
          backgroundColor: bgColor,
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          marginTop: '20px',
          textAlign: 'center',
          color: textColor,
        }}>
          {t('session.loading')}
        </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: bgColor,
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      marginTop: '20px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          color: textColor,
        }}>
          🔐 {t('session.title')}
        </h3>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOthers}
            disabled={revoking === 'all'}
            style={{
              padding: '6px 12px',
              backgroundColor: dangerBg,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: revoking === 'all' ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: revoking === 'all' ? 0.6 : 1,
            }}
          >
            {revoking === 'all' ? t('session.revoking') : t('session.revokeAll')}
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#4a1f1f' : '#fee',
          color: darkMode ? '#ff6b6b' : '#dc3545',
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${darkMode ? '#6b2b2b' : '#fcc'}`,
        }}>
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: darkMode ? '#999' : '#666',
        }}>
          {t('session.noSessions')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                padding: '16px',
                backgroundColor: cardBg,
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}>
                  <span style={{ fontSize: '20px' }}>
                    {getDeviceIcon(session.userAgent)}
                  </span>
                  <div>
                    <div style={{
                      fontWeight: '500',
                      color: textColor,
                      fontSize: '14px',
                    }}>
                      {session.deviceInfo}
                      {session.isCurrent && (
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          backgroundColor: '#28a745',
                          color: '#fff',
                          borderRadius: '12px',
                          fontSize: '11px',
                        }}>
                          {t('session.current')}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: darkMode ? '#999' : '#666',
                      marginTop: '4px',
                    }}>
                      {session.ipAddress} • {formatDate(session.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => handleRevoke(session.id)}
                  disabled={revoking === session.id}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: dangerBg,
                    border: `1px solid ${dangerBg}`,
                    borderRadius: '6px',
                    cursor: revoking === session.id ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: revoking === session.id ? 0.6 : 1,
                  }}
                >
                  {revoking === session.id ? t('session.revoking') : t('session.revoke')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: darkMode ? '#1a1a1a' : '#f0f0f0',
        borderRadius: '6px',
        fontSize: '12px',
        color: darkMode ? '#999' : '#666',
      }}>
        💡 {t('session.tip')}
      </div>
    </div>
  );
}

