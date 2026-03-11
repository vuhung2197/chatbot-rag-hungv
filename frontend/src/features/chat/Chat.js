import { useState, useEffect, useRef } from 'react';
import ChatInputSuggest from './ChatInputSuggest';
import CryptoJS from 'crypto-js';
import ReactMarkdown from 'react-markdown';
import ModelManager from './ModelManager';
import ConversationsList from './ConversationsList';
import axios from 'axios';
import { useConfirmContext } from '../../context/ConfirmContext';
import styles from '../../styles/components/Chat.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ─── Helper: Process SSE data event ───
function processSSEEvent(data, { setLoadingStatus, setHistory, setAdvancedResponse, setCurrentConversationId }) {
  const result = { botReply: null, metadata: null, error: null };
  if (data.type === 'status') {
    setLoadingStatus(data.content);
  } else if (data.type === 'text') {
    result.botReply = data.content;
    setHistory(prev => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, bot: data.content }];
    });
  } else if (data.type === 'done') {
    setAdvancedResponse(data);
    result.metadata = data;
    if (data.conversationId) setCurrentConversationId(data.conversationId);
  } else if (data.type === 'error') {
    result.error = 'Đã xảy ra lỗi: ' + data.message;
  }
  return result;
}

// ─── Helper: Source type badge config ───
function getSourceBadge(sourceType) {
  const configs = {
    web_search: { bg: '#dbeafe', color: '#1d4ed8', label: '🌐 Web Search' },
    kb_fallback_web: { bg: '#fef3c7', color: '#92400e', label: '📭 KB → Web Fallback' },
    rate_limited: { bg: '#fee2e2', color: '#dc2626', label: '⚠️ Rate Limited' },
    stream: { bg: '#e0e7ff', color: '#4338ca', label: '📚 Knowledge Base' },
  };
  return configs[sourceType] || { bg: '#e0e7ff', color: '#4338ca', label: sourceType };
}

// ─── Sub-component: Source Type Badge ───
function SourceTypeBadge({ sourceType }) {
  if (!sourceType) return null;
  const { bg, color, label } = getSourceBadge(sourceType);
  return (
    <div style={{ marginTop: '6px', marginBottom: '4px' }}>
      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: bg, color }}>
        {label}
      </span>
    </div>
  );
}

