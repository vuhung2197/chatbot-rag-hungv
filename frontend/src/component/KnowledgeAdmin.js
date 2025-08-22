import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export default function KnowledgeAdmin() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', id: null });
  const [chunkPreview, setChunkPreview] = useState({ id: null, chunks: [] });
  const [unanswered, setUnanswered] = useState([]);
  const [showChunkModal, setShowChunkModal] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    fetchList();
    fetchUnanswered();
  }, []);

  const fetchList = async () => {
    const res = await axios.get(`${API_URL}/knowledge`);
    setList(res.data);
  };

  const fetchUnanswered = async () => {
    const res = await axios.get(`${API_URL}/unanswered`);
    setUnanswered(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = form.id
      ? `${API_URL}/knowledge/${form.id}`
      : `${API_URL}/knowledge`;
    const method = form.id ? 'put' : 'post';

    await axios[method](url, {
      title: form.title,
      content: form.content,
    });

    setForm({ title: '', content: '', id: null });
    await fetchList();
    await fetchUnanswered();
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa kiến thức này?')) {
      await axios.delete(`${API_URL}/knowledge/${id}`);
      setList(list.filter(item => item.id !== id));
      if (form.id === id) setForm({ title: '', content: '', id: null });
    }
  };

  const handleEdit = (item) => {
    setForm(item);
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancel = () => setForm({ title: '', content: '', id: null });

  const fetchChunks = async (id) => {
    console.log('🔍 Chunk button clicked with id:', id);
    try {
      const res = await axios.get(`${API_URL}/knowledge/${id}/chunks`);
      setChunkPreview({ id, chunks: res.data });
      setShowChunkModal(true);
    } catch (err) {
      console.error('❌ Lỗi khi lấy chunks:', err);
    }
  };

  const handleUseUnanswered = (question) => {
    setForm({ title: question.slice(0, 100), content: question, id: null });
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteUnanswered = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      await axios.delete(`${API_URL}/unanswered/${id}`);
      setUnanswered(unanswered.filter(item => item.id !== id));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/upload`, formData);

      if (res.status === 409) {
        alert(res.data.error);
        return;
      }

      alert(res.data.message || 'Tải lên thành công');
      fetchList();
    } catch (err) {
      alert(`Lỗi khi tải lên file: ${  err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', background: '#fff', padding: '2em', borderRadius: 18, boxShadow: '0 6px 32px 0 rgba(0,0,0,0.10)', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      <h2 style={{ color: '#4f3ed7', textAlign: 'center', marginBottom: 28, fontWeight: 800, letterSpacing: 1 }}>🧠 Quản Lý Kiến Thức</h2>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 600, marginBottom: 6, display: 'block', color: '#333' }}>📤 Upload file kiến thức:</label>
        <input type="file" accept=".txt,.md,.csv,.json" onChange={handleFileUpload} />
      </div>

      <form ref={formRef} onSubmit={handleSubmit} style={{ background: '#f8f7ff', padding: 18, borderRadius: 12, marginBottom: 30, boxShadow: '0 1px 8px 0 rgba(79,62,215,0.07)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input placeholder="Tiêu đề kiến thức..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          required maxLength={200} style={{ fontSize: 18, padding: '10px 16px', border: '1.5px solid #e3e0fd', borderRadius: 8, outline: 'none' }} />
        <textarea placeholder="Nội dung kiến thức..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
          required rows={5} style={{ fontSize: 16, padding: '10px 16px', border: '1.5px solid #e3e0fd', borderRadius: 8, outline: 'none', minHeight: 90 }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" style={{ background: '#4f3ed7', color: '#fff', fontWeight: 700, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'background .2s' }}>{form.id ? 'Cập nhật' : 'Thêm'}</button>
          {form.id && <button type="button" onClick={handleCancel} style={{ background: '#e5e5e5', color: '#4f3ed7', fontWeight: 700, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Hủy</button>}
        </div>
      </form>

      <div>
        <h3 style={{ color: '#22223b', borderBottom: '1.5px solid #e3e0fd', paddingBottom: 10, marginBottom: 20, fontWeight: 700 }}>📚 Danh sách kiến thức đã thêm</h3>
        {list.length === 0 ? (<div style={{ color: '#999', textAlign: 'center' }}>Chưa có kiến thức nào!</div>) : (
          <div style={{ display: 'grid', gap: 18 }}>
            {list.map(item => (
              <div key={item.id} style={{ background: '#f3f0fc', borderLeft: '5px solid #4f3ed7', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 6px 0 rgba(79,62,215,0.08)', position: 'relative' }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#322b6d' }}>{item.title}</div>
                <div style={{ fontSize: 16, color: '#444', whiteSpace: 'pre-line', marginBottom: 12 }}>{item.content}</div>
                <div style={{ display: 'flex', gap: 10, position: 'absolute', top: 16, right: 18 }}>
                  <button onClick={() => handleEdit(item)} style={{ background: '#fff', border: '1.2px solid #4f3ed7', color: '#4f3ed7', borderRadius: 6, padding: '4px 13px', fontWeight: 600, cursor: 'pointer', marginRight: 3 }}>Sửa</button>
                  <button onClick={() => handleDelete(item.id)} style={{ background: '#ffeded', border: '1.2px solid #ed6060', color: '#ed6060', borderRadius: 6, padding: '4px 13px', fontWeight: 600, cursor: 'pointer' }}>Xóa</button>
                  <button onClick={() => fetchChunks(item.id)} style={{ background: '#fefefe', border: '1px solid #bbb', color: '#444', borderRadius: 6, padding: '4px 13px', fontWeight: 600, cursor: 'pointer' }}>Chunk</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 40 }}>
        <h3 style={{ color: '#c22d2d', borderBottom: '1.5px solid #f5dada', paddingBottom: 10, marginBottom: 20, fontWeight: 700 }}>❓ Câu hỏi chưa có câu trả lời</h3>
        {unanswered.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>Không có câu hỏi nào bị bỏ sót.</div>
        ) : (
          <ul style={{ paddingLeft: 18, color: '#444' }}>
            {unanswered.map(q => (
              <li key={q.id} style={{ marginBottom: 8 }}>
                <span>{q.question}</span>
                <button onClick={() => handleUseUnanswered(q.question)} style={{ marginLeft: 10, padding: '2px 8px', fontSize: 13, borderRadius: 6, cursor: 'pointer', border: '1px solid #aaa' }}>Dùng để huấn luyện</button>
                <button onClick={() => handleDeleteUnanswered(q.id)} style={{ marginLeft: 10, padding: '2px 8px', fontSize: 13, borderRadius: 6, cursor: 'pointer', border: '1px solid #aaa' }}>Xóa</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showChunkModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '24px 28px', width: '90%', maxWidth: 600,
            maxHeight: '80vh', overflowY: 'auto', position: 'relative', color: '#333', fontFamily: 'Segoe UI, Arial, sans-serif'
          }}>
            <h3 style={{ marginBottom: 16 }}>📎 Các đoạn chunk của kiến thức</h3>
            {chunkPreview.chunks.length === 0 ? (
              <i style={{ color: '#999' }}>Chưa có chunk nào</i>
            ) : (
              chunkPreview.chunks.map((c, i) => (
                <div key={c.id} style={{ fontSize: 14, marginBottom: 14 }}>
                  <b>• Chunk {i + 1}</b> ({c.token_count} tokens):<br />
                  <span style={{ whiteSpace: 'pre-wrap' }}>{c.content}</span>
                </div>
              ))
            )}
            <button onClick={() => setShowChunkModal(false)} style={{
              position: 'absolute', top: 12, right: 14,
              border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer'
            }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
