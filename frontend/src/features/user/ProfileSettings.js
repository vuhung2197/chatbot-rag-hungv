import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AvatarUploader from './AvatarUploader';
import EmailVerification from '../auth/EmailVerification';
import ChangePassword from './ChangePassword';
import SessionManagement from '../../hooks/SessionManagement';
import OAuthProviders from '../auth/OAuthProviders';
import SubscriptionStatus from '../subscription/SubscriptionStatus';
import SubscriptionPlans from '../subscription/SubscriptionPlans';
import BillingHistoryModal from '../subscription/BillingHistoryModal';
import UsageTrendsModal from './UsageTrendsModal';
import WalletDashboard from '../wallet/WalletDashboard';
import { useLanguage } from '../../context/LanguageContext';
import shared from '../../styles/shared.module.css';
import forms from '../../styles/forms.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/ProfileSettings.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ─── Helper: Format payment amount for success message ───
function formatPaymentAmount(amount, currency) {
  const isVND = currency === 'VND';
  const locale = isVND ? 'vi-VN' : 'en-US';
  const symbol = isVND ? 'đ' : '$';
  const formatted = parseFloat(amount).toLocaleString(locale);
  return isVND ? `${formatted}${symbol}` : `${symbol}${formatted}`;
}

// ─── Helper: Check payment success from URL params ───
function checkPaymentSuccess(language, t) {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  const amount = urlParams.get('amount');

  if (paymentStatus !== 'success' || !amount) return null;

  const currency = urlParams.get('currency') || (language === 'vi' ? 'VND' : 'USD');
  const amountString = formatPaymentAmount(amount, currency);
  window.history.replaceState({}, document.title, window.location.pathname);
  return `${t('payment.success')} ${amountString} ${t('payment.addedToWallet')}`;
}

// ─── Helper: Check if error is a session error ───
function isSessionError(errorMessage, statusCode) {
  if (statusCode !== 401) return false;
  const sessionKeywords = ['session', 'token', 'expired', 'revoked'];
  return sessionKeywords.some(kw => errorMessage.toLowerCase().includes(kw));
}

// ─── Sub-component: Profile Header ───
function ProfileHeader({ t, onClose, error, success, darkMode }) {
  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>⚙️ {t('profile.title')}</h2>
        {onClose && <button onClick={onClose} className={styles.closeButton}>×</button>}
      </div>
      {error && <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>{error}</div>}
      {success && <div className={`${messages.success} ${darkMode ? messages.darkMode : ''}`}>{success}</div>}
    </>
  );
}

