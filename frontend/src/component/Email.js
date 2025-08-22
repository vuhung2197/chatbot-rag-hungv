import React, { useEffect, useState } from 'react';
import SubscriptionList from './SubscriptionList';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export default function EmailPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check if there's a token in URL (from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      // Save token to localStorage
      localStorage.setItem('token', tokenFromUrl);
      // Clean up URL by removing token parameter
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('token');
      window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
    }

    axios
      .get(`${API_URL}/email/gmail`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((res) => {
        // Handle new response format with data and tokenInfo
        if (res.data.data) {
          setSubs(res.data.data);
          console.log('🔐 Token expires in:', res.data.tokenInfo?.timeUntilExpiry, 'seconds');
        } else {
          // Fallback for old format
          setSubs(res.data);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải email:', err);
        
        // Check if it's an authentication error
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;
        
        if (status === 401 || message.includes('authenticate') || message.includes('token')) {
          setAuthError({
            type: 'TOKEN_REQUIRED',
            message: message || 'Cần xác thực Google để tải email'
          });
        } else {
          setAuthError({
            type: 'GENERAL_ERROR', 
            message: message || 'Lỗi khi tải dữ liệu email'
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-8">
      {loading ? (
        <p className="text-center text-gray-500">Đang tải dữ liệu...</p>
      ) : (
        <SubscriptionList subs={subs} authError={authError} />
      )}
    </div>
  );
}