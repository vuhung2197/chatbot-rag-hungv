import React from 'react';
import Toast from './Toast';
import styles from '../../styles/components/ToastContainer.module.css';

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className={styles['toast-container']}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

