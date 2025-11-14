import React, { useState, useRef } from 'react';
import axios from 'axios';
import AvatarCropModal from './AvatarCropModal';
import { useLanguage } from './LanguageContext';
import { useConfirmContext } from '../context/ConfirmContext';

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '20px',
      backgroundColor: darkMode ? '#2d2d2d' : '#f9f9f9',
      borderRadius: '12px',
    }}>
      {/* Avatar Preview */}
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: `3px solid ${darkMode ? '#555' : '#ddd'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: darkMode ? '#1a1a1a' : '#fff',
      }}>
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Avatar"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            fontSize: '48px',
            color: darkMode ? '#666' : '#999',
          }}>
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
        style={{ display: 'none' }}
      />

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '8px 16px',
            backgroundColor: darkMode ? '#7137ea' : '#7137ea',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {preview ? t('avatar.selectAgain') : t('avatar.selectImage')}
        </button>

        {preview && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              padding: '8px 16px',
              backgroundColor: darkMode ? '#28a745' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? t('avatar.uploading') : t('avatar.upload')}
          </button>
        )}

        {currentAvatarUrl && !preview && (
          <button
            onClick={handleDelete}
            disabled={uploading}
            style={{
              padding: '8px 16px',
              backgroundColor: darkMode ? '#dc3545' : '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {t('avatar.delete')}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          color: '#dc3545',
          fontSize: '14px',
          textAlign: 'center',
          marginTop: '8px',
        }}>
          {error}
        </div>
      )}

      {/* Info */}
      <div style={{
        fontSize: '12px',
        color: darkMode ? '#999' : '#666',
        textAlign: 'center',
      }}>
        {t('avatar.fileInfo')}
      </div>
    </div>
    </>
  );
}

