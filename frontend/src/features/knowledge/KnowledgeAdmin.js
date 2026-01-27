import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../styles/KnowledgeAdmin.css';
import { useConfirmContext } from '../../context/ConfirmContext';
import shared from '../../styles/shared.module.css';
import forms from '../../styles/forms.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/KnowledgeAdmin.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function KnowledgeAdmin() {
  const { confirm } = useConfirmContext();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', id: null });
  const [chunkPreview, setChunkPreview] = useState({ id: null, chunks: [] });
  const [unanswered, setUnanswered] = useState([]);
  const [showChunkModal, setShowChunkModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null); // 'loading', 'success', 'error'
  const [uploadMessage, setUploadMessage] = useState('');
  const [showFullContentModal, setShowFullContentModal] = useState(false);
  const [fullContent, setFullContent] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    fetchList();
    fetchUnanswered();
  }, []);

  const fetchList = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/knowledge`, { headers: { Authorization: `Bearer ${token}` } });
      setList(res.data);
    } catch (err) {
      console.error('Failed to fetch knowledge list', err);
    }
  };

  const fetchUnanswered = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/unanswered`, { headers: { Authorization: `Bearer ${token}` } });
      setUnanswered(res.data);
    } catch (err) {
      console.error('Failed to fetch unanswered list', err);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const url = form.id
      ? `${API_URL}/knowledge/${form.id}`
      : `${API_URL}/knowledge`;
    const method = form.id ? 'put' : 'post';

    const token = localStorage.getItem('token');
    await axios[method](url, {
      title: form.title,
      content: form.content,
    }, { headers: { Authorization: `Bearer ${token}` } });

    setForm({ title: '', content: '', id: null });
    await fetchList();
    await fetchUnanswered();
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async id => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa kiến thức này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (confirmed) {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/knowledge/${id}`, { headers: { Authorization: `Bearer ${token}` } });
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
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/knowledge/${id}/chunks`, { headers: { Authorization: `Bearer ${token}` } });
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
    const confirmed = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa câu hỏi này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (confirmed) {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/unanswered/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUnanswered(unanswered.filter(item => item.id !== id));
    }
  };

  const handleFileUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;

    // Set uploading state
    setUploading(true);
    setUploadStatus('loading');
    setUploadFileName(file.name);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUploadStatus('error');
        setUploadMessage('Vui lòng đăng nhập để upload file');
        setTimeout(() => {
          setUploading(false);
          setUploadStatus(null);
          setUploadFileName('');
        }, 3000);
        return;
      }

      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });



      // Success
      setUploadStatus('success');
      setUploadMessage(res.data.message || '✅ File đã được huấn luyện thành công!');
      fetchList();

      // Trigger refresh for Usage Dashboard
      window.dispatchEvent(new Event('fileUploaded'));

      // Auto close after 2 seconds
      setTimeout(() => {
        setUploading(false);
        setUploadStatus(null);
        setUploadFileName('');
        setUploadMessage('');
      }, 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
      setUploadStatus('error');
      setUploadMessage(`Lỗi khi tải lên file: ${errorMessage}`);
      console.error('Upload error:', err);

      // Auto close after 3 seconds
      setTimeout(() => {
        setUploading(false);
        setUploadStatus(null);
        setUploadFileName('');
        setUploadMessage('');
      }, 3000);
    } finally {
      // Reset file input
      e.target.value = '';
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
                          setFullContent(item.content);
                          setShowFullContentModal(true);
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

      {/* Upload Loading Modal */}
      {uploading && (
        <div className={`modal-overlay ${styles.modalOverlay}`}>
          <div className={`modal-content ${styles.modalContent}`}>
            <div className={`modal-body ${styles.modalBody}`}>
              {uploadStatus === 'loading' && (
                <>
                  <div className={styles.loadingSpinner}></div>
                  <h3 className={`${shared.title} ${styles.modalTitle}`}>
                    Đang xử lý file...
                  </h3>
                  <p className={`${shared.text} ${styles.modalText}`}>
                    {uploadFileName && `File: ${uploadFileName}`}
                  </p>
                  <p className={`${shared.textSmall} ${styles.modalTextSmall}`}>
                    Vui lòng đợi trong khi file đang được upload và huấn luyện
                  </p>
                </>
              )}

              {uploadStatus === 'success' && (
                <>
                  <div className={styles.statusIcon}>
                    ✅
                  </div>
                  <h3 className={`${messages.success} ${styles.modalTitle}`}>
                    Thành công!
                  </h3>
                  <p className={`${shared.text} ${styles.modalTextWithLineHeight}`}>
                    {uploadMessage || 'File đã được huấn luyện thành công!'}
                  </p>
                  {uploadFileName && (
                    <p className={`${shared.textSmall} ${styles.modalTextSmall}`}>
                      File: {uploadFileName}
                    </p>
                  )}
                </>
              )}

              {uploadStatus === 'error' && (
                <>
                  <div className={`${styles.statusIcon} ${styles.statusIconError}`}>
                    ❌
                  </div>
                  <h3 className={`${messages.error} ${styles.modalTitle}`}>
                    Lỗi!
                  </h3>
                  <p className={`${shared.text} ${styles.modalTextWithLineHeight}`}>
                    {uploadMessage || 'Đã xảy ra lỗi khi upload file'}
                  </p>
                  {uploadFileName && (
                    <p className={`${shared.textSmall} ${styles.modalTextSmall}`}>
                      File: {uploadFileName}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Full Content Modal */}
      {showFullContentModal && (
        <div className="modal-overlay" onClick={() => setShowFullContentModal(false)}>
          <div className={`modal-content ${styles.modalContentFull}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nội dung đầy đủ</h3>
              <button
                onClick={() => setShowFullContentModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <pre className={styles.modalPre}>{fullContent}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