// ─── Sub-component: Web Sources List ───
function WebSourcesList({ sources, sourceType }) {
  if (!sources?.length) return null;
  return (
    <div className={styles.advancedRagSection}>
      <strong>🌐 Web Sources ({sourceType === 'kb_fallback_web' ? 'Fallback từ KB' : 'Tìm kiếm trực tiếp'}):</strong>
      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sources.map((source, index) => (
          <a key={index} href={source.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.08)', borderLeft: '3px solid #3b82f6', color: '#3b82f6', textDecoration: 'none', fontSize: '13px', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'}>
            <span>🔗</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.title}</span>
            <span style={{ fontSize: '11px', opacity: 0.6 }}>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-component: Message Item ───
function MessageItem({ item, isLastMessage, lastMessageRef }) {
  return (
    <div ref={isLastMessage ? lastMessageRef : null} className={styles.messageContainer}>
      <div className={`${styles.messageRow} ${styles.messageRowUser}`}>
        <div className={styles.userMessage}>{item.user}</div>
      </div>
      {item.bot && (
        <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
          <div className={styles.botMessage}>
            {item.metadata && (
              <div className={styles.metadataHeader}>
                <span><i className="fas fa-robot"></i> {item.metadata.model_used}</span>
                <span><i className="fas fa-bolt"></i> {item.metadata.processing_time}ms</span>
                {item.metadata.total_chunks > 0 && <span><i className="fas fa-book"></i> {item.metadata.total_chunks} chunks</span>}
              </div>
            )}
            <ReactMarkdown>{item.bot}</ReactMarkdown>

            {item.reasoning_steps?.length > 0 && (
              <div className={styles.messageAdvancedInfo}>
                <details className={styles.advancedDetails}>
                  <summary className={styles.advancedSummary}>🧠 Chi tiết phân tích Advanced RAG</summary>
                  <div className={styles.advancedContent}>
                    <strong>Các bước suy luận:</strong>
                    <ul className={styles.advancedStepsList}>
                      {item.reasoning_steps.map((step, idx) => <li key={idx}>{step}</li>)}
                    </ul>
                  </div>
                </details>
              </div>
            )}

            {item.chunks_used?.length > 0 && (
              <div className={styles.chunksSection}>
                <div className={styles.chunksTitle}>📚 Chunks used ({item.chunks_used.length}):</div>
                <div className={styles.chunksList}>
                  {item.chunks_used.map((chunk, idx) => (
                    <div key={idx} className={styles.chunkItem}>
                      <div className={styles.chunkTitle}>{chunk.title}</div>
                      <div className={styles.chunkInfo}>
                        Score: {chunk.score?.toFixed(3)} | Stage: {chunk.stage || 'N/A'} | ID: {chunk.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Advanced RAG Analysis ───
function AdvancedRAGAnalysis({ advancedResponse }) {
  if (!advancedResponse) return null;
  return (
    <div className={styles.advancedRagInfo}>
      <div className={styles.advancedRagHeader}>🧠 Advanced RAG Analysis</div>
      <div className={styles.advancedRagSection}>
        <strong>📊 Processing Steps:</strong>
        <ul className={styles.advancedRagList}>
          {advancedResponse.reasoning_steps?.map((step, idx) => (
            <li key={idx} className={styles.advancedRagListItem}>{step}</li>
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
                  <div className={styles.advancedRagChunkTitle}>{chunk.title}</div>
                  <div className={styles.advancedRagChunkMeta}>
                    <span>Score: {chunk.score?.toFixed(3)}</span>
                    <span>Stage: {chunk.stage}</span>
                  </div>
                </div>
                <div className={styles.advancedRagChunkContent}>{chunk.content}</div>
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

      <WebSourcesList sources={advancedResponse.web_sources} sourceType={advancedResponse.source_type} />
      <SourceTypeBadge sourceType={advancedResponse.source_type} />

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
  );
}

export default function Chat({ darkMode = false }) {
  const { confirm } = useConfirmContext();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  // New state for realtime status update
  const [loadingStatus, setLoadingStatus] = useState('Đang suy nghĩ...');
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [model, setModel] = useState(null);

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
        setAdvancedResponse(null);
        return;
      }

      // Clear previous analysis when loading new conversation
      setAdvancedResponse(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get(
          `${API_URL}/conversations/${currentConversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Convert messages từ DB format sang history format
        const messages = res.data.messages || [];
        const formattedHistory = messages.map(msg => {
          const metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
          return {
            user: msg.question,
            bot: msg.bot_reply,
            createdAt: msg.created_at,
            metadata: metadata,
            chunks_used: metadata?.chunks_used || [],
            reasoning_steps: metadata?.reasoning_steps || []
          };
        });

        // Reverse để hiển thị từ cũ đến mới
        setHistory(formattedHistory.reverse());
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

    if (cached[hash]) {
      const cachedData = cached[hash];
      // Support old cache (string) and new cache (object)
      const reply = typeof cachedData === 'string' ? cachedData : cachedData.reply;
      const metadata = typeof cachedData === 'string' ? null : cachedData.metadata;

      setHistory([
        ...history,
        { user: input, bot: reply, createdAt: timestamp, metadata },
      ]);
      setInput('');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');

    // Add temp user message to history immediatelly
    const newHistory = [...history, { user: input, bot: '', createdAt: timestamp }];
    setHistory(newHistory);
    setInput('');
    setLoading(true);
    setLoadingStatus('Đang kết nối đến server...');

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: input, model, conversationId: currentConversationId })
      });

      if (!response.ok) throw new Error(response.statusText);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botReply = '';
      let metadata = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const result = processSSEEvent(data, { setLoadingStatus, setHistory, setAdvancedResponse, setCurrentConversationId });
              if (result.botReply) botReply = result.botReply;
              if (result.metadata) metadata = result.metadata;
              if (result.error) botReply = result.error;
            } catch (e) { console.error('Error parsing SSE data', e); }
          }
        }
      }

      // Finalize state
      setLoading(false);
      setLoadingStatus('Đang suy nghĩ...'); // Reset for next time

      // Cache result logic (Similar to old code)
      if (botReply && !botReply.includes('lỗi')) {
        cached[hash] = { reply: botReply, metadata: metadata, chunks_used: metadata.chunks_used };
        localStorage.setItem('chatbot_cache', JSON.stringify(cached));
      }

    } catch (err) {
      setHistory(prev => [...prev.slice(0, -1), { user: input, bot: 'Lỗi kết nối server!', createdAt: timestamp }]);
      setLoading(false);
      console.error(err);
    }
  }


  return (
    <div className={`${styles.container} ${showConversations ? styles.sidebarOpen : ''}`}>
      {/* Conversations Sidebar */}
      <div className={styles.sidebar}>
        <ConversationsList
          darkMode={darkMode}
          onSelectConversation={(id) => {
            setCurrentConversationId(id);
          }}
          currentConversationId={currentConversationId}
          onClose={() => setShowConversations(false)}
        />
      </div>

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
                {model ? (<>Model: <span>{model.name}</span></>) : 'Chọn model để bắt đầu'}
              </p>
            </div>
          </div>

          <div className={styles.headerButtons}>
            <button
              onClick={() => setShowConversations(!showConversations)}
              className={`${styles.headerButton} ${showConversations ? styles.headerButtonActive : ''}`}
            >
              <i className="fas fa-comments"></i>
              Cuộc trò chuyện
            </button>



            <button
              onClick={() => setShowModelPopup(true)}
              className={`${styles.headerButton} ${styles.headerButtonPrimary}`}
            >
              <i className="fas fa-microchip"></i>
              Model
            </button>

            {history.length > 0 && (
              <button
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Xác nhận xóa',
                    message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử hiện tại không? (Không ảnh hưởng đến danh sách cuộc trò chuyện)',
                    confirmText: 'Xóa',
                    cancelText: 'Hủy',
                  });
                  if (confirmed) {
                    setHistory([]);
                    setAdvancedResponse(null);
                    setCurrentConversationId(null); // Reset conversation để tránh tự động load lại
                    const userId = localStorage.getItem('userId');
                    if (userId) {
                      localStorage.removeItem(`chatbot_history_${userId}`);
                    }
                    localStorage.removeItem('chatbot_history');
                    localStorage.removeItem('chatbot_cache');
                    // Giữ lại chatbot_selected_model để không mất model đã chọn
                  }
                }}
                className={`${styles.headerButton} ${styles.headerButtonDanger}`}
              >
                <i className="fas fa-trash-alt"></i>
                Xóa
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

          {history.map((item, idx) => (
            <MessageItem
              key={idx}
              item={item}
              isLastMessage={idx === history.length - 1}
              lastMessageRef={lastMessageRef}
            />
          ))}

          {/* Loading Message */}
          {loading && (
            <div ref={lastMessageRef} className={`${styles.messageRow} ${styles.messageRowBot}`}>
              <div className={`${styles.botMessage} ${styles.loadingMessage}`}>
                <div className={styles.loadingDots}>
                  <div className={`${styles.loadingDot} ${styles.loadingDot2}`}></div>
                  <div className={`${styles.loadingDot} ${styles.loadingDot3}`}></div>
                  <div className={styles.loadingDot}></div>
                </div>
                <span>{loadingStatus}</span>
              </div>
            </div>
          )}

          <AdvancedRAGAnalysis advancedResponse={advancedResponse} />

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
