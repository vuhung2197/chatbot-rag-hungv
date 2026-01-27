import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmContext } from '../../context/ConfirmContext';
import shared from '../../styles/shared.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/OAuthProviders.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function OAuthProviders({ darkMode = false }) {
  const { t, language } = useLanguage();
  const { confirm } = useConfirmContext();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadProviders();
    
    // Check if redirected from OAuth link callback
    const urlParams = new URLSearchParams(window.location.search);
    const oauthLinked = urlParams.get('oauth_linked');
    const oauthSuccess = urlParams.get('success');
    if (oauthLinked && oauthSuccess === 'true') {
      // Reload providers to show newly linked provider
      setTimeout(() => {
        loadProviders();
        const providerName = getProviderName(oauthLinked);
        const successMessage = t('oauth.linkSuccess').replace('{provider}', providerName);
        setSuccess(successMessage);
      }, 500);
    }
  }, []);

  const loadProviders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/auth/oauth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProviders(res.data.providers || []);
    } catch (err) {
      setError(err.response?.data?.message || t('oauth.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (provider) => {
    try {
      setLinking(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/auth/oauth/${provider}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Redirect to OAuth provider
      if (res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        setError(t('oauth.noRedirectUrl'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('oauth.linkError'));
      setLinking(false);
    }
  };

  const handleUnlink = async (provider) => {
    const providerName = getProviderName(provider);
    const confirmMessage = t('oauth.unlinkConfirm').replace('{provider}', providerName);
    
    const confirmed = await confirm({
      title: t('oauth.unlinkConfirm') || 'Xác nhận hủy liên kết',
      message: confirmMessage,
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/auth/oauth/${provider}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const successMessage = t('oauth.unlinkSuccess').replace('{provider}', providerName);
      setSuccess(successMessage);
      // Reload providers list
      await loadProviders();
    } catch (err) {
      setError(err.response?.data?.message || t('oauth.unlinkError'));
    }
  };

  const getProviderName = (provider) => {
    const names = {
      google: 'Google',
      github: 'GitHub',
      microsoft: 'Microsoft',
    };
    return names[provider] || provider;
  };

  const getProviderIcon = (provider) => {
    const icons = {
      google: '🔵',
      github: '⚫',
      microsoft: '🔷',
    };
    return icons[provider] || '🔗';
  };

  const isLinked = (provider) => {
    return providers.some((p) => p.provider === provider);
  };

  const getLinkedProvider = (provider) => {
    return providers.find((p) => p.provider === provider);
  };

  const availableProviders = ['google', 'github', 'microsoft'];

  if (loading) {
    return (
      <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''} ${styles.loading}`}>
        {t('oauth.loading')}...
      </div>
    );
  }

  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''} ${styles.container}`}>
      <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
        🔗 {t('oauth.title')}
      </h3>

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}

      {success && (
        <div className={`${messages.success} ${darkMode ? messages.darkMode : ''}`}>
          {success}
        </div>
      )}

      <div className={styles.description}>
        <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.descriptionText}`}>
          {t('oauth.description')}
        </p>
      </div>

      <div className={styles.providersList}>
        {availableProviders.map((provider) => {
          const linked = isLinked(provider);
          const linkedData = linked ? getLinkedProvider(provider) : null;

          return (
            <div
              key={provider}
              className={`${styles.providerCard} ${linked ? styles.providerCardLinked : styles.providerCardUnlinked} ${darkMode ? styles.darkMode : ''}`}
            >
              <div className={styles.providerInfo}>
                <span className={styles.providerIcon}>{getProviderIcon(provider)}</span>
                <div className={styles.providerDetails}>
                  <div className={styles.providerName}>
                    {getProviderName(provider)}
                  </div>
                  {linked && linkedData?.provider_email && (
                    <div className={styles.providerEmail}>
                      {linkedData.provider_email}
                    </div>
                  )}
                  {linked && linkedData?.created_at && (
                    <div className={styles.providerDate}>
                      {language === 'vi' ? 'Liên kết từ' : 'Linked since'}: {new Date(linkedData.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.providerActions}>
                {linked ? (
                  <>
                    <span className={styles.linkedBadge}>
                      {t('oauth.linked')}
                    </span>
                    <button
                      onClick={() => handleUnlink(provider)}
                      disabled={linking}
                      className={`${buttons.button} ${buttons.buttonDanger} ${buttons.buttonSmall} ${darkMode ? buttons.darkMode : ''}`}
                    >
                      {t('oauth.unlink')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleLink(provider)}
                    disabled={linking}
                    className={`${buttons.button} ${buttons.buttonPrimary} ${buttons.buttonSmall} ${darkMode ? buttons.darkMode : ''}`}
                  >
                    {linking ? t('oauth.linking') : t('oauth.link')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {providers.length === 0 && (
        <div className={`${messages.info} ${darkMode ? messages.darkMode : ''} ${styles.infoMessage}`}>
          ℹ️ {t('oauth.noProviders')}
        </div>
      )}
    </div>
  );
}

