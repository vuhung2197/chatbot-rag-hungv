import React from 'react';
import shared from '../styles/shared.module.css';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/components/ConfirmDialog.module.css';

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  confirmColor = '#dc3545',
  darkMode = false
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div 
        className={`${styles.content} ${darkMode ? styles.darkMode : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
            {title}
          </h3>
        )}
        <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.message}`}>
          {message}
        </p>
        <div className={styles.actions}>
          <button
            className={`${buttons.button} ${buttons.buttonSecondary} ${darkMode ? buttons.darkMode : ''}`}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`${buttons.button} ${buttons.buttonDanger}`}
            onClick={onConfirm}
            style={{ backgroundColor: confirmColor }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

