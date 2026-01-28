import React from 'react';
import { X, TrendingUp, Activity, GitCommit, BarChart } from 'lucide-react';

const BridgeGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn'>
      <div className='bg-slate-800 rounded-xl border border-slate-600 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800'>
          <div className='flex items-center gap-2 text-yellow-500'>
            <TrendingUp size={24} />
            <h2 className='text-xl font-bold text-white'>
              Các Loại Cầu Tài Xỉu Phổ Biến
            </h2>
          </div>
          <button
            onClick={onClose}
            className='p-1 hover:bg-slate-700 rounded-full transition-colors text-gray-400 hover:text-white'
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className='overflow-y-auto p-6 space-y-6 text-gray-200'>
          {/* Cầu Bệt */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-red-400 font-bold text-lg'>
              <Activity size={20} />
              <h3>1. Cầu Bệt (Streak)</h3>
            </div>
            <p className='text-sm text-gray-400 italic'>
              Xuất hiện khi lịch sử trả về một dây Tài hoặc Xỉu dài liên tiếp.
            </p>
            <div className='bg-slate-900/50 p-3 rounded-lg border border-slate-700/50'>
              <div className='flex gap-1 mb-2'>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
              </div>
              <p className='text-sm'>
                <strong>Dấu hiệu:</strong> Thường xuất hiện từ ván thứ 4-5 trở
                đi.
                <br />
                <strong>Chiến thuật:</strong> "Nuôi" cầu (đánh theo) đến khi
                gãy. Không nên bẻ cầu (đánh ngược) khi chưa có dấu hiệu đảo.
              </p>
            </div>
          </div>

          {/* Cầu Đảo 1-1 */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-blue-400 font-bold text-lg'>
              <GitCommit size={20} />
              <h3>2. Cầu Đảo 1-1 (Alternating)</h3>
            </div>
            <p className='text-sm text-gray-400 italic'>
              Kết quả Tài - Xỉu xuất hiện xen kẽ nhau đều đặn.
            </p>
            <div className='bg-slate-900/50 p-3 rounded-lg border border-slate-700/50'>
              <div className='flex gap-1 mb-2'>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white'>
                  X
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white'>
                  X
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
              </div>
              <p className='text-sm'>
                <strong>Dấu hiệu:</strong> Xuất hiện sau khi Hết cầu bệt hoặc
                giai đoạn thị trường ổn định.
                <br />
                <strong>Chiến thuật:</strong> Đánh đều tay theo quy luật
                T-X-T-X.
              </p>
            </div>
          </div>

          {/* Cầu 1-2-3 */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-green-400 font-bold text-lg'>
              <BarChart size={20} />
              <h3>3. Cầu 1-2-3 (hoặc 3-2-1)</h3>
            </div>
            <p className='text-sm text-gray-400 italic'>
              Quy luật số lượng kết quả tăng/giảm dần.
            </p>
            <div className='bg-slate-900/50 p-3 rounded-lg border border-slate-700/50'>
              <div className='flex gap-1 mb-2'>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white'>
                  X
                </span>
                <span className='w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white'>
                  X
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
                <span className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs text-white'>
                  T
                </span>
              </div>
              <p className='text-sm'>
                <strong>Ví dụ:</strong> 1 Tài - 2 Xỉu - 3 Tài.
                <br />
                <strong>Chiến thuật:</strong> Cần quan sát kỹ 3-4 ván đầu để
                nhận diện khuôn mẫu trước khi xuống tiền mạnh.
              </p>
            </div>
          </div>

          {/* Lời khuyên */}
          <div className='bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg mt-4'>
            <h4 className='font-bold text-yellow-500 mb-1'>
              💡 Lời khuyên cho người mới
            </h4>
            <ul className='list-disc list-inside text-sm space-y-1 text-gray-300'>
              <li>Không nên "gấp thếp" (đánh x2) liên tục nếu đang dây đen.</li>
              <li>
                Tất cả chỉ là xác suất, không có cầu nào là chính xác 100%.
              </li>
              <li>Biết điểm dừng khi đã đạt lợi nhuận mục tiêu.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-slate-700 bg-slate-800 flex justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors'
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default BridgeGuideModal;
