import React from 'react';
import BillingHistory from './BillingHistory';
import buttons from '../../styles/buttons.module.css';
import styles from '../../styles/components/BillingHistoryModal.module.css';

export default function BillingHistoryModal({ darkMode = false, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()} role="button" tabIndex={0}>
      <div
        className={`${styles.modal} ${darkMode ? styles.darkMode : ''}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className={styles.header}>
          <h2 className={`${styles.title} ${darkMode ? styles.darkMode : ''}`}>
            💳 Billing History
          </h2>
          <button
            onClick={onClose}
            className={`${styles.closeButton} ${darkMode ? styles.darkMode : ''}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={styles.content}>
          <BillingHistory darkMode={darkMode} inModal={true} />
        </div>
      </div>
    </div>
  );
}