// ─── Sub-component: Account Details ───
function AccountDetails({ profile, language, t }) {
  if (!profile) return null;
  return (
    <div className={styles.accountInfo}>
      <div className={styles.infoRow}><strong>{t('profile.accountStatus')}:</strong> {profile.accountStatus === 'active' ? `✓ ${t('common.active')}` : profile.accountStatus}</div>
      <div className={styles.infoRow}><strong>{t('profile.createdAt')}:</strong> {new Date(profile.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</div>
      {profile.lastLoginAt && (
        <div className={styles.infoRow}><strong>{t('profile.lastLogin')}:</strong> {new Date(profile.lastLoginAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</div>
      )}
    </div>
  );
}

// ─── Sub-component: Profile Footer ───
function ProfileFooter({ saving, onClose, handleSave, t, darkMode }) {
  return (
    <div className={styles.buttonContainer}>
      {onClose && (
        <button onClick={onClose} disabled={saving} className={`${buttons.button} ${buttons.buttonSecondary} ${darkMode ? buttons.darkMode : ''}`}>
          {t('common.cancel')}
        </button>
      )}
      <button onClick={handleSave} disabled={saving} className={`${buttons.button} ${buttons.buttonPrimary} ${darkMode ? buttons.darkMode : ''}`}>
        {saving ? t('profile.saving') : t('profile.saveChanges')}
      </button>
    </div>
  );
}

export default function ProfileSettings({ darkMode = false, onClose }) {
  const { language, changeLanguage, t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const containerRef = useRef(null);
  const [subscriptionRefreshTrigger, setSubscriptionRefreshTrigger] = useState(0);
  const [usageRefreshTrigger, setUsageRefreshTrigger] = useState(0);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showUsageTrendsModal, setShowUsageTrendsModal] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');


  useEffect(() => {
    loadProfile();

    const paymentMsg = checkPaymentSuccess(language, t);
    if (paymentMsg) {
      setSuccess(paymentMsg);
      setTimeout(() => setSuccess(''), 5000);
    }
  }, []);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError(t('profile.loadError'));
        setLoading(false);
        return;
      }

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
      // Don't set error if it's a 401 (session expired) - let axios interceptor handle it
      // Only set error for other types of errors
      if (err.response?.status !== 401) {
        setError(t('profile.loadError'));
      }
      console.error('Error loading profile:', err);
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

      // Update local state with saved values (no need to reload from API)
      // This prevents potential 401 errors from triggering logout
      setProfile((prev) => ({
        ...prev,
        displayName: displayName.trim() || prev.name,
        email: email.trim(),
        bio: bio.trim() || '',
        timezone,
        language,
      }));

      // Scroll to top of profile settings
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Auto-hide success message after 3 seconds (but don't close the modal)
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || t('profile.updateError');

      if (isSessionError(errorMessage, err.response?.status)) {
        console.error('Session expired during profile update:', errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl) => {
    setProfile((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
    setSuccess(t('profile.avatarUpdateSuccess'));
  };

  const handleVerificationUpdate = async () => {
    // Reload profile from API to get the latest email verification status
    await loadProfile();
  };

  if (loading) {
    return (
      <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''} ${styles.loading}`}>
        {t('common.loading')}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`${messages.error} ${darkMode ? messages.darkMode : ''} ${styles.error}`}>
        {t('profile.loadError')}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
    >
      <ProfileHeader t={t} onClose={onClose} error={error} success={success} darkMode={darkMode} />

      {/* Wallet Section - Moved to Top */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>💰 {t('wallet.myWallet')}</h3>
        <WalletDashboard
          onCurrencyChange={() => setSubscriptionRefreshTrigger(prev => prev + 1)}
          refreshTrigger={subscriptionRefreshTrigger}
        />
      </div>

      {/* Personal Information Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>👤 {t('profile.personalInfo')}</h3>

        {/* Avatar */}
        <div className={styles.subsection}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            {t('profile.avatar')}
          </label>
          <AvatarUploader
            currentAvatarUrl={profile.avatarUrl}
            onAvatarUpdate={handleAvatarUpdate}
            darkMode={darkMode}
          />
        </div>

        {/* Display Name */}
        <div className={forms.formGroup}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            {t('profile.displayName')}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('profile.displayName')}
            maxLength={100}
            className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
          />
          <div className={`${forms.hint} ${darkMode ? forms.darkMode : ''}`}>
            {t('profile.displayNameHint')}
          </div>
        </div>

        {/* Email */}
        <div className={forms.formGroup}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
          />
          <div className={`${forms.hint} ${darkMode ? forms.darkMode : ''}`}>
            {email !== profile.email && (
              <span className={messages.warning}>⚠ Email sẽ được cập nhật và cần xác thực lại</span>
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
        <div className={forms.formGroup}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            {t('profile.bio')}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('profile.bioPlaceholder')}
            maxLength={500}
            rows={4}
            className={`${forms.textarea} ${darkMode ? forms.darkMode : ''}`}
          />
          <div className={`${forms.hint} ${darkMode ? forms.darkMode : ''}`}>
            {bio.length}/500 ký tự
          </div>
        </div>

        {/* Timezone */}
        <div className={forms.formGroup}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            {t('profile.timezone')}
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={`${forms.select} ${darkMode ? forms.darkMode : ''}`}
          >
            <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
            <option value="UTC">UTC (GMT+0)</option>
            <option value="America/New_York">America/New_York (GMT-5)</option>
            <option value="Europe/London">Europe/London (GMT+0)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
          </select>
        </div>

        {/* Language */}
        <div className={forms.formGroup}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            {t('profile.language')}
          </label>
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              // Apply language immediately
              changeLanguage(newLang);
            }}
            className={`${forms.select} ${darkMode ? forms.darkMode : ''}`}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Account Info */}
        <AccountDetails profile={profile} language={language} t={t} />
      </div>

      {/* Profile Form */}
      <div className={forms.form}>
        {/* Subscription Status */}
        <SubscriptionStatus
          darkMode={darkMode}
          refreshTrigger={subscriptionRefreshTrigger}
        />

        {/* Billing History Button */}
        <div className={styles.actionSection}>
          <button
            onClick={() => setShowBillingModal(true)}
            className={`${buttons.button} ${buttons.buttonSecondary} ${darkMode ? buttons.darkMode : ''}`}
          >
            💳 {t('subscription.billingHistory') || 'View Billing History'}
          </button>
        </div>

        {/* Usage Trends Button */}
        <div className={styles.actionSection}>
          <button
            onClick={() => setShowUsageTrendsModal(true)}
            className={`${buttons.button} ${buttons.buttonSecondary} ${darkMode ? buttons.darkMode : ''}`}
          >
            📈 {t('usage.usageTrends') || 'View Usage Trends'}
          </button>
        </div>

        {/* Modals */}
        <BillingHistoryModal
          darkMode={darkMode}
          isOpen={showBillingModal}
          onClose={() => setShowBillingModal(false)}
        />
        <UsageTrendsModal
          darkMode={darkMode}
          isOpen={showUsageTrendsModal}
          onClose={() => setShowUsageTrendsModal(false)}
          refreshTrigger={usageRefreshTrigger}
        />

        {/* Subscription Plans */}
        <SubscriptionPlans
          darkMode={darkMode}
          onUpgrade={() => {
            // Trigger refresh for all subscription-related components
            setSubscriptionRefreshTrigger(prev => prev + 1);
          }}
          refreshTrigger={subscriptionRefreshTrigger}
        />

        {/* Password Management */}
        <ChangePassword darkMode={darkMode} />

        {/* Session Management */}
        <SessionManagement darkMode={darkMode} />

        {/* OAuth Providers Management */}
        <OAuthProviders darkMode={darkMode} />

        <ProfileFooter saving={saving} onClose={onClose} handleSave={handleSave} t={t} darkMode={darkMode} />
      </div>
    </div>
  );
}

