import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';
import { useToastContext } from '../../context/ToastContext';
import { useConfirmContext } from '../../context/ConfirmContext';
import shared from '../../styles/shared.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import forms from '../../styles/forms.module.css';
import styles from '../../styles/components/ConversationsList.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ─── Sub-component: Conversations Header ───
function ConversationsHeader({ onSelectConversation, fetchConversations, onClose, darkMode, showArchived, setShowArchived }) {
  return (
    <>
      <div className={styles.sidebarActions}>
        <button onClick={() => onSelectConversation && onSelectConversation(null)} className={styles.newChatButton}>
          <i className="fas fa-plus"></i> Dòng trò chuyện mới
        </button>
      </div>

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${!showArchived ? styles.tabActive : ''}`}
          onClick={() => setShowArchived(false)}
        >
          <i className="fas fa-comments"></i> Hoạt động
        </button>
        <button
          className={`${styles.tab} ${showArchived ? styles.tabActive : ''}`}
          onClick={() => setShowArchived(true)}
        >
          <i className="fas fa-archive"></i> Đã lưu trữ
        </button>
      </div>

      <div className={`${styles.header} ${darkMode ? styles.darkMode : ''}`}>
        <h4 className={`${styles.headerTitle} ${darkMode ? styles.darkMode : ''}`}>
          {showArchived ? 'Đã lưu trữ' : 'Lịch sử chat'}
        </h4>
        <div className={styles.headerActions}>
          <button onClick={fetchConversations} className={`${styles.refreshButton} ${darkMode ? styles.darkMode : ''}`} title="Làm mới">
            <i className="fas fa-sync-alt"></i>
          </button>
          {onClose && (
            <button onClick={onClose} className={`${styles.refreshButton} ${darkMode ? styles.darkMode : ''}`} title="Đóng sidebar">
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-component: Conversation Item ───
function ConversationItem({
  conv, currentConversationId, editingId, editTitle, setEditTitle,
  setEditingId, handleRename, startEdit, handlePin, handleArchive,
  handleDelete, onSelectConversation, formatDate, darkMode
}) {
  return (
    <div
      className={`${styles.conversationItem} ${currentConversationId === conv.conversation_id ? styles.active : ''} ${darkMode ? styles.darkMode : ''}`}
      onClick={() => onSelectConversation && onSelectConversation(conv.conversation_id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelectConversation && onSelectConversation(conv.conversation_id)}
      role="button"
      tabIndex={0}
    >
      {editingId === conv.conversation_id ? (
        <div className={styles.editContainer}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(conv.conversation_id, conv.conversation_title);
              if (e.key === 'Escape') { setEditingId(null); setEditTitle(''); }
            }}
            autoFocus
            className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
          />
          <button
            onClick={(e) => { e.stopPropagation(); handleRename(conv.conversation_id, conv.conversation_title); }}
            className={`${buttons.button} ${buttons.buttonSmall} ${buttons.buttonSuccess}`}
          >✓</button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditingId(null); setEditTitle(''); }}
            className={`${buttons.button} ${buttons.buttonSmall} ${buttons.buttonSecondary}`}
          >✕</button>
        </div>
      ) : (
        <>
          <div className={styles.conversationHeader}>
            <div className={styles.conversationTitle}>
              <div className={`${styles.titleText} ${darkMode ? styles.darkMode : ''}`}>
                {conv.is_pinned && <i className={`fas fa-thumbtack ${styles.pinIcon}`}></i>}
                {conv.conversation_title || 'Untitled Chat'}
              </div>
              <div className={`${styles.meta} ${darkMode ? styles.darkMode : ''}`}>
                {conv.message_count} tin nhắn • {formatDate(conv.last_message_at)}
              </div>
            </div>
          </div>
          <div className={styles.actions} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <button onClick={() => startEdit(conv.conversation_id, conv.conversation_title)} className={`${styles.actionButton} ${darkMode ? styles.darkMode : ''}`} title="Đổi tên"><i className="fas fa-edit"></i></button>
            <button onClick={() => handlePin(conv.conversation_id, conv.is_pinned)} className={`${styles.actionButton} ${conv.is_pinned ? styles.pinned : ''} ${darkMode ? styles.darkMode : ''}`} title={conv.is_pinned ? 'Bỏ ghim' : 'Ghim'}><i className="fas fa-thumbtack"></i></button>
            <button onClick={() => handleArchive(conv.conversation_id, conv.is_archived)} className={`${styles.actionButton} ${darkMode ? styles.darkMode : ''}`} title={conv.is_archived ? 'Bỏ lưu trữ' : 'Lưu trữ'}><i className={conv.is_archived ? 'fas fa-box-open' : 'fas fa-archive'}></i></button>
            <button onClick={() => handleDelete(conv.conversation_id)} className={`${styles.actionButton} ${styles.danger}`} title="Xóa"><i className="fas fa-trash-alt"></i></button>
          </div>
        </>
      )}
    </div>
  );
}

const ConversationsList = forwardRef(function ConversationsList({ darkMode, onSelectConversation, currentConversationId, onClose }, ref) {
  const { error: showError } = useToastContext();
  const { confirm } = useConfirmContext();
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [showArchived]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const endpoint = showArchived ? `${API_URL}/conversations/archived` : `${API_URL}/conversations`;
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (showArchived) {
        setArchivedConversations(res.data.conversations || []);
      } else {
        setConversations(res.data.conversations || []);
      }
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
      showError('Không thể đổi tên cuộc trò chuyện');
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
      // Nếu lưu trữ (archive), ẩn khỏi danh sách; nếu bỏ lưu trữ thì ẩn khỏi archived
      if (!isArchived) {
        setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
        if (currentConversationId === conversationId && onSelectConversation) {
          onSelectConversation(null);
        }
      } else {
        setArchivedConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
      }
    } catch (err) {
      console.error('Error archiving conversation:', err);
      showError('Không thể lưu trữ cuộc trò chuyện');
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
      setConversations(prev => {
        const updated = prev.map(c =>
          c.conversation_id === conversationId
            ? { ...c, is_pinned: !isPinned }
            : c
        );
        // Sắp xếp lại: ghim lên đầu, sau đó theo thời gian
        return updated.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) {
            return b.is_pinned ? 1 : -1;
          }
          return new Date(b.last_message_at) - new Date(a.last_message_at);
        });
      });
    } catch (err) {
      console.error('Error pinning conversation:', err);
      showError('Không thể ghim cuộc trò chuyện');
    }
  };

  const handleDelete = async (conversationId) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc muốn xóa cuộc trò chuyện này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

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
      showError('Không thể xóa cuộc trò chuyện');
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

  useImperativeHandle(ref, () => ({
    fetchConversations
  }));

  const displayList = showArchived ? archivedConversations : conversations;

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
      <ConversationsHeader
        onSelectConversation={onSelectConversation}
        fetchConversations={fetchConversations}
        onClose={onClose}
        darkMode={darkMode}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
      />

      {loading ? (
        <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''}`}>Đang tải...</div>
      ) : error ? (
        <div className={messages.error}>{error}</div>
      ) : displayList.length === 0 ? (
        <div className={`${shared.emptyState} ${darkMode ? shared.darkMode : ''}`}>
          {showArchived ? 'Không có cuộc trò chuyện nào đã lưu trữ' : 'Chưa có cuộc trò chuyện nào'}
        </div>
      ) : (
        <div className={styles.conversationsList}>
          {displayList.map((conv) => (
            <ConversationItem
              key={conv.conversation_id}
              conv={conv}
              currentConversationId={currentConversationId}
              editingId={editingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              setEditingId={setEditingId}
              handleRename={handleRename}
              startEdit={startEdit}
              handlePin={handlePin}
              handleArchive={handleArchive}
              handleDelete={handleDelete}
              onSelectConversation={onSelectConversation}
              formatDate={formatDate}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default ConversationsList;

