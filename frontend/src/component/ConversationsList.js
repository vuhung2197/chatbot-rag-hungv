import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ConversationsList({ darkMode, onSelectConversation, currentConversationId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get(`${API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(res.data.conversations || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Không thể tải danh sách cuộc trò chuyện');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (conversationId, currentTitle) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/conversations/${conversationId}/rename`,
        { title: editTitle.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations(prev =>
        prev.map(c =>
          c.conversation_id === conversationId
            ? { ...c, conversation_title: editTitle.trim() }
            : c
        )
      );
      setEditingId(null);
      setEditTitle('');
    } catch (err) {
      console.error('Error renaming conversation:', err);
      alert('Không thể đổi tên cuộc trò chuyện');
    }
  };

  const handleArchive = async (conversationId, isArchived) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/conversations/${conversationId}/archive`,
        { archived: !isArchived },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations(prev =>
        prev.map(c =>
          c.conversation_id === conversationId
            ? { ...c, is_archived: !isArchived }
            : c
        )
      );
    } catch (err) {
      console.error('Error archiving conversation:', err);
      alert('Không thể lưu trữ cuộc trò chuyện');
    }
  };

  const handlePin = async (conversationId, isPinned) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/conversations/${conversationId}/pin`,
        { pinned: !isPinned },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations(prev =>
        prev.map(c =>
          c.conversation_id === conversationId
            ? { ...c, is_pinned: !isPinned }
            : c
        )
      );
    } catch (err) {
      console.error('Error pinning conversation:', err);
      alert('Không thể ghim cuộc trò chuyện');
    }
  };

  const handleDelete = async (conversationId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
      if (currentConversationId === conversationId && onSelectConversation) {
        onSelectConversation(null);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      alert('Không thể xóa cuộc trò chuyện');
    }
  };

  const startEdit = (conversationId, currentTitle) => {
    setEditingId(conversationId);
    setEditTitle(currentTitle || '');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: 'center',
          color: darkMode ? '#aaa' : '#666',
        }}
      >
        Đang tải...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: 'center',
          color: '#ef4444',
        }}
      >
        {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: 'center',
          color: darkMode ? '#aaa' : '#666',
        }}
      >
        Chưa có cuộc trò chuyện nào
      </div>
    );
  }

  return (
    <div
      style={{
        background: darkMode ? '#1e1e1e' : '#f9f9f9',
        borderRight: `1px solid ${darkMode ? '#333' : '#ddd'}`,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${darkMode ? '#333' : '#ddd'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            margin: 0,
            color: darkMode ? '#fff' : '#333',
            fontSize: '1.1em',
          }}
        >
          💬 Cuộc trò chuyện
        </h3>
        <button
          onClick={fetchConversations}
          style={{
            background: 'transparent',
            border: 'none',
            color: darkMode ? '#aaa' : '#666',
            cursor: 'pointer',
            fontSize: '1.2em',
          }}
          title="Làm mới"
        >
          🔄
        </button>
      </div>

      <div style={{ padding: '8px' }}>
        {conversations.map((conv) => (
          <div
            key={conv.conversation_id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              borderRadius: 8,
              background:
                currentConversationId === conv.conversation_id
                  ? darkMode
                    ? '#333'
                    : '#e8e8e8'
                  : darkMode
                  ? '#252525'
                  : '#fff',
              border: `1px solid ${
                currentConversationId === conv.conversation_id
                  ? '#7137ea'
                  : darkMode
                  ? '#333'
                  : '#ddd'
              }`,
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={() => onSelectConversation && onSelectConversation(conv.conversation_id)}
          >
            {editingId === conv.conversation_id ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRename(conv.conversation_id, conv.conversation_title);
                    }
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditTitle('');
                    }
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: `1px solid ${darkMode ? '#555' : '#ccc'}`,
                    borderRadius: 4,
                    background: darkMode ? '#1e1e1e' : '#fff',
                    color: darkMode ? '#fff' : '#333',
                    fontSize: '0.9em',
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(conv.conversation_id, conv.conversation_title);
                  }}
                  style={{
                    background: '#7137ea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(null);
                    setEditTitle('');
                  }}
                  style={{
                    background: '#666',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        color: darkMode ? '#fff' : '#333',
                        fontSize: '0.95em',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {conv.is_pinned && '📌 '}
                      {conv.conversation_title || 'Cuộc trò chuyện không có tiêu đề'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8em',
                        color: darkMode ? '#888' : '#666',
                      }}
                    >
                      {conv.message_count} tin nhắn • {formatDate(conv.last_message_at)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    marginTop: 8,
                    justifyContent: 'flex-end',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => startEdit(conv.conversation_id, conv.conversation_title)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: darkMode ? '#aaa' : '#666',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      padding: '2px 6px',
                    }}
                    title="Đổi tên"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handlePin(conv.conversation_id, conv.is_pinned)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: conv.is_pinned
                        ? '#7137ea'
                        : darkMode
                        ? '#aaa'
                        : '#666',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      padding: '2px 6px',
                    }}
                    title={conv.is_pinned ? 'Bỏ ghim' : 'Ghim'}
                  >
                    📌
                  </button>
                  <button
                    onClick={() => handleArchive(conv.conversation_id, conv.is_archived)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: darkMode ? '#aaa' : '#666',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      padding: '2px 6px',
                    }}
                    title={conv.is_archived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
                  >
                    {conv.is_archived ? '📦' : '📁'}
                  </button>
                  <button
                    onClick={() => handleDelete(conv.conversation_id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      padding: '2px 6px',
                    }}
                    title="Xóa"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

