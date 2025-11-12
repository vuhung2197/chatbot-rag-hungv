import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function OAuthProviders({ darkMode = false }) {
  const { t, language } = useLanguage();
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
    if (!window.confirm(t('oauth.unlinkConfirm', { provider }))) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/auth/oauth/${provider}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const providerName = getProviderName(provider);
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

  const bgColor = darkMode ? '#2d2d2d' : '#f9f9f9';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';
  const inputBg = darkMode ? '#1a1a1a' : '#fff';
  const buttonBg = '#7137ea';
  const successColor = '#28a745';
  const errorColor = '#dc3545';
  const linkedColor = darkMode ? '#2d4a2d' : '#e8f5e9';
  const unlinkedColor = darkMode ? '#3d3d3d' : '#f5f5f5';

  const availableProviders = ['google', 'github', 'microsoft'];

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
        {t('oauth.loading')}...
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
      <h3 style={{
        marginTop: 0,
        marginBottom: '20px',
        fontSize: '18px',
        color: textColor,
      }}>
        🔗 {t('oauth.title')}
      </h3>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#4a1f1f' : '#fee',
          color: darkMode ? '#ff6b6b' : errorColor,
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${darkMode ? '#6b2b2b' : '#fcc'}`,
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#1f4a1f' : '#efe',
          color: darkMode ? '#6bff6b' : successColor,
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${darkMode ? '#2b6b2b' : '#cfc'}`,
          fontSize: '14px',
        }}>
          {success}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <p style={{
          color: textColor,
          fontSize: '14px',
          marginBottom: '16px',
          opacity: 0.8,
        }}>
          {t('oauth.description')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {availableProviders.map((provider) => {
          const linked = isLinked(provider);
          const linkedData = linked ? getLinkedProvider(provider) : null;

          return (
            <div
              key={provider}
              style={{
                padding: '16px',
                backgroundColor: linked ? linkedColor : unlinkedColor,
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '24px' }}>{getProviderIcon(provider)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '500',
                    color: textColor,
                    fontSize: '16px',
                    marginBottom: '4px',
                  }}>
                    {getProviderName(provider)}
                  </div>
                  {linked && linkedData?.provider_email && (
                    <div style={{
                      fontSize: '12px',
                      color: darkMode ? '#999' : '#666',
                    }}>
                      {linkedData.provider_email}
                    </div>
                  )}
                  {linked && linkedData?.created_at && (
                    <div style={{
                      fontSize: '12px',
                      color: darkMode ? '#999' : '#666',
                      marginTop: '2px',
                    }}>
                      {language === 'vi' ? 'Liên kết từ' : 'Linked since'}: {new Date(linkedData.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {linked ? (
                  <>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: successColor,
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}>
                      {t('oauth.linked')}
                    </span>
                    <button
                      onClick={() => handleUnlink(provider)}
                      disabled={linking}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: errorColor,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        opacity: linking ? 0.6 : 1,
                      }}
                    >
                      {t('oauth.unlink')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleLink(provider)}
                    disabled={linking}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: linking ? '#999' : buttonBg,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: linking ? 'not-allowed' : 'pointer',
                      opacity: linking ? 0.6 : 1,
                    }}
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
        <div style={{
          padding: '16px',
          backgroundColor: darkMode ? '#2d3a4a' : '#e3f2fd',
          color: darkMode ? '#90caf9' : '#1976d2',
          borderRadius: '6px',
          marginTop: '16px',
          fontSize: '14px',
          textAlign: 'center',
        }}>
          ℹ️ {t('oauth.noProviders')}
        </div>
      )}
    </div>
  );
}

