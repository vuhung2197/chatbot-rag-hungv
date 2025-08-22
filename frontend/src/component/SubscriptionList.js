import React, { useState } from 'react';
// import DOMPurify from "dompurify";
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;
// Endpoint bắt đầu OAuth (điều chỉnh cho khớp backend của bạn)
const GOOGLE_OAUTH_START = `${API_URL}/auth/google`;

function sanitizeUnsubscribeLink(raw) {
  if (!raw) return null;
  const matches = raw.match(/<([^>]+)>/g);
  if (matches && matches.length > 0) {
    return matches[0].replace(/[<>]/g, '');
  }
  return raw.trim().split(',')[0];
}

export default function SubscriptionList({ subs, authError }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  // NEW: trạng thái khi cần xác thực lại Google
  const [authNeeded, setAuthNeeded] = useState(false);
  const [authMessage, setAuthMessage] = useState(
    'Phiên đăng nhập Google đã hết hạn. Vui lòng xác thực lại để tiếp tục.'
  );
  const [verifying, setVerifying] = useState(false);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  // NEW: hàm gọi lại OAuth
  const handleVerifyGoogle = () => {
    setVerifying(true);
    // Redirect sang trang OAuth; sau khi xong backend có thể redirect về lại trang hiện tại
    const redirectBack = encodeURIComponent(window.location.href);
    window.location.href = `${GOOGLE_OAUTH_START}?redirect=${redirectBack}`;
  };

  const handleUnsubscribeSelected = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/email/gmail/unsubscribe`,
        {
          emails: selected,
          userEmail: 'hung97vu@gmail.com', // TODO: Get from user context/auth
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const { message, summary } = response.data;
      alert(
        `${message}\n✅ Thành công: ${summary.success}\n❌ Thất bại: ${summary.failed}`
      );
      setSelected([]);
    } catch (err) {
      console.error('❌ Lỗi unsubscribe:', err);
      // Phân tích lỗi từ backend
      const status = err.response?.status;
      const code = err.response?.data?.code || err.code;
      const msg =
        err.response?.data?.message || 'Hủy đăng ký thất bại.';

      // Nếu token Google hết hạn → bật banner + nút xác thực
      // Bạn có thể chuẩn hóa theo code backend, ví dụ: GOOGLE_TOKEN_EXPIRED
      const tokenExpired =
        status === 401 ||
        code === 'GOOGLE_TOKEN_EXPIRED' ||
        /invalid(_|\s)?grant/i.test(msg) ||
        /token (expired|revoked)/i.test(msg);

      if (tokenExpired) {
        setAuthNeeded(true);
        setAuthMessage(
          'Phiên Google đã hết hạn hoặc bị thu hồi. Hãy xác thực lại để tiếp tục thao tác.'
        );
      }

      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // If there's an auth error, show auth interface regardless of subs
  if (authError && authError.type === 'TOKEN_REQUIRED') {
    return (
      <div style={{ padding: '16px' }}>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: '#fff',
          }}
        >
          📬 Quản lý đăng ký email
        </h2>

        {/* Auth needed banner */}
        <div
          role="alert"
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            color: '#92400E',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <strong>⚠️ Cần xác thực Google</strong>
          </div>
          <p style={{ marginBottom: '16px' }}>
            {authError.message}
          </p>
          <button
            onClick={handleVerifyGoogle}
            disabled={verifying}
            style={{
              backgroundColor: '#1d4ed8',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            {verifying ? 'Đang chuyển hướng...' : '🔐 Kết nối với Google'}
          </button>
        </div>
      </div>
    );
  }

  if (!subs || subs.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
        Không tìm thấy bản tin nào trong hộp thư của bạn.
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: '#fff',
        }}
      >
        📬 Danh sách bản tin đã đăng ký
      </h2>

      {/* NEW: Banner yêu cầu xác thực lại */}
      {authNeeded && (
        <div
          role="alert"
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            color: '#92400E',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠️ {authMessage}</span>
          <button
            onClick={handleVerifyGoogle}
            disabled={verifying}
            style={{
              backgroundColor: '#1d4ed8',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              minWidth: 160,
            }}
          >
            {verifying ? 'Đang chuyển hướng...' : '🔐 Xác thực lại Google'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          onClick={handleUnsubscribeSelected}
          disabled={loading || selected.length === 0}
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
          }}
          title={
            selected.length === 0
              ? 'Chọn ít nhất 1 bản tin'
              : 'Hủy đăng ký các bản tin đã chọn'
          }
        >
          ❌ Hủy {selected.length} bản tin đã chọn
        </button>

        {/* NEW: nút xác thực thủ công luôn hiển thị (phòng khi user muốn bấm) */}
        <button
          onClick={handleVerifyGoogle}
          disabled={verifying}
          style={{
            backgroundColor: '#065f46',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Nếu gặp lỗi hết hạn token, bấm để xác thực lại Google"
        >
          {verifying ? 'Đang chuyển hướng...' : '🔐 Xác thực lại Google'}
        </button>
      </div>

      {subs.map((item) => (
        <EmailCard
          key={item.id}
          item={item}
          isSelected={selected.includes(item.id)}
          onToggle={() => toggleSelect(item.id)}
        />
      ))}
    </div>
  );
}

function EmailCard({ item, isSelected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const link = sanitizeUnsubscribeLink(item.unsubscribe);

  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: '#fff',
        color: '#000',
        marginBottom: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        style={{ marginTop: '6px' }}
      />

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
          <strong style={{ color: '#1d4ed8' }}>Người gửi:</strong> {item.from}
        </p>

        <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
          📌 {item.subject}
        </p>

        {item.unsubscribe ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '14px',
              color: '#dc2626',
              textDecoration: 'underline',
            }}
          >
            ❌ Hủy đăng ký thủ công
          </a>
        ) : (
          <p style={{ fontSize: '14px', color: '#888' }}>🚫 Không có link hủy</p>
        )}

        {item.body && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#333' }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'none',
                border: 'none',
                color: '#1d4ed8',
                cursor: 'pointer',
                padding: 0,
                marginBottom: '8px',
              }}
            >
              {expanded ? '🔼 Thu gọn nội dung' : '🔽 Xem nội dung'}
            </button>

            {expanded && (
              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid #eee',
                  padding: '8px',
                  backgroundColor: '#fafafa',
                  borderRadius: '4px',
                }}
                // Nếu dùng DOMPurify:
                // dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.body) }}
                dangerouslySetInnerHTML={{ __html: item.body }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
