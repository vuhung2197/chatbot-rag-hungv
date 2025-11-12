import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AvatarUploader from './AvatarUploader';
import EmailVerification from './EmailVerification';
import ChangePassword from './ChangePassword';
import SessionManagement from './SessionManagement';
import OAuthProviders from './OAuthProviders';
import { useLanguage } from './LanguageContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ProfileSettings({ darkMode = false, onClose }) {
  const { language, changeLanguage, t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      setProfile(data);
      setDisplayName(data.displayName || data.name || '');
      setEmail(data.email || '');
      setBio(data.bio || '');
      setTimezone(data.timezone || 'Asia/Ho_Chi_Minh');
      const userLanguage = data.language || 'vi';
      // Update LanguageContext when profile loads
      if (userLanguage !== language) {
        changeLanguage(userLanguage);
      }
    } catch (err) {
      setError(t('profile.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/user/profile`,
        {
          displayName: displayName.trim() || null,
          email: email.trim() || null,
          bio: bio.trim() || null,
          timezone,
          language,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess(t('profile.updateSuccess'));
      // Language context is already updated when user changes dropdown
      // Reload profile to get updated data
      await loadProfile();
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl) => {
    setProfile((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
    setSuccess('Đã cập nhật avatar thành công!');
  };

  const handleVerificationUpdate = async () => {
    // Reload profile from API to get the latest email verification status
    await loadProfile();
  };

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: darkMode ? '#fff' : '#333',
      }}>
        {t('common.loading')}
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: darkMode ? '#fff' : '#333',
      }}>
        {t('profile.loadError')}
      </div>
    );
  }

  const bgColor = darkMode ? '#1a1a1a' : '#fff';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#444' : '#ddd';
  const inputBg = darkMode ? '#2d2d2d' : '#fff';
  const inputBorder = darkMode ? '#555' : '#ccc';

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: bgColor,
      color: textColor,
      borderRadius: '12px',
      boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          ⚙️ Cài đặt Profile
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: textColor,
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#4a1f1f' : '#fee',
          color: darkMode ? '#ff6b6b' : '#c33',
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${darkMode ? '#6b2b2b' : '#fcc'}`,
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#1f4a1f' : '#efe',
          color: darkMode ? '#6bff6b' : '#3c3',
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${darkMode ? '#2b6b2b' : '#cfc'}`,
        }}>
          {success}
        </div>
      )}

      {/* Avatar Section */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{t('profile.avatar')}</h3>
        <AvatarUploader
          currentAvatarUrl={profile.avatarUrl}
          onAvatarUpdate={handleAvatarUpdate}
          darkMode={darkMode}
        />
      </div>

      {/* Profile Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Display Name */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
          }}>
            {t('profile.displayName')}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('profile.displayName')}
            maxLength={100}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${inputBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: inputBg,
              color: textColor,
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            fontSize: '12px',
            color: darkMode ? '#999' : '#666',
            marginTop: '4px',
          }}>
            {t('profile.displayNameHint')}
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${inputBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: inputBg,
              color: textColor,
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            fontSize: '12px',
            color: darkMode ? '#999' : '#666',
            marginTop: '4px',
          }}>
            {email !== profile.email && (
              <span style={{ color: '#ffc107' }}>⚠ Email sẽ được cập nhật và cần xác thực lại</span>
            )}
          </div>
        </div>

        {/* Email Verification */}
        <EmailVerification
          email={profile.email}
          emailVerified={profile.emailVerified}
          darkMode={darkMode}
          onVerificationUpdate={handleVerificationUpdate}
        />

        {/* Bio */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
          }}>
            {t('profile.bio')}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('profile.bioPlaceholder')}
            maxLength={500}
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${inputBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: inputBg,
              color: textColor,
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{
            fontSize: '12px',
            color: darkMode ? '#999' : '#666',
            marginTop: '4px',
          }}>
            {bio.length}/500 ký tự
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
          }}>
            {t('profile.timezone')}
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${inputBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: inputBg,
              color: textColor,
              boxSizing: 'border-box',
            }}
          >
            <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
            <option value="UTC">UTC (GMT+0)</option>
            <option value="America/New_York">America/New_York (GMT-5)</option>
            <option value="Europe/London">Europe/London (GMT+0)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
          }}>
            {t('profile.language')}
          </label>
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              // Apply language immediately
              changeLanguage(newLang);
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${inputBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: inputBg,
              color: textColor,
              boxSizing: 'border-box',
            }}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Account Info */}
        <div style={{
          padding: '16px',
          backgroundColor: darkMode ? '#2d2d2d' : '#f9f9f9',
          borderRadius: '6px',
          fontSize: '14px',
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>{t('profile.accountStatus')}:</strong> {profile.accountStatus === 'active' ? (language === 'vi' ? '✓ Hoạt động' : '✓ Active') : profile.accountStatus}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>{t('profile.createdAt')}:</strong> {new Date(profile.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
          </div>
          {profile.lastLoginAt && (
            <div>
              <strong>{t('profile.lastLogin')}:</strong> {new Date(profile.lastLoginAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
            </div>
          )}
        </div>

        {/* Password Management */}
        <ChangePassword darkMode={darkMode} />

        {/* Session Management */}
        <SessionManagement darkMode={darkMode} />

        {/* OAuth Providers Management */}
        <OAuthProviders darkMode={darkMode} />

        {/* Save Button */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          {onClose && (
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {t('common.cancel')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#7137ea',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? t('profile.saving') : t('profile.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}

