import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function ExportImport() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/user/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `english-learning-data-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage('✅ Export thành công!');
    } catch (error) {
      setMessage('❌ Export thất bại: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/user/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage('✅ Import thành công!');
    } catch (error) {
      setMessage('❌ Import thất bại: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Export/Import Dữ Liệu Học Tập</h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        {/* Export Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">📥 Export Dữ Liệu</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Tải xuống toàn bộ dữ liệu học tiếng Anh của bạn (từ vựng, điểm số, tiến độ)
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Đang export...' : 'Export Dữ Liệu'}
          </button>
        </div>

        {/* Import Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">📤 Import Dữ Liệu</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Khôi phục dữ liệu từ file JSON đã export trước đó
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={loading}
            className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportImport;
