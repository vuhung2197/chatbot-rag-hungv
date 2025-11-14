import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { useConfirmContext } from '../context/ConfirmContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SubscriptionStatus({ darkMode = false, refreshTrigger }) {
  const { t, language } = useLanguage();
  const { confirm } = useConfirmContext();
  const [subscription, setSubscription] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  const loadSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/subscription/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscription(res.data.subscription);
      setTier(res.data.tier);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tierName) => {
    const confirmed = await confirm({
      title: t('subscription.upgradeConfirm'),
      message: t('subscription.upgradeConfirm'),
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    setUpgrading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/upgrade`,
        { tierName, billingCycle: 'monthly' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.upgradeError'));
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: t('subscription.cancelConfirm'),
      message: t('subscription.cancelConfirm'),
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.cancelError'));
    }
  };

  const handleRenew = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/subscription/renew`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadSubscription();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.renewError'));
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

  const formatDate = (dateString) => {
    if (!dateString || dateString === '0' || dateString === 0) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US');
    } catch (e) {
      return '';
    }
  };

  const getTierColor = (tierName) => {
    switch (tierName) {
      case 'free':
        return darkMode ? '#666' : '#999';
      case 'pro':
        return '#7137ea';
      case 'team':
        return '#28a745';
      default:
        return textColor;
    }
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
        💳 {t('subscription.title')}
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

      {tier && (
        <div style={{
          padding: '16px',
          backgroundColor: cardBg,
          borderRadius: '6px',
          border: `1px solid ${borderColor}`,
          marginBottom: '16px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <div>
              <h4 style={{
                margin: 0,
                fontSize: '20px',
                color: getTierColor(tier.name),
                fontWeight: '600',
              }}>
                {tier.display_name}
              </h4>
              {subscription && (
                <div style={{
                  fontSize: '12px',
                  color: darkMode ? '#999' : '#666',
                  marginTop: '4px',
                }}>
                  {subscription.status === 'active' ? '✓ ' + t('subscription.active') :
                   subscription.status === 'trial' ? '⏱ ' + t('subscription.trial') :
                   subscription.status === 'cancelled' ? '⚠ ' + t('subscription.cancelled') :
                   subscription.status}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {tier.price_monthly && Number(tier.price_monthly) > 0 ? (
                <>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: textColor }}>
                    ${Number(tier.price_monthly)}
                  </div>
                  <div style={{ fontSize: '12px', color: darkMode ? '#999' : '#666' }}>
                    /{t('subscription.month')}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '24px', fontWeight: '600', color: textColor }}>
                  {t('subscription.free')}
                </div>
              )}
            </div>
          </div>

          {subscription && (
            <div style={{
              fontSize: '14px',
              color: darkMode ? '#ccc' : '#666',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: `1px solid ${borderColor}`,
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>{t('subscription.periodStart')}:</strong> {formatDate(subscription.current_period_start)}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>{t('subscription.periodEnd')}:</strong> {formatDate(subscription.current_period_end)}
              </div>
              {Boolean(subscription.cancel_at_period_end) && (
                <div style={{
                  color: '#ffc107',
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: darkMode ? '#3d3d1f' : '#fff3cd',
                  borderRadius: '4px',
                }}>
                  ⚠ {t('subscription.willCancel')}
                </div>
              )}
            </div>
          )}

          <div style={{
            marginTop: '12px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}>
            {subscription && Boolean(subscription.cancel_at_period_end) && (
              <button
                onClick={handleRenew}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {t('subscription.renew')}
              </button>
            )}

            {subscription && subscription.status === 'active' && !Boolean(subscription.cancel_at_period_end) && tier.name !== 'free' && (
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {t('subscription.cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Features List */}
      {tier && tier.features && (
        <div style={{
          padding: '16px',
          backgroundColor: cardBg,
          borderRadius: '6px',
          border: `1px solid ${borderColor}`,
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: textColor }}>
            {t('subscription.features')}
          </h4>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: darkMode ? '#ccc' : '#666',
            fontSize: '14px',
          }}>
            {tier.features.queries_per_day === -1 ? (
              <li>{t('subscription.unlimitedQueries')}</li>
            ) : (
              <li>{tier.features.queries_per_day} {t('subscription.queriesPerDay')}</li>
            )}
            {Boolean(tier.features.advanced_rag) && (
              <li>{t('subscription.advancedRAG')}</li>
            )}
            {tier.features.file_upload_mb === -1 ? (
              <li>{t('subscription.unlimitedFileUpload')}</li>
            ) : (
              <li>{tier.features.file_upload_mb}MB {t('subscription.fileUpload')}</li>
            )}
            {tier.features.chat_history_days === -1 ? (
              <li>{t('subscription.unlimitedHistory')}</li>
            ) : (
              <li>{tier.features.chat_history_days} {t('subscription.daysHistory')}</li>
            )}
            {Boolean(tier.features.priority_support) && (
              <li>{t('subscription.prioritySupport')}</li>
            )}
            {Boolean(tier.features.api_access) && (
              <li>{t('subscription.apiAccess')}</li>
            )}
            {Boolean(tier.features.team_collaboration) && (
              <li>{t('subscription.teamCollaboration')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

