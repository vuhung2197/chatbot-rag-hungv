
import React from 'react';
import { X, CheckCircle, Copy } from 'lucide-react';

const ProvablyFairModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could show toast here
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={20} />
                        Provably Fair Verification
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-400">
                        Hệ thống đảm bảo tính công bằng tuyệt đối. Bạn có thể sử dụng các tham số dưới đây để tự kiểm tra kết quả ván cược.
                    </p>

                    {/* Server Seed */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Server Seed (Hex)</label>
                        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                            <code className="flex-1 text-xs text-green-400 break-all font-mono">
                                {data.serverSeed || 'N/A'}
                            </code>
                            <button onClick={() => copyToClipboard(data.serverSeed)} className="text-gray-500 hover:text-white p-1">
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Client Seed */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Client Seed</label>
                            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                                <code className="flex-1 text-xs text-blue-400 font-mono text-ellipsis overflow-hidden whitespace-nowrap">
                                    {data.clientSeed || 'N/A'}
                                </code>
                                <button onClick={() => copyToClipboard(data.clientSeed)} className="text-gray-500 hover:text-white p-1">
                                    <Copy size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Nonce */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Nonce</label>
                            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                                <code className="flex-1 text-xs text-yellow-400 font-mono">
                                    {data.nonce || 'N/A'}
                                </code>
                                <button onClick={() => copyToClipboard(data.nonce)} className="text-gray-500 hover:text-white p-1">
                                    <Copy size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Hash */}
                    <div className="space-y-1 opacity-75">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Server Seed Hash (SHA256)</label>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                            <code className="text-[10px] text-gray-500 break-all font-mono">
                                {data.serverSeedHash || 'N/A'}
                            </code>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 justify-center">
                            Hướng dẫn kiểm tra (Verify Guide)
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProvablyFairModal;
