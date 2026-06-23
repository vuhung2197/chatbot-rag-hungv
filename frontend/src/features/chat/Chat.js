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
function processSSEEvent(data, { setLoadingStatus, setHistory, setAdvancedResponse, setCurrentConversationId, onNewConversation }) {
  const result = { botReply: null, metadata: null, error: null };
  if (data.type === 'status') {
    setLoadingStatus(data.content);
  } else if (data.type === 'token') {
    // Stream: nối từng đoạn vào câu trả lời của bot đang hiển thị
    setHistory(prev => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, bot: (last?.bot || '') + data.content }];
    });
  } else if (data.type === 'text') {
    // Bản đầy đủ (đã format) — chốt lại nội dung cuối cùng
    result.botReply = data.content;
    setHistory(prev => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, bot: data.content }];
    });
  } else if (data.type === 'done') {
    setAdvancedResponse(data);
    result.metadata = data;
    if (data.conversationId) {
      setCurrentConversationId(prev => {
        const isNew = !prev;
        if (isNew && onNewConversation) onNewConversation();
        return data.conversationId;
      });
    }
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
// Format thời lượng xử lý; trả null nếu không hợp lệ (vd lỡ lưu timestamp epoch cũ).
function fmtDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0 || n > 600000) return null; // >10 phút coi là rác (epoch)
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`;
}

const MODE_BADGE = {
  stream: { label: '⚡ Streaming', color: '#10a37f' },
  sync: { label: '📦 Đồng bộ', color: '#6366f1' },
  async: { label: '🧵 Async', color: '#d97706' },
};

function MessageItem({ item, isLastMessage, lastMessageRef }) {
  const dur = fmtDuration(item.metadata?.processing_time);
  const modeBadge = item.mode && MODE_BADGE[item.mode];
  return (
    <div ref={isLastMessage ? lastMessageRef : null} className={styles.messageContainer}>
      <div className={`${styles.messageRow} ${styles.messageRowUser}`}>
        <div className={styles.userMessage}>{item.user}</div>
      </div>
      {item.bot && (
        <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
          <div className={styles.botMessage}>
            {(item.metadata || modeBadge) && (
              <div className={styles.metadataHeader}>
                {modeBadge && (
                  <span style={{ color: modeBadge.color, fontWeight: 600 }}>{modeBadge.label}</span>
                )}
                {item.metadata?.model && <span><i className="fas fa-robot"></i> {item.metadata.model}</span>}
                {dur && <span><i className="fas fa-bolt"></i> {dur}</span>}
                {item.metadata?.total_chunks > 0 && <span><i className="fas fa-book"></i> {item.metadata.total_chunks} chunks</span>}
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
  const [utilityModel, setUtilityModel] = useState(null); // model phụ (nhanh) cho intent/rewrite
  const [webOnly, setWebOnly] = useState(false); // chế độ Web Only: đi thẳng web search, bỏ qua intent + RAG
  const [mcpServer, setMcpServer] = useState(''); // '' = Tự động; tên server -> ép Agentic (dùng tool MCP)
  const [mcpServers, setMcpServers] = useState([]); // danh sách MCP server khả dụng (cho dropdown)
  const [chatMode, setChatMode] = useState('stream'); // 'stream' | 'sync' | 'async'
  const [showGuide, setShowGuide] = useState(false);

  const [advancedResponse, setAdvancedResponse] = useState(null);
  const [showConversations, setShowConversations] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const conversationsListRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);
  const sidebarRef = useRef(null);
  const conversationsBtnRef = useRef(null);

  // Đóng sidebar khi click ra ngoài
  useEffect(() => {
    if (!showConversations) return;
    function handleClickOutside(e) {
      if (
        sidebarRef.current && !sidebarRef.current.contains(e.target) &&
        conversationsBtnRef.current && !conversationsBtnRef.current.contains(e.target)
      ) {
        setShowConversations(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConversations]);

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

    const savedUtility = localStorage.getItem('chatbot_utility_model');
    if (savedUtility) {
      try {
        setUtilityModel(JSON.parse(savedUtility));
      } catch (e) {
        console.error('Lỗi khi parse model phụ:', e);
      }
    }

    const savedWebOnly = localStorage.getItem('chatbot_web_only');
    if (savedWebOnly !== null) setWebOnly(savedWebOnly === 'true');

    const savedMode = localStorage.getItem('chatbot_chat_mode');
    if (savedMode && ['stream', 'sync', 'async'].includes(savedMode)) setChatMode(savedMode);
  }, []);

  // Render lại khi history thay đổi
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    localStorage.setItem(`chatbot_history_${userId}`, JSON.stringify(history));
  }, [history]);

  // Lấy danh sách MCP server khả dụng (Agentic RAG) cho dropdown. Lỗi/rỗng -> chỉ 'Tự động'.
  useEffect(() => {
    fetch(`${API_URL}/chat/tools`)
      .then(r => r.ok ? r.json() : { servers: [] })
      .then(d => setMcpServers(Array.isArray(d.servers) ? d.servers : []))
      .catch(() => setMcpServers([]));
  }, []);

  // Tool-calling chỉ chạy với model hỗ trợ function-calling (OpenAI gpt-*). Model mặc
  // định (null) = gpt-4o-mini phía ai-service -> coi như hỗ trợ.
  const toolCapable = !model || (/openai\.com/i.test(model?.url || '') && /gpt-/i.test(model?.name || ''));

  // Model đổi sang loại không hỗ trợ -> bỏ chọn công cụ (không gửi forceAgent).
  useEffect(() => {
    if (!toolCapable && mcpServer) setMcpServer('');
  }, [toolCapable]); // eslint-disable-line react-hooks/exhaustive-deps

  const hashQuestion = text => {
    return CryptoJS.SHA256(text.trim().toLowerCase()).toString();
  };

  // Reply cache: TTL + loại trừ câu thời gian thực (giá/thời tiết/tin tức...) khỏi cache.
  const REPLY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút
  const isTimeSensitive = text => {
    const t = (text || '').toLowerCase();
    return /\b(hôm nay|hôm qua|hiện tại|bây giờ|mới nhất|gần đây|tin tức|giá|tỷ giá|thời tiết|dự báo|kết quả|năm nay|tháng này|tuần này|today|now|latest|current|news|price|weather|stock)\b/.test(t);
  };

  async function sendChat() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setAdvancedResponse(null);
    const timestamp = new Date().toISOString();
    const hash = hashQuestion(input);
    const cached = JSON.parse(localStorage.getItem('chatbot_cache') || '{}');

    // Chỉ dùng cache khi: KHÔNG ở chế độ web only, câu hỏi KHÔNG mang tính thời gian thực,
    // entry còn hạn (TTL). Câu thời gian thực luôn hỏi mới để tránh trả dữ liệu cũ.
    const cacheEntry = cached[hash];
    const canUseCache = cacheEntry && !webOnly && !isTimeSensitive(input)
      && typeof cacheEntry === 'object'
      && cacheEntry.ts && (Date.now() - cacheEntry.ts < REPLY_CACHE_TTL_MS);

    if (canUseCache) {
      setHistory([
        ...history,
        { user: input, bot: cacheEntry.reply, createdAt: timestamp, metadata: cacheEntry.metadata },
      ]);
      setInput('');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');

    // Add temp user message to history immediatelly (kèm chế độ chat để hiện badge)
    const newHistory = [...history, { user: input, bot: '', createdAt: timestamp, mode: chatMode }];
    setHistory(newHistory);
    setInput('');
    setLoading(true);
    setLoadingStatus('Đang kết nối đến server...');

    const body = { message: input, model, utilityModel, webOnly, conversationId: currentConversationId, forceAgent: !!mcpServer, mcpServer: mcpServer || null };
    const sseHandlers = {
      setLoadingStatus, setHistory, setAdvancedResponse, setCurrentConversationId,
      onNewConversation: () => conversationsListRef.current?.fetchConversations()
    };

    try {
      let botReply = '';
      let metadata = {};

      if (chatMode === 'sync') {
        // ── ĐỒNG BỘ: POST /chat → JSON 1 lần ──
        const res = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        botReply = data.reply || '';
        metadata = data;
        setHistory(prev => [...prev.slice(0, -1), { ...prev[prev.length - 1], bot: botReply }]);
        setAdvancedResponse(data);
        if (data.conversationId) setCurrentConversationId(data.conversationId);

      } else if (chatMode === 'async') {
        // ── ASYNC + STREAM (hybrid): mở WS TRƯỚC → POST /chat/async {stream} → subscribe ──
        const ws = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/ws`);
        await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

        const res = await fetch(`${API_URL}/chat/async`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ...body, stream: true })
        });
        const { requestId } = await res.json();
        ws.send(JSON.stringify({ type: 'subscribe', requestId }));

        await new Promise((resolve) => {
          const timer = setTimeout(() => { try { ws.close(); } catch (_) {} resolve(); }, 120000);
          ws.onmessage = (ev) => {
            try {
              const data = JSON.parse(ev.data);
              const r = processSSEEvent(data, sseHandlers);
              if (r.botReply) botReply = r.botReply;
              if (r.metadata) metadata = r.metadata;
              if (r.error) botReply = r.error;
              if (data.type === 'done' || data.type === 'error') { clearTimeout(timer); ws.close(); resolve(); }
            } catch (e) { console.error('WS parse error', e); }
          };
        });

      } else {
        // ── STREAMING (SSE): POST /chat/stream → đọc token dần ──
        const response = await fetch(`${API_URL}/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(response.statusText);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const r = processSSEEvent(data, sseHandlers);
                if (r.botReply) botReply = r.botReply;
                if (r.metadata) metadata = r.metadata;
                if (r.error) botReply = r.error;
              } catch (e) { console.error('Error parsing SSE data', e); }
            }
          }
        }
      }

      setLoading(false);
      setLoadingStatus('Đang suy nghĩ...');

      // Chuẩn hoá metadata: processing_time/model/total_chunks có thể nằm top-level (stream/async)
      // hoặc trong _meta (sync). Gộp về 1 shape để hiển thị thống nhất.
      const m = metadata || {};
      const normMeta = {
        ...m,
        processing_time: m.processing_time ?? m._meta?.processing_time,
        model: m.model ?? m._meta?.model ?? model?.name,
        total_chunks: m.total_chunks ?? m._meta?.total_chunks ?? (m.chunks_used?.length ?? 0),
      };

      // Gắn metadata + chi tiết vào tin nhắn bot vừa rồi (để hiện header/mode/chi tiết nhất quán)
      setHistory(prev => {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, metadata: normMeta, reasoning_steps: m.reasoning_steps, chunks_used: m.chunks_used }];
      });

      // Cache kết quả — KHÔNG cache nếu: web only, câu thời gian thực, hoặc nguồn web (cũ nhanh).
      const webBased = m.source_type === 'web_search' || m.source_type === 'kb_fallback_web';
      const cacheable = botReply && !botReply.includes('lỗi') && !webOnly && !isTimeSensitive(input) && !webBased;
      if (cacheable) {
        cached[hash] = { reply: botReply, metadata: normMeta, chunks_used: m.chunks_used, ts: Date.now() };
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
      <div className={styles.sidebar} ref={sidebarRef}>
        <ConversationsList
          ref={conversationsListRef}
          darkMode={darkMode}
          onSelectConversation={(id) => {
            setCurrentConversationId(id);
            if (!id) {
              setHistory([]);
              setAdvancedResponse(null);
              setShowConversations(false);
            }
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
              onClick={() => setShowGuide(!showGuide)}
              className={styles.headerButton}
            >
              <i className="fas fa-question-circle"></i>
              Hướng dẫn
            </button>

            <button
              ref={conversationsBtnRef}
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

        {/* Guide Section */}
        {showGuide && (
          <div style={{ padding: '16px', margin: '16px', borderRadius: '8px', background: darkMode ? '#374151' : '#EFF6FF', border: '1px solid #3B82F6' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '12px' }}>📚 Bạn có thể hỏi chatbot:</h4>
            <div style={{ fontSize: '14px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>🎯 Tiến độ học tập:</strong>
                <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                  <li>"Tôi đã học bao nhiêu từ vựng?"</li>
                  <li>"Điểm listening của tôi thế nào?"</li>
                </ul>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>🌐 Thông tin thời gian thực:</strong>
                <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                  <li>"Thời tiết Hà Nội hôm nay"</li>
                </ul>
              </div>
              <div>
                <strong>📖 Kiến thức:</strong>
                <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                  <li>"RAG là gì?"</li>
                </ul>
              </div>
            </div>
          </div>
        )}

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
            {/* Thanh công cụ phía trên ô nhập — xếp DỌC (mỗi điều khiển 1 hàng) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <button
                type="button"
                onClick={() => {
                  const next = !webOnly;
                  setWebOnly(next);
                  localStorage.setItem('chatbot_web_only', String(next));
                }}
                title={webOnly
                  ? 'Tìm web: BẬT — tìm thẳng trên internet, bỏ qua phân loại ý định & tra cứu nội bộ (nhanh hơn)'
                  : 'Tìm web: TẮT — chế độ tự động (phân loại ý định + tra cứu nội bộ + web khi cần)'}
                aria-pressed={webOnly}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: webOnly ? '1px solid #10a37f' : '1px solid #d1d5db',
                  background: webOnly ? '#10a37f' : 'transparent',
                  color: webOnly ? '#fff' : '#6b7280',
                }}
              >
                <i className="fas fa-globe"></i>
                Tìm web
              </button>

              {/* Agentic RAG: chọn công cụ (MCP server). 'Tự động' = intent thường. Ẩn nếu chưa cấu hình server. */}
              {mcpServers.length > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <select
                    value={mcpServer}
                    onChange={(e) => setMcpServer(e.target.value)}
                    disabled={!toolCapable}
                    title={toolCapable
                      ? "Công cụ (Agentic RAG): chọn 1 MCP server để bot dùng tool tra cứu/đọc URL. 'Tự động' = phân loại ý định như thường."
                      : 'Model hiện tại không hỗ trợ tool-calling. Chọn model OpenAI (gpt-4o-mini) qua nút Model để dùng công cụ.'}
                    style={{
                      padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                      border: mcpServer ? '1px solid #10a37f' : '1px solid #d1d5db',
                      background: !toolCapable ? '#f3f4f6' : (mcpServer ? '#10a37f' : 'transparent'),
                      color: !toolCapable ? '#9ca3af' : (mcpServer ? '#fff' : '#6b7280'),
                      cursor: toolCapable ? 'pointer' : 'not-allowed',
                      opacity: toolCapable ? 1 : 0.7,
                    }}
                  >
                    <option value="">🛠️ Công cụ: Tự động</option>
                    {mcpServers.map((s) => (
                      <option key={s} value={s}>🛠️ {s}</option>
                    ))}
                  </select>
                  {!toolCapable && (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                      Cần model OpenAI (gpt-*) để dùng công cụ
                    </span>
                  )}
                </div>
              )}

              {/* Chọn chế độ chat: stream (SSE) | sync (JSON) | async (Kafka+WS) */}
              <select
                value={chatMode}
                onChange={(e) => { setChatMode(e.target.value); localStorage.setItem('chatbot_chat_mode', e.target.value); }}
                title="Chế độ chat: Streaming (token chạy dần) | Đồng bộ (chờ trả 1 lần) | Async (qua hàng đợi, token realtime qua WebSocket)"
                style={{
                  padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                  border: '1px solid #d1d5db', background: 'transparent', color: '#6b7280', cursor: 'pointer',
                }}
              >
                <option value="stream">⚡ Streaming (SSE)</option>
                <option value="sync">📦 Đồng bộ (JSON)</option>
                <option value="async">🧵 Async (Kafka + WS)</option>
              </select>
            </div>
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
                if (m) localStorage.setItem('chatbot_selected_model', JSON.stringify(m));
                else localStorage.removeItem('chatbot_selected_model');
              }}
              utilityModel={utilityModel}
              onSelectUtilityModel={m => {
                setUtilityModel(m);
                if (m) localStorage.setItem('chatbot_utility_model', JSON.stringify(m));
                else localStorage.removeItem('chatbot_utility_model');
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
