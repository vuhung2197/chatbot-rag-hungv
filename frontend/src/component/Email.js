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
        setSubs(res.data); // ✅ axios trả về JSON đã parse ở res.data
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