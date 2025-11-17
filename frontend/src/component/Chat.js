import { useState, useEffect, useRef } from 'react';
import ChatInputSuggest from './ChatInputSuggest';
import CryptoJS from 'crypto-js';
import ReactMarkdown from 'react-markdown';
import ModelManager from './ModelManager';
import ConversationsList from './ConversationsList';
import axios from 'axios';
import { useToastContext } from '../context/ToastContext';
import { useConfirmContext } from '../context/ConfirmContext';
import styles from '../styles/components/Chat.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Chat({ darkMode = false }) {
  const { error: showError, success: showSuccess } = useToastContext();
  const { confirm } = useConfirmContext();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [model, setModel] = useState(null);
  const [useAdvancedRAG, setUseAdvancedRAG] = useState(false);
  const [advancedResponse, setAdvancedResponse] = useState(null);
  const [showConversations, setShowConversations] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);

  // Load messages khi chọn conversation
  useEffect(() => {
    async function loadConversationMessages() {
      if (!currentConversationId) {
        setHistory([]);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get(
          `${API_URL}/conversations/${currentConversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Convert messages từ DB format sang history format
        const messages = res.data.messages || [];
        const formattedHistory = messages.map(msg => ({
          user: msg.question,
          bot: msg.bot_reply,
          createdAt: msg.created_at
        }));

        setHistory(formattedHistory.reverse()); // Reverse để hiển thị từ cũ đến mới
      } catch (err) {
        console.error('Error loading conversation messages:', err);
      }
    }

    loadConversationMessages();
  }, [currentConversationId]);

  // Auto scroll to last message (beginning of bot response)
  const scrollToLastMessage = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start' // Scroll to top of the message
      });
    } else {
      // Fallback to bottom if no last message ref
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToLastMessage();
  }, [history, loading]);

  // Render lần đầu tiên khi component mount
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const saved = localStorage.getItem(`chatbot_history_${userId}`);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Lỗi khi parse history:', e);
      }
    }

    const savedModel = localStorage.getItem('chatbot_selected_model');
    if (savedModel) {
      try {
        setModel(JSON.parse(savedModel));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Lỗi khi parse model đã lưu:', e);
      }
    }
  }, []);

  // Render lại khi history thay đổi
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    localStorage.setItem(`chatbot_history_${userId}`, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await axios.get(`${API_URL}/chat/history`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = res.data;
        setQuestionHistory(data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Lỗi khi lấy lịch sử câu hỏi:', err);
      }
    }

    fetchHistory();
  }, []);

  const hashQuestion = text => {
    return CryptoJS.SHA256(text.trim().toLowerCase()).toString();
  };

  async function sendChat() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setAdvancedResponse(null);
    const timestamp = new Date().toISOString();
    const hash = hashQuestion(input);
    const cached = JSON.parse(localStorage.getItem('chatbot_cache') || '{}');

    if (cached[hash] && !useAdvancedRAG) {
      setHistory([
        { user: input, bot: cached[hash], createdAt: timestamp },
        ...history,
      ]);
      setInput('');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');

    try {
      let res;
      if (useAdvancedRAG) {
        // Sử dụng Advanced RAG
        res = await axios.post(
          `${API_URL}/advanced-chat/advanced-chat`,
          { message: input, model, conversationId: currentConversationId },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setAdvancedResponse(res.data);
      } else {
        // Sử dụng RAG thông thường
        res = await axios.post(
          `${API_URL}/chat`,
          { message: input, model, conversationId: currentConversationId },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      
      // Cập nhật conversationId từ response nếu có
      if (res.data.conversationId) {
        setCurrentConversationId(res.data.conversationId);
      }
      
      const data = res.data;
      setHistory([
        ...history,
        { 
          user: input, 
          bot: data.reply, 
          createdAt: timestamp,
          chunks_used: data.chunks_used,
          metadata: data.metadata
        },
      ]);

      const isNoAnswer = [
        'Xin lỗi, tôi chưa có kiến thức phù hợp để trả lời câu hỏi này.',
        'Không thể tính embedding câu hỏi!',
        'Bot đang bận, vui lòng thử lại sau!',
        'Tôi chưa có kiến thức phù hợp để trả lời câu hỏi này.',
      ].includes(data.reply);

      if (!isNoAnswer && !useAdvancedRAG) {
        cached[hash] = data.reply;
        localStorage.setItem('chatbot_cache', JSON.stringify(cached));
      }

      setInput('');
    } catch (err) {
      setHistory([
        { user: input, bot: 'Lỗi khi gửi câu hỏi!', createdAt: timestamp },
        ...history,
      ]);
      setInput('');
    }
    setLoading(false);
  }


  return (
    <div className={styles.container}>
      {/* Conversations Sidebar */}
      {showConversations && (
        <div className={styles.sidebar}>
          <ConversationsList
            darkMode={darkMode}
            onSelectConversation={(id) => {
              setCurrentConversationId(id);
            }}
            currentConversationId={currentConversationId}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className={styles.mainArea}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
            AI
            </div>
            <div>
              <h1 className={styles.headerTitle}>
              English Chatbot
            </h1>
            <p className={styles.headerSubtitle}>
              {model ? `Model: ${model.name}` : 'Chọn model để bắt đầu'}
            </p>
          </div>
          </div>
        
          <div className={styles.headerButtons}>
            <button
              onClick={() => setShowConversations(!showConversations)}
              className={`${styles.headerButton} ${showConversations ? styles.headerButtonActive : styles.headerButtonDefault}`}
          >
            💬 Cuộc trò chuyện
          </button>
          <button
            onClick={() => setShowRecentModal(true)}
            className={`${styles.headerButton} ${styles.headerButtonDefault}`}
          >
            📚 Lịch sử
          </button>
          
          <button
            onClick={() => setUseAdvancedRAG(!useAdvancedRAG)}
            title={useAdvancedRAG 
              ? 'Advanced RAG: Multi-chunk reasoning cho câu hỏi phức tạp' 
              : 'RAG thông thường: Nhanh cho câu hỏi đơn giản'
            }
            className={`${styles.headerButton} ${useAdvancedRAG ? styles.headerButtonPrimary : styles.headerButtonDefault}`}
          >
            {useAdvancedRAG ? '🧠 Advanced RAG' : '🧠 RAG'}
          </button>
          
          <button
            onClick={() => setShowModelPopup(true)}
            className={`${styles.headerButton} ${styles.headerButtonPrimary}`}
          >
            ⚙️ Model
          </button>
          
          {history.length > 0 && (
            <button
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Xác nhận xóa',
                  message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử không?',
                  confirmText: 'Xóa',
                  cancelText: 'Hủy',
                });
                if (confirmed) {
                  setHistory([]);
                  localStorage.removeItem('chatbot_history');
                  localStorage.removeItem('chatbot_cache');
                  localStorage.removeItem('chatbot_selected_model');
                }
              }}
              className={`${styles.headerButton} ${styles.headerButtonDanger}`}
            >
              🗑️ Xóa
            </button>
          )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className={styles.messagesContainer}>
        {history.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              🤖
            </div>
            <h2 className={styles.emptyStateTitle}>
              Chào mừng đến với English Chatbot
            </h2>
            <p className={styles.emptyStateText}>
              Tôi có thể giúp bạn học tiếng Anh, trả lời câu hỏi và cung cấp thông tin. 
              Hãy bắt đầu cuộc trò chuyện bằng cách gõ câu hỏi của bạn!
            </p>
          </div>
        )}

        {history.map((item, idx) => {
          const isLastMessage = idx === history.length - 1;
          return (
            <div 
              key={idx} 
              ref={isLastMessage ? lastMessageRef : null}
              className={styles.messageContainer}
            >
              {/* User Message */}
              <div className={`${styles.messageRow} ${styles.messageRowUser}`}>
                <div className={styles.userMessage}>
                  {item.user}
                </div>
              </div>

              {/* Bot Message */}
              {item.bot && (
                <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
                  <div className={styles.botMessage}>
                    <ReactMarkdown>{item.bot}</ReactMarkdown>
                    
                    {/* Regular Chat Chunks */}
                    {item.chunks_used && item.chunks_used.length > 0 && (
                      <div className={styles.chunksSection}>
                        <div className={styles.chunksTitle}>
                          📚 Chunks used ({item.chunks_used.length}):
                        </div>
                        <div className={styles.chunksList}>
                          {item.chunks_used.map((chunk, chunkIdx) => (
                            <div key={chunkIdx} className={styles.chunkItem}>
                              <div className={styles.chunkTitle}>
                                {chunk.title}
                              </div>
                              <div className={styles.chunkInfo}>
                                Score: {chunk.score?.toFixed(3)} | ID: {chunk.id}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Regular Chat Metadata */}
                    {item.metadata && (
                      <div className={styles.metadata}>
                        🤖 {item.metadata.model_used} | ⚡ {item.metadata.processing_time}ms | 
                        📄 {item.metadata.context_length} chars | 📚 {item.metadata.total_chunks} chunks
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Message */}
        {loading && (
          <div ref={lastMessageRef} className={`${styles.messageRow} ${styles.messageRowBot}`}>
            <div className={`${styles.botMessage} ${styles.loadingMessage}`}>
              <div className={styles.loadingDots}>
                <div className={`${styles.loadingDot} ${styles.loadingDot2}`}></div>
                <div className={`${styles.loadingDot} ${styles.loadingDot3}`}></div>
                <div className={styles.loadingDot}></div>
              </div>
              <span>Đang suy nghĩ...</span>
            </div>
          </div>
        )}

        {/* Advanced RAG Info */}
        {advancedResponse && (
          <div className={styles.advancedRagInfo}>
            <div className={styles.advancedRagHeader}>
              🧠 Advanced RAG Analysis
            </div>
            
            <div className={styles.advancedRagSection}>
              <strong>📊 Processing Steps:</strong>
              <ul className={styles.advancedRagList}>
                {advancedResponse.reasoning_steps?.map((step, index) => (
                  <li key={index} className={styles.advancedRagListItem}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className={styles.advancedRagSection}>
              <strong>📚 Chunks Used:</strong> {advancedResponse.chunks_used?.length || 0}
              {advancedResponse.chunks_used?.length > 0 && (
                <div className={styles.advancedRagChunksContainer}>
                  {advancedResponse.chunks_used.map((chunk, index) => (
                    <div key={index} className={styles.advancedRagChunk}>
                      <div className={styles.advancedRagChunkHeader}>
                        <div className={styles.advancedRagChunkTitle}>
                          {chunk.title}
                        </div>
                        <div className={styles.advancedRagChunkMeta}>
                          <span>Score: {chunk.score?.toFixed(3)}</span>
                          <span>Stage: {chunk.stage}</span>
                        </div>
                      </div>
                      <div className={styles.advancedRagChunkContent}>
                        {chunk.content}
                      </div>
                      <div className={styles.advancedRagChunkFooter}>
                        <span>ID: {chunk.id}</span>
                        <span>Source: {chunk.source}</span>
                        <span>Chunk: {chunk.chunk_index}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {advancedResponse.metadata && (
              <div className={styles.advancedRagMetadata}>
                <div className={styles.advancedRagMetadataRow}>
                  <strong>🤖 Model:</strong> {advancedResponse.metadata.model_used} | 
                  <strong> ⚡ Time:</strong> {advancedResponse.metadata.processing_time}ms | 
                  <strong> 📄 Context:</strong> {advancedResponse.metadata.context_length} chars
                </div>
                <div>
                  <strong>🔗 Clusters:</strong> {advancedResponse.metadata.clusters} | 
                  <strong> 🧠 Reasoning Chains:</strong> {advancedResponse.metadata.reasoning_chains} | 
                  <strong> 📚 Total Chunks:</strong> {advancedResponse.metadata.total_chunks}
                </div>
              </div>
            )}
          </div>
        )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={styles.inputArea}>
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <ChatInputSuggest
              value={input}
              onChange={setInput}
              onSend={sendChat}
              disabled={loading}
              placeholder="Nhập câu hỏi của bạn..."
            />
          </div>
        </div>
        </div>

        {/* Recent Questions Modal */}
        {showRecentModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.recentModal}>
            <h2 className={styles.recentModalTitle}>
              📚 Lịch sử câu hỏi
            </h2>

            <button
              onClick={() => setShowRecentModal(false)}
              className={styles.recentModalClose}
            >
              ✕ Đóng
            </button>

            <div className={styles.recentModalList}>
              {questionHistory.map((item, index) => (
                <div
                  key={index}
                  className={styles.recentModalItem}
                >
                  <div className={styles.recentModalItemDate}>
                    <span className={styles.recentModalItemDateText}>
                      🗓 {new Date(item.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div className={styles.recentModalItemQuestion}>
                    <b>Bạn:</b> {item.question}
                  </div>

                  <div className={styles.recentModalItemAnswer}>
                    <b>Bot:</b>
                    <div className={styles.recentModalItemAnswerContent}>
                      <ReactMarkdown>{item.bot_reply}</ReactMarkdown>
                    </div>
                  </div>

                  <div className={styles.recentModalItemButtons}>
                    <button
                      onClick={() => {
                        setInput(item.question);
                        setShowRecentModal(false);
                      }}
                      className={styles.recentModalItemButton}
                    >
                      🔁 Gửi lại câu hỏi này
                    </button>

                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Xác nhận xóa',
                          message: 'Bạn có chắc chắn muốn xóa câu hỏi này?',
                          confirmText: 'Xóa',
                          cancelText: 'Hủy',
                        });
                        if (!confirmed) return;
                        
                        try {
                          const res = await axios.delete(
                            `${API_URL}/chat/history/${item.id}`,
                            {
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                              },
                            }
                          );
                          if (res.status === 200) {
                            setQuestionHistory(prev =>
                              prev.filter(q => q.id !== item.id)
                            );
                            showSuccess('Đã xóa câu hỏi thành công!');
                          } else {
                            showError('Xóa thất bại!');
                          }
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          console.error('Lỗi khi xóa câu hỏi:', err);
                          showError('Đã xảy ra lỗi khi xóa!');
                        }
                      }}
                      className={`${styles.recentModalItemButton} ${styles.recentModalItemButtonDanger}`}
                    >
                      🗑 Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Model Selection Modal */}
        {showModelPopup && (
        <div className={styles.modalOverlay}>
          <ModelManager
            onSelectModel={m => {
              setModel(m);
              localStorage.setItem('chatbot_selected_model', JSON.stringify(m));
              setShowModelPopup(false);
            }}
            onClose={() => setShowModelPopup(false)}
          />
        </div>
        )}
      </div>
      {/* End Main Chat Area */}
    </div>
  );
}