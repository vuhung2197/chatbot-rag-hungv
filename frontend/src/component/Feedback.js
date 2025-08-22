import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

function Feedback() {
  const [message, setMessage] = useState('');
  const [suggested, setSuggested] = useState('');
  const [explanation, setExplanation] = useState('');
  const [noti, setNoti] = useState('');
  const [notiType, setNotiType] = useState('');
  const [loading, setLoading] = useState(false);

  const sendFeedback = async () => {
    if (!message || !suggested) {
      setNotiType('error');
      setNoti('Hãy điền đầy đủ nội dung!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, suggested_reply: suggested, explanation })
      });
      const data = await res.json();
      if (res.ok) {
        setNotiType('success');
        setNoti(data.message || 'Gửi góp ý thành công!');
        setMessage(''); setSuggested(''); setExplanation('');
      } else {
        setNotiType('error');
        setNoti(data.message || 'Gửi góp ý thất bại!');
      }
    } catch {
      setNotiType('error');
      setNoti('Lỗi mạng hoặc server!');
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 20,
      boxShadow: '0 2px 12px #ddd',
      maxWidth: 450,
      margin: '0 auto'
    }}>
      <h3 style={{ color: '#7137ea' }}>💬 Góp ý cải thiện bot</h3>
      <div>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Câu hỏi/vấn đề của bạn"
          style={{
            width: '98%', marginBottom: 8,
            padding: 10, borderRadius: 6, border: '1px solid #ccc'
          }}
        />
        <input
          value={suggested}
          onChange={e => setSuggested(e.target.value)}
          placeholder="Câu trả lời/bot nên nói gì?"
          style={{
            width: '98%', marginBottom: 8,
            padding: 10, borderRadius: 6, border: '1px solid #ccc'
          }}
        />
        <input
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          placeholder="Giải thích (nếu có)"
          style={{
            width: '98%', marginBottom: 8,
            padding: 10, borderRadius: 6, border: '1px solid #ccc'
          }}
        />
      </div>
      <button
        onClick={sendFeedback}
        disabled={!message || !suggested || loading}
        style={{
          background: '#7137ea',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          fontWeight: 600,
          cursor: (!message || !suggested || loading) ? 'not-allowed' : 'pointer',
          opacity: (!message || !suggested || loading) ? 0.6 : 1,
          marginTop: 4
        }}
      >
        {loading ? 'Đang gửi...' : 'Gửi góp ý'}
      </button>
      {noti && (
        <div style={{
          color: notiType === 'error' ? '#e84118' : '#44bd32',
          background: notiType === 'error' ? '#fdecec' : '#eafaf1',
          padding: '9px 15px',
          borderRadius: 8,
          marginTop: 12,
          fontWeight: 500
        }}>
          {noti}
        </div>
      )}
    </div>
  );
}

export default Feedback;
