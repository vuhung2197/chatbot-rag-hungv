
import React, { useState } from 'react';
import axios from 'axios';

const AddBankModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        bank_code: '',
        bank_name: '',
        account_number: '',
        account_holder_name: '',
        branch_name: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const banks = [
        { code: 'VCB', name: 'Vietcombank - Ngoại thương' },
        { code: 'TCB', name: 'Techcombank - Kỹ thương' },
        { code: 'MB', name: 'MB Bank - Quân đội' },
        { code: 'ACB', name: 'ACB - Á Châu' },
        { code: 'VPB', name: 'VPBank - Thịnh Vượng' },
        { code: 'BIDV', name: 'BIDV - Đầu tư và Phát triển' },
        { code: 'CTG', name: 'VietinBank - Công thương' },
        { code: 'TPB', name: 'TPBank - Tiên Phong' },
        { code: 'STB', name: 'Sacombank - Sài Gòn Thương Tín' },
        { code: 'VIB', name: 'VIB - Quốc tế' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.REACT_APP_API_URL}/api/wallet/bank-accounts`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add bank account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                <h2 className="text-xl font-bold mb-4">Link Bank Account</h2>

                {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Select Bank</label>
                        <select
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={formData.bank_code}
                            onChange={(e) => {
                                const bank = banks.find(b => b.code === e.target.value);
                                setFormData({ ...formData, bank_code: e.target.value, bank_name: bank?.name || '' });
                            }}
                            required
                        >
                            <option value="">-- Choose a Bank --</option>
                            {banks.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Account Number</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g. 1903..."
                            value={formData.account_number}
                            onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Account Holder Name (Unsigned)</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 p-2 rounded uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="NGUYEN VAN A"
                            value={formData.account_holder_name}
                            onChange={e => setFormData({ ...formData, account_holder_name: e.target.value.toUpperCase() })}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Full name as registered with the bank (uppercase, no accents)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Branch (Optional)</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g. Hanoi Branch"
                            value={formData.branch_name}
                            onChange={e => setFormData({ ...formData, branch_name: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {loading ? 'Processing...' : 'Link Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddBankModal;
