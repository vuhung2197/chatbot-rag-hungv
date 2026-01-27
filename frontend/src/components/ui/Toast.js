import React, { useEffect } from 'react';
import styles from '../../styles/components/Toast.module.css';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getClassName = () => {
    // Map type to camelCase class names
    const typeClassMap = {
      info: styles.toastInfo,
      success: styles.toastSuccess,
      error: styles.toastError,
      warning: styles.toastWarning
    };

    return `${styles.toast} ${typeClassMap[type] || styles.toastInfo}`;
  };

  return (
    <div className={getClassName()}>
      <div className={styles.toastContent}>
        <span className={styles.toastIcon}>{getIcon()}</span>
        <span className={styles.toastMessage}>{message}</span>
        <button className={styles.toastClose} onClick={onClose}>×</button>
      </div>
    </div>
  );
}

