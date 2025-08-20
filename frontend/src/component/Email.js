import React, { useEffect, useState } from "react";
import SubscriptionList from "./SubscriptionList";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export default function EmailPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/email/gmail`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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
        console.error("Lỗi khi tải email:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-8">
      {loading ? (
        <p className="text-center text-gray-500">Đang tải dữ liệu...</p>
      ) : (
        <SubscriptionList subs={subs} />
      )}
    </div>
  );
}