// ModelManagerPage.jsx
import React, { useState, useEffect } from 'react';
import shared from '../../styles/shared.module.css';
import forms from '../../styles/forms.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/ModelManager.module.css';

const defaultForm = {
  name: '',
  key: '',
  url: '',
  temperature: 0.7,
  maxTokens: 512,
};

const ModelManagerPage = ({ onSelectModel, onClose }) => {
  const [models, setModels] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('llm_models');
    if (stored) setModels(JSON.parse(stored));
    
    // Get currently selected model
    const savedModel = localStorage.getItem('chatbot_selected_model');
    if (savedModel) {
      try {
        setSelectedModel(JSON.parse(savedModel));
      } catch (e) {
        console.error('Lỗi khi parse model đã chọn:', e);
      }
    }
  }, []);

  const saveModels = newList => {
    setModels(newList);
    localStorage.setItem('llm_models', JSON.stringify(newList));
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]:
        name === 'temperature' || name === 'maxTokens' ? Number(value) : value,
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const updated = [...models];
    if (editingIndex !== null) {
      updated[editingIndex] = form;
    } else {
      updated.push(form);
    }
    saveModels(updated);

    // Nếu đang sửa chính model đang được sử dụng, đồng bộ luôn model active
    // để URL/config mới được gửi lên backend mà không cần bấm "Chọn" lại.
    // onSelectModel (ở component cha) lo việc ghi localStorage.
    if (editingIndex !== null && selectedModel?.name === form.name) {
      setSelectedModel(form);
      onSelectModel(form);
    }

    setForm(defaultForm);
    setEditingIndex(null);
  };

  const handleEdit = index => {
    setForm(models[index]);
    setEditingIndex(index);
  };

  const handleDelete = index => {
    const removed = models[index];
    const updated = models.filter((_, i) => i !== index);
    saveModels(updated);

    // Nếu xoá đúng model đang được sử dụng, dọn luôn model active để
    // backend không nhận config trỏ tới model đã bị xoá (stale).
    // onSelectModel(null) (ở component cha) lo việc xoá localStorage.
    if (selectedModel?.name === removed.name) {
      setSelectedModel(null);
      onSelectModel(null);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>
          🧠 Quản lý mô hình LLM
        </h2>
        
        {selectedModel && (
          <div className={styles.selectedModelInfo}>
            <div className={styles.selectedModelIcon}>
              ✓
            </div>
            <div className={styles.selectedModelContent}>
              <div className={styles.selectedModelLabel}>
                Model chính (trả lời):
              </div>
              <div className={styles.selectedModelName}>
                {selectedModel.name}
              </div>
              <div className={styles.selectedModelUrl}>
                {selectedModel.url}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={forms.form}
        >
          <div className={forms.formRow}>
            <div className={forms.formGroup}>
              <label className={forms.label}>Tên model</label>
              <input
                className={forms.input}
                placeholder='Tên model'
                name='name'
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className={forms.formGroup}>
              <label className={forms.label}>URL Endpoint</label>
              <input
                className={forms.input}
                placeholder='URL Endpoint'
                name='url'
                value={form.url}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className={forms.formRow}>
            <div className={forms.formGroup}>
              <label className={forms.label}>Temperature (0-1)</label>
              <input
                className={forms.input}
                placeholder='Temperature (0-1)'
                type='number'
                step='0.01'
                min='-1'
                max='1'
                name='temperature'
                value={form.temperature}
                onChange={handleChange}
                required
              />
            </div>
            <div className={forms.formGroup}>
              <label className={forms.label}>Max Tokens</label>
              <input
                className={forms.input}
                placeholder='Max Tokens'
                type='number'
                name='maxTokens'
                value={form.maxTokens}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className={`${buttons.button} ${buttons.buttonPrimary}`}
          >
            {editingIndex !== null ? 'Cập nhật' : 'Thêm mô hình'}
          </button>
        </form>

        <div className={styles.modelsList}>
          {models.map((m, i) => (
            <div
              key={i}
              className={`${styles.modelCard} ${selectedModel?.name === m.name ? styles.selected : ''}`}
            >
              <div className={styles.modelInfo}>
                <div className={styles.modelHeader}>
                  <span className={styles.modelName}>{m.name}</span>
                  {selectedModel?.name === m.name && (
                    <span className={styles.badge}>
                      ✓ ĐANG SỬ DỤNG
                    </span>
                  )}
                </div>
                <div className={styles.modelUrl}>{m.url}</div>
                <div className={styles.modelMeta}>
                  Temp: {m.temperature} | MaxTokens: {m.maxTokens}
                </div>
              </div>
              <div className={styles.modelActions}>
                <button
                  className={`${buttons.button} ${buttons.buttonSmall} ${buttons.buttonSecondary}`}
                  onClick={() => handleEdit(i)}
                >
                  Sửa
                </button>
                <button
                  className={`${buttons.button} ${buttons.buttonSmall} ${buttons.buttonDanger}`}
                  onClick={() => handleDelete(i)}
                >
                  Xoá
                </button>
                <button
                  className={`${buttons.button} ${buttons.buttonSmall} ${selectedModel?.name === m.name ? buttons.buttonSuccess : buttons.buttonSecondary}`}
                  onClick={() => {
                    onSelectModel(m);
                    setSelectedModel(m);
                    onClose();
                  }}
                >
                  {selectedModel?.name === m.name ? '✓ Đã chọn' : 'Chọn'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className={styles.closeButton}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ModelManagerPage;
