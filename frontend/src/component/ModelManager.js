// ModelManagerPage.jsx
import React, { useState, useEffect } from 'react';

const defaultForm = { name: '', key: '', url: '', temperature: 0.7, maxTokens: 512 };

const ModelManagerPage = ({ onSelectModel, onClose }) => {
  const [models, setModels] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('llm_models');
    if (stored) setModels(JSON.parse(stored));
  }, []);

  const saveModels = (newList) => {
    setModels(newList);
    localStorage.setItem('llm_models', JSON.stringify(newList));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'temperature' || name === 'maxTokens' ? Number(value) : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updated = [...models];
    if (editingIndex !== null) {
      updated[editingIndex] = form;
    } else {
      updated.push(form);
    }
    saveModels(updated);
    setForm(defaultForm);
    setEditingIndex(null);
  };

  const handleEdit = (index) => {
    setForm(models[index]);
    setEditingIndex(index);
  };

  const handleDelete = (index) => {
    const updated = models.filter((_, i) => i !== index);
    saveModels(updated);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "24px 28px", width: "90%", maxWidth: 640,
        maxHeight: "80vh", overflowY: "auto", position: "relative", color: "#333",
        fontFamily: "Segoe UI, Arial, sans-serif"
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>🧠 Quản lý mô hình LLM</h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          <input style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8 }} placeholder="Tên model" name="name" value={form.name} onChange={handleChange} required />
          <input style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8 }} placeholder="URL Endpoint" name="url" value={form.url} onChange={handleChange} required />
          <input style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8 }} placeholder="Temperature (0-1)" type="number" step="0.01" min="-1" max="1" name="temperature" value={form.temperature} onChange={handleChange} required />
          <input style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8 }} placeholder="Max Tokens" type="number" name="maxTokens" value={form.maxTokens} onChange={handleChange} required />
          <button style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px', borderRadius: 6, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            {editingIndex !== null ? 'Cập nhật' : 'Thêm mô hình'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {models.map((m, i) => (
            <div key={i} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: '#555' }}>{m.url}</div>
                <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>Temp: {m.temperature} | MaxTokens: {m.maxTokens}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleEdit(i)}>Sửa</button>
                <button style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleDelete(i)}>Xoá</button>
                <button style={{ color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { onSelectModel(m); onClose(); }}>Chọn</button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 16,
          border: "none", background: "transparent", fontSize: 24, cursor: "pointer"
        }}>✕</button>
      </div>
    </div>
  );
};

export default ModelManagerPage;