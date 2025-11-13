import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useLanguage } from './LanguageContext';

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

  const bgColor = darkMode ? '#1a1a1a' : '#fff';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';
  const buttonBg = '#7137ea';
  const buttonCancelBg = darkMode ? '#444' : '#f0f0f0';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: bgColor,
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${borderColor}`,
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          color: textColor,
          fontSize: '18px',
        }}>
          {t('avatar.cropTitle')}
        </h3>

        <div style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          backgroundColor: darkMode ? '#2d2d2d' : '#f0f0f0',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
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

        <div style={{
          marginBottom: '20px',
        }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: textColor,
            fontSize: '14px',
          }}>
            {t('avatar.zoom')}
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{
              width: '100%',
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: buttonCancelBg,
              color: textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {t('avatar.cancel')}
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: buttonBg,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {t('avatar.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

