import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useLanguage } from './LanguageContext';
import shared from '../styles/shared.module.css';
import forms from '../styles/forms.module.css';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/components/AvatarCropModal.module.css';

const AVATAR_SIZE = 200;

export default function AvatarCropModal({ 
  imageSrc, 
  onCropComplete, 
  onCancel, 
  darkMode = false 
}) {
  const { t } = useLanguage();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = useCallback((crop) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom) => {
    setZoom(zoom);
  }, []);

  const onCropAreaComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.9 // Quality
      );
    });
  };

  const handleSave = async () => {
    try {
      if (!croppedAreaPixels) {
        return;
      }

      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${darkMode ? styles.darkMode : ''}`}>
        <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''} ${styles.title}`}>
          {t('avatar.cropTitle')}
        </h3>

        <div className={styles.cropperContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
            cropShape="round"
            showGrid={false}
          />
        </div>

        <div className={`${forms.formGroup} ${styles.formGroup}`}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            {t('avatar.zoom')}
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className={styles.zoomSlider}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button
            onClick={onCancel}
            className={`${buttons.button} ${buttons.buttonSecondary} ${darkMode ? buttons.darkMode : ''}`}
          >
            {t('avatar.cancel')}
          </button>
          <button
            onClick={handleSave}
            className={`${buttons.button} ${buttons.buttonPrimary} ${darkMode ? buttons.darkMode : ''}`}
          >
            {t('avatar.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

