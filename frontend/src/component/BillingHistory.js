import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import shared from '../styles/shared.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/BillingHistory.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function BillingHistory({ darkMode = false, inModal = false }) {
  const { t, language } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/subscription/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(res.data.invoices || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading billing history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '-';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'Free';
    return `$${Number(amount).toFixed(2)}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return { text: t('subscription.active'), class: styles.statusActive };
      case 'cancelled':
        return { text: t('subscription.cancelled'), class: styles.statusCancelled };
      case 'expired':
        return { text: 'Expired', class: styles.statusExpired };
      case 'trial':
        return { text: t('subscription.trial'), class: styles.statusTrial };
      default:
        return { text: status, class: styles.statusDefault };
    }
  };

  if (loading) {
    return (
      <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''}`}>
        {t('common.loading')}...
      </div>
    );
  }

  return (
    <div className={inModal ? '' : `${shared.container} ${darkMode ? shared.darkMode : ''}`}>
      {!inModal && (
        <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
          💳 {t('subscription.billingHistory') || 'Billing History'}
        </h3>
      )}

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className={`${shared.emptyState} ${darkMode ? shared.darkMode : ''}`}>
          {t('subscription.noInvoices') || 'No billing history found'}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={`${styles.table} ${darkMode ? styles.darkMode : ''}`}>
            <thead>
              <tr>
                <th>{t('subscription.invoiceNumber') || 'Invoice #'}</th>
                <th>{t('subscription.plan') || 'Plan'}</th>
                <th>{t('subscription.amount') || 'Amount'}</th>
                <th>{t('subscription.billingCycle') || 'Billing Cycle'}</th>
                <th>{t('subscription.period') || 'Period'}</th>
                <th>{t('subscription.status') || 'Status'}</th>
                <th>{t('subscription.date') || 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const statusBadge = getStatusBadge(invoice.status);
                return (
                  <tr key={invoice.id}>
                    <td className={styles.invoiceNumber}>
                      {invoice.invoice_number}
                    </td>
                    <td>
                      <div className={styles.tierName}>
                        {invoice.tier_display_name}
                      </div>
                    </td>
                    <td className={styles.amount}>
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className={styles.billingCycle}>
                      {invoice.billing_cycle === 'yearly' 
                        ? (t('subscription.yearly') || 'Yearly')
                        : (t('subscription.monthly') || 'Monthly')}
                    </td>
                    <td className={styles.period}>
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusBadge.class}`}>
                        {statusBadge.text}
                      </span>
                    </td>
                    <td className={styles.date}>
                      {formatDate(invoice.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {invoices.length > 0 && (
        <div className={`${styles.footer} ${darkMode ? styles.darkMode : ''}`}>
          <p className={styles.footerText}>
            {t('subscription.billingNote') || 'Note: This is a simplified billing history. In production, this would integrate with Stripe/PayPal for actual payment records.'}
          </p>
        </div>
      )}
    </div>
  );
}

