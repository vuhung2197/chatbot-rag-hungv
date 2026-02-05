import React, { useState, useRef } from 'react';
import axios from 'axios';
import AvatarCropModal from './AvatarCropModal';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmContext } from '../../context/ConfirmContext';
import shared from '../../styles/shared.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/AvatarUploader.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function AvatarUploader({ currentAvatarUrl, onAvatarUpdate, darkMode = false }) {
  const { t } = useLanguage();
  const { confirm } = useConfirmContext();
  const [preview, setPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setError(t('avatar.invalidFileType'));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError(t('avatar.fileTooLarge'));
      return;
    }

    setError('');
    
    // Create preview and show crop modal
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result;
      setImageToCrop(imageUrl);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob) => {
    setCroppedImage(croppedBlob);
    setShowCropModal(false);
    
    // Create preview from cropped image
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleUpload = async () => {
    if (!croppedImage) {
      setError(t('avatar.noImageSelected'));
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      // Create a File object from the blob with a proper filename
      const file = new File([croppedImage], 'avatar.jpg', { type: 'image/jpeg' });
      formData.append('avatar', file);

      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/user/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.avatarUrl) {
        onAvatarUpdate(res.data.avatarUrl);
        setPreview(null);
        setCroppedImage(null);
        setImageToCrop(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || t('avatar.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: t('avatar.deleteConfirm') || 'Xác nhận xóa',
      message: t('avatar.deleteConfirm'),
      confirmText: t('common.confirm') || 'Xác nhận',
      cancelText: t('common.cancel') || 'Hủy',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/user/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onAvatarUpdate(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi xóa avatar');
    }
  };

  const displayUrl = preview || (currentAvatarUrl ? `${API_URL}${currentAvatarUrl}` : null);

  return (
    <>
      {showCropModal && imageToCrop && (
        <AvatarCropModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false);
            setImageToCrop(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          darkMode={darkMode}
        />
      )}
    <div className={styles.container}>
      {/* Avatar Preview */}
      <div className={`${styles.avatarPreview} ${darkMode ? styles.darkMode : ''}`}>
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Avatar"
            className={styles.avatarImage}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            👤
          </div>
        )}
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileSelect}
        className={styles.hiddenInput}
      />

      {/* Buttons */}
      <div className={styles.buttonGroup}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`${buttons.button} ${buttons.buttonPrimary} ${darkMode ? buttons.darkMode : ''}`}
        >
          {preview ? t('avatar.selectAgain') : t('avatar.selectImage')}
        </button>

        {preview && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`${buttons.button} ${buttons.buttonSuccess} ${darkMode ? buttons.darkMode : ''}`}
          >
            {uploading ? t('avatar.uploading') : t('avatar.upload')}
          </button>
        )}

        {currentAvatarUrl && !preview && (
          <button
            onClick={handleDelete}
            disabled={uploading}
            className={`${buttons.button} ${buttons.buttonDanger} ${darkMode ? buttons.darkMode : ''}`}
          >
            {t('avatar.delete')}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={messages.error}>
          {error}
        </div>
      )}

      {/* Info */}
      <div className={`${shared.textSmall} ${darkMode ? shared.darkMode : ''} ${styles.infoText}`}>
        {t('avatar.fileInfo')}
      </div>
    </div>
    </>
  );
}

