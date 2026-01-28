
import React, { useState } from 'react';
import axios from 'axios';

import '../../styles/AddBankModal.css';

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
            await axios.post(`${process.env.REACT_APP_API_URL}/wallet/bank-accounts`, formData, {
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
        <div className="add-bank-modal-overlay" onClick={onClose}>
            <div className="add-bank-modal" onClick={e => e.stopPropagation()}>
                <div className="add-bank-header">
                    <h2>Link Bank Account</h2>
                </div>

                <div className="add-bank-body">
                    {error && <div className="add-bank-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Select Bank</label>
                            <select
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

                        <div className="form-group">
                            <label>Account Number</label>
                            <input
                                type="text"
                                placeholder="e.g. 1903..."
                                value={formData.account_number}
                                onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Account Holder Name (Unsigned)</label>
                            <input
                                type="text"
                                placeholder="NGUYEN VAN A"
                                value={formData.account_holder_name}
                                onChange={e => setFormData({ ...formData, account_holder_name: e.target.value.toUpperCase() })}
                                required
                            />
                            <p className="form-hint">Full name as registered with the bank (uppercase, no accents)</p>
                        </div>

                        <div className="form-group">
                            <label>Branch (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. Hanoi Branch"
                                value={formData.branch_name}
                                onChange={e => setFormData({ ...formData, branch_name: e.target.value })}
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-submit"
                            >
                                {loading ? 'Processing...' : 'Link Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddBankModal;
