import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/KnowledgeAdmin.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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

  const handleSubmit = async e => {
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

  const handleDelete = async id => {
    if (window.confirm('Bạn có chắc chắn muốn xóa kiến thức này?')) {
      await axios.delete(`${API_URL}/knowledge/${id}`);
      setList(list.filter(item => item.id !== id));
      if (form.id === id) setForm({ title: '', content: '', id: null });
    }
  };

  const handleEdit = item => {
    setForm(item);
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancel = () => setForm({ title: '', content: '', id: null });

  const fetchChunks = async id => {
    // eslint-disable-next-line no-console
    console.log('🔍 Chunk button clicked with id:', id);
    try {
      const res = await axios.get(`${API_URL}/knowledge/${id}/chunks`);
      setChunkPreview({ id, chunks: res.data });
      setShowChunkModal(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('❌ Lỗi khi lấy chunks:', err);
    }
  };

  const handleUseUnanswered = question => {
    setForm({ title: question.slice(0, 100), content: question, id: null });
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteUnanswered = async id => {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      await axios.delete(`${API_URL}/unanswered/${id}`);
      setUnanswered(unanswered.filter(item => item.id !== id));
    }
  };

  const handleFileUpload = async e => {
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
      alert(`Lỗi khi tải lên file: ${err.message}`);
    }
  };

  return (
    <div className="knowledge-admin">
      <div className="admin-header">
        <div className="header-content">
          <div className="header-icon">🧠</div>
          <div className="header-text">
            <h1>Quản Lý Kiến Thức</h1>
            <p>Quản lý và cập nhật cơ sở kiến thức cho chatbot</p>
          </div>
        </div>
      </div>

      <div className="admin-container">
        {/* Upload Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>📤 Tải lên tài liệu</h3>
            <p>Upload file kiến thức từ máy tính</p>
          </div>
          <div className="upload-area">
            <input
              type="file"
              accept=".txt,.md,.csv,.json"
              onChange={handleFileUpload}
              className="file-input"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="file-label">
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                <span className="upload-title">Chọn file để tải lên</span>
                <span className="upload-subtitle">Hỗ trợ: .txt, .md, .csv, .json</span>
              </div>
            </label>
          </div>
        </div>

        {/* Form Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>✏️ Thêm/Sửa kiến thức</h3>
            <p>Nhập thông tin kiến thức mới hoặc chỉnh sửa</p>
          </div>
          <form ref={formRef} onSubmit={handleSubmit} className="knowledge-form">
            <div className="form-group">
              <label className="form-label">Tiêu đề kiến thức</label>
              <input
                type="text"
                placeholder="Nhập tiêu đề kiến thức..."
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
                maxLength={200}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nội dung kiến thức</label>
              <textarea
                placeholder="Nhập nội dung kiến thức..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                required
                rows={5}
                className="form-textarea"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {form.id ? 'Cập nhật kiến thức' : 'Thêm kiến thức'}
              </button>
              {form.id && (
                <button type="button" onClick={handleCancel} className="btn btn-secondary">
                  Hủy bỏ
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Knowledge List Section */}
        <div className="knowledge-section">
          <div className="section-header">
            <h3>📚 Danh sách kiến thức</h3>
            <p>Quản lý các kiến thức đã thêm vào hệ thống</p>
          </div>
          {list.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-text">
                <h4>Chưa có kiến thức nào</h4>
                <p>Hãy thêm kiến thức mới để bắt đầu</p>
              </div>
            </div>
          ) : (
            <div className="knowledge-grid">
              {list.map(item => (
                <div key={item.id} className="knowledge-card">
                  <div className="card-header">
                    <h4 className="card-title">{item.title}</h4>
                    <div className="card-actions">
                      <button
                        onClick={() => handleEdit(item)}
                        className="btn btn-sm btn-outline"
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => fetchChunks(item.id)}
                        className="btn btn-sm btn-info"
                        title="Xem chunks"
                      >
                        📄
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn btn-sm btn-danger"
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="card-content">
                    <p className="card-text">
                      {item.content.length > 150 
                        ? `${item.content.substring(0, 150)}...` 
                        : item.content
                      }
                    </p>
                    {item.content.length > 150 && (
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          const fullText = item.content;
                          if (window.confirm(`Nội dung đầy đủ:\n\n${fullText}`)) {
                            // User can copy or do something with full text
                          }
                        }}
                      >
                        Xem đầy đủ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unanswered Questions Section */}
        <div className="unanswered-section">
          <div className="section-header">
            <h3>❓ Câu hỏi chưa trả lời</h3>
            <p>Các câu hỏi người dùng chưa có câu trả lời phù hợp</p>
          </div>
          {unanswered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <div className="empty-text">
                <h4>Tuyệt vời!</h4>
                <p>Không có câu hỏi nào bị bỏ sót</p>
              </div>
            </div>
          ) : (
            <div className="unanswered-list">
              {unanswered.map(q => (
                <div key={q.id} className="unanswered-item">
                  <div className="question-content">
                    <p className="question-text">{q.question}</p>
                  </div>
                  <div className="question-actions">
                    <button
                      onClick={() => handleUseUnanswered(q.question)}
                      className="btn btn-sm btn-primary"
                    >
                      Dùng để huấn luyện
                    </button>
                    <button
                      onClick={() => handleDeleteUnanswered(q.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chunk Modal */}
      {showChunkModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📎 Các đoạn chunk của kiến thức</h3>
              <button
                onClick={() => setShowChunkModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {chunkPreview.chunks.length === 0 ? (
                <div className="empty-chunks">
                  <div className="empty-icon">📄</div>
                  <p>Chưa có chunk nào được tạo</p>
                </div>
              ) : (
                <div className="chunks-list">
                  {chunkPreview.chunks.map((c, i) => (
                    <div key={c.id} className="chunk-item">
                      <div className="chunk-header">
                        <span className="chunk-number">Chunk {i + 1}</span>
                        <span className="chunk-tokens">{c.token_count} tokens</span>
                      </div>
                      <div className="chunk-content">
                        <pre>{c.content}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
