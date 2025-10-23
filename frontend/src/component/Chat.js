import { useState, useEffect, useRef } from 'react';
import ChatInputSuggest from './ChatInputSuggest';
import CryptoJS from 'crypto-js';
import ReactMarkdown from 'react-markdown';
import ModelManager from './ModelManager';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Chat() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [model, setModel] = useState(null);
  const [useAdvancedRAG, setUseAdvancedRAG] = useState(false);
  const [advancedResponse, setAdvancedResponse] = useState(null);
  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);

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
          { message: input, model },
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
          { message: input, model },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      
      const data = res.data;
      setHistory([
        ...history,
        { user: input, bot: data.reply, createdAt: timestamp },
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f7f7f8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#10a37f',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            AI
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              English Chatbot
            </h1>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {model ? `Model: ${model.name}` : 'Chọn model để bắt đầu'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowRecentModal(true)}
            style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📚 Lịch sử
          </button>
          
          <button
            onClick={() => setUseAdvancedRAG(!useAdvancedRAG)}
            title={useAdvancedRAG 
              ? 'Advanced RAG: Multi-chunk reasoning cho câu hỏi phức tạp' 
              : 'RAG thông thường: Nhanh cho câu hỏi đơn giản'
            }
            style={{
              backgroundColor: useAdvancedRAG ? '#10a37f' : '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              color: useAdvancedRAG ? 'white' : '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            {useAdvancedRAG ? '🧠 Advanced RAG' : '🧠 RAG'}
          </button>
          
          <button
            onClick={() => setShowModelPopup(true)}
            style={{
              backgroundColor: '#10a37f',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⚙️ Model
          </button>
          
          {history.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử không?')) {
                  setHistory([]);
                  localStorage.removeItem('chatbot_history');
                  localStorage.removeItem('chatbot_cache');
                  localStorage.removeItem('chatbot_selected_model');
                }
              }}
              style={{
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🗑️ Xóa
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {history.length === 0 && !loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#f3f4f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              fontSize: '24px'
            }}>
              🤖
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
              Chào mừng đến với English Chatbot
            </h2>
            <p style={{ margin: 0, fontSize: '16px', maxWidth: '500px' }}>
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
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* User Message */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  backgroundColor: '#10a37f',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '18px 18px 4px 18px',
                  maxWidth: '70%',
                  fontSize: '15px',
                  lineHeight: '1.5',
                  wordWrap: 'break-word'
                }}>
                  {item.user}
                </div>
              </div>

              {/* Bot Message */}
              {item.bot && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    padding: '12px 16px',
                    borderRadius: '18px 18px 18px 4px',
                    maxWidth: '70%',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    wordWrap: 'break-word',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <ReactMarkdown>{item.bot}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Message */}
        {loading && (
          <div ref={lastMessageRef} style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              backgroundColor: '#ffffff',
              color: '#1f2937',
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              fontSize: '15px',
              lineHeight: '1.5',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                display: 'flex',
                gap: '4px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#10a37f',
                  borderRadius: '50%',
                  animation: 'pulse 1.4s ease-in-out infinite'
                }}></div>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#10a37f',
                  borderRadius: '50%',
                  animation: 'pulse 1.4s ease-in-out infinite 0.2s'
                }}></div>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#10a37f',
                  borderRadius: '50%',
                  animation: 'pulse 1.4s ease-in-out infinite 0.4s'
                }}></div>
              </div>
              <span>Đang suy nghĩ...</span>
            </div>
          </div>
        )}

        {/* Advanced RAG Info */}
        {advancedResponse && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '12px',
            padding: '16px',
            margin: '16px 24px',
            fontSize: '14px',
            color: '#333'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '12px',
              fontWeight: '600',
              color: '#0369a1'
            }}>
              🧠 Advanced RAG Analysis
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <strong>📊 Processing Steps:</strong>
              <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                {advancedResponse.reasoning_steps?.map((step, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <strong>📚 Chunks Used:</strong> {advancedResponse.chunks_used?.length || 0}
              {advancedResponse.chunks_used?.length > 0 && (
                <div style={{ 
                  marginTop: '8px', 
                  display: 'grid', 
                  gap: '4px',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}>
                  {advancedResponse.chunks_used.map((chunk, index) => (
                    <div key={index} style={{
                      background: '#e0f2fe',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      <strong>{chunk.title}</strong> 
                      <span style={{ color: '#666', marginLeft: '8px' }}>
                        (Score: {chunk.score?.toFixed(3)}, Stage: {chunk.stage})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {advancedResponse.metadata && (
              <div style={{ 
                background: '#f8fafc', 
                padding: '8px 12px', 
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                <strong>⚡ Performance:</strong> {advancedResponse.metadata.processing_time}ms | 
                <strong> Clusters:</strong> {advancedResponse.metadata.clusters} | 
                <strong> Reasoning Chains:</strong> {advancedResponse.metadata.reasoning_chains}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        padding: '16px 24px',
        boxShadow: '0 -1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            maxHeight: '80%',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#1f2937', marginBottom: 16 }}>
              📚 Lịch sử câu hỏi
            </h2>

            <button
              onClick={() => setShowRecentModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 20,
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✕ Đóng
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {questionHistory.map((item, index) => (
                <div
                  key={index}
                  style={{
                    background: '#f9fafb',
                    borderRadius: 10,
                    padding: '16px 20px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#6b7280', fontSize: '0.85em' }}>
                      🗓 {new Date(item.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#eef2ff',
                      padding: '10px 14px',
                      borderRadius: 8,
                      color: '#1e3a8a',
                      fontSize: '1em',
                      marginBottom: 10,
                    }}
                  >
                    <b>Bạn:</b> {item.question}
                  </div>

                  <div
                    style={{
                      background: '#ecfdf5',
                      padding: '10px 14px',
                      borderRadius: 8,
                      color: '#065f46',
                      fontSize: '1em',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <b>Bot:</b>
                    <div style={{ marginTop: 6 }}>
                      <ReactMarkdown>{item.bot_reply}</ReactMarkdown>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setInput(item.question);
                      setShowRecentModal(false);
                    }}
                    style={{
                      marginTop: 12,
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.95em',
                    }}
                  >
                    🔁 Gửi lại câu hỏi này
                  </button>

                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          'Bạn có chắc chắn muốn xóa câu hỏi này?'
                        )
                      )
                        return;
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
                        } else {
                          alert('Xóa thất bại!');
                        }
                      } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error('Lỗi khi xóa câu hỏi:', err);
                        alert('Đã xảy ra lỗi khi xóa!');
                      }
                    }}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.95em',
                    }}
                  >
                    🗑 Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Model Selection Modal */}
      {showModelPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
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

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% {
            opacity: 0.3;
          }
          40% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}