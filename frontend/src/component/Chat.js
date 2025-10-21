import { useState, useEffect, useRef } from 'react';
import ChatInputSuggest from './ChatInputSuggest';
import ReactMarkdown from 'react-markdown';
import ModelManager from './ModelManager';
import axios from 'axios';
import '../styles/Chat.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Chat() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [model, setModel] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, loading]);

  // Render lần đầu tiên khi component mount
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const saved = localStorage.getItem(`chatbot_history_${userId}`);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        // console.error('Lỗi khi parse history:', e);
      }
    }

    const savedModel = localStorage.getItem('chatbot_selected_model');
    if (savedModel) {
      try {
        setModel(JSON.parse(savedModel));
      } catch (e) {
        // console.error('Lỗi khi parse model đã lưu:', e);
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
        const response = await axios.get(`${API_URL}/api/chat/history`);
        if (response.data && response.data.length > 0) {
          setQuestionHistory(response.data);
        }
      } catch (error) {
        // console.error('Lỗi khi tải lịch sử:', error);
      }
    }
    fetchHistory();
  }, []);

  const sendChat = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Thêm tin nhắn người dùng vào lịch sử
    const newUserMessage = {
      user: userMessage,
      bot: '',
      createdAt: new Date().toISOString(),
    };

    setHistory(prev => [...prev, newUserMessage]);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: userMessage,
        model: model?.name || 'gpt-3.5-turbo',
      });

      const botReply = response.data.reply;

      // Cập nhật tin nhắn bot vào lịch sử
      setHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1].bot = botReply;
        return updated;
      });

      // Lưu vào database
      try {
        await axios.post(`${API_URL}/api/chat/save`, {
          question: userMessage,
          reply: botReply,
          isAnswered: true,
        });
      } catch (dbError) {
        // console.error('Lỗi khi lưu vào database:', dbError);
      }

    } catch (error) {
      // console.error('Lỗi khi gửi tin nhắn:', error);
      const errorMessage = 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.';
      
      setHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1].bot = errorMessage;
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="chat-logo">
            AI
          </div>
          <div>
            <h1 className="chat-title">
              English Chatbot
            </h1>
            <p className="chat-subtitle">
              {model ? `Model: ${model.name}` : 'Chọn model để bắt đầu'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowRecentModal(true)}
            className="chat-button"
          >
            📚 Lịch sử
          </button>
          
          <button
            onClick={() => setShowModelPopup(true)}
            className="chat-button chat-button-primary"
          >
            ⚙️ Model
          </button>
          
          {history.length > 0 && (
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem('chatbot_history');
                localStorage.removeItem('chatbot_cache');
                localStorage.removeItem('chatbot_selected_model');
              }}
              className="chat-button chat-button-danger"
            >
              🗑️ Xóa
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="chat-messages">
        {history.length === 0 && !loading && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">
              🤖
            </div>
            <h2 className="chat-empty-title">
              Chào mừng đến với English Chatbot
            </h2>
            <p className="chat-empty-description">
              Tôi có thể giúp bạn học tiếng Anh, trả lời câu hỏi và cung cấp thông tin. 
              Hãy bắt đầu cuộc trò chuyện bằng cách gõ câu hỏi của bạn!
            </p>
          </div>
        )}

        {history.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* User Message */}
            <div className="message-user">
              <div className="message-bubble-user">
                {item.user}
              </div>
            </div>

            {/* Bot Message */}
            {item.bot && (
              <div className="message-bot">
                <div className="message-bubble-bot">
                  <ReactMarkdown>{item.bot}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Message */}
        {loading && (
          <div className="message-loading">
            <div className="message-loading-bubble">
              <div className="loading-dots">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
              <span>Đang suy nghĩ...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <ChatInputSuggest
              value={input}
              onChange={setInput}
              onSend={sendChat}
              disabled={loading}
              onKeyPress={handleKeyPress}
              placeholder="Nhập câu hỏi của bạn..."
            />
          </div>
        </div>
      </div>

      {/* Recent Questions Modal */}
      {showRecentModal && (
        <div className="chat-modal">
          <div className="chat-modal-content">
            <h2 className="chat-modal-header">
              📚 Lịch sử câu hỏi
            </h2>

            <button
              onClick={() => setShowRecentModal(false)}
              className="chat-modal-close"
            >
              ✕ Đóng
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {questionHistory.map((item, index) => (
                <div key={index} className="chat-history-item">
                  <div className="chat-history-date">
                    🗓 {new Date(item.created_at).toLocaleString('vi-VN')}
                  </div>

                  <div className="chat-history-question">
                    <b>Bạn:</b> {item.question}
                  </div>

                  <div className="chat-history-answer">
                    <b>Bot:</b>
                    <div style={{ marginTop: 6 }}>
                      <ReactMarkdown>{item.bot_reply}</ReactMarkdown>
                    </div>
                  </div>

                  <div className="chat-history-actions">
                    <button
                      onClick={() => {
                        setInput(item.question);
                        setShowRecentModal(false);
                      }}
                      className="chat-history-button"
                    >
                      🔁 Gửi lại câu hỏi này
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
        <div className="chat-modal">
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
  );
}