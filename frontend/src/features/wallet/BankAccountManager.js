
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTrash, FaPlus, FaUniversity, FaCheckCircle } from 'react-icons/fa';
import AddBankModal from './AddBankModal';

const BankAccountManager = ({ onSelect, selectedId, refreshTrigger }) => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/wallet/bank-accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(response.data.bank_accounts);
        } catch (error) {
            console.error('Error fetching bank accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [refreshTrigger]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this bank account?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${process.env.REACT_APP_API_URL}/api/wallet/bank-accounts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAccounts();
        } catch (error) {
            alert('Failed to delete account');
        }
    };

    if (loading && accounts.length === 0) return <div className="text-center py-4">Loading bank accounts...</div>;

    return (
        <div className="bank-account-manager">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-800">Bank Accounts</h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                >
                    <FaPlus size={12} /> Add New
                </button>
            </div>

            {accounts.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <FaUniversity className="text-gray-300 text-4xl mx-auto mb-2" />
                    <p className="text-gray-500 mb-3">No bank accounts linked yet.</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                    >
                        Link Your First Account
                    </button>
                </div>
            ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {accounts.map(acc => (
                        <div
                            key={acc.id}
                            className={`relative p-3 border rounded-lg flex justify-between items-center cursor-pointer transition-all ${selectedId === acc.id
                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                }`}
                            onClick={() => onSelect && onSelect(acc)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 text-blue-600 shrink-0 shadow-sm">
                                    <FaUniversity />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-800">{acc.bank_code}</p>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                            {acc.bank_name.split('-')[0].trim()}
                                        </span>
                                    </div>
                                    <p className="text-sm font-mono text-gray-600 tracking-wide mt-0.5">
                                        •••• {acc.account_number.slice(-4)}
                                    </p>
                                    <p className="text-xs text-gray-500 uppercase mt-0.5 truncate max-w-[180px]">
                                        {acc.account_holder_name}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {selectedId === acc.id && (
                                    <FaCheckCircle className="text-blue-500 text-xl" />
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                    title="Remove account"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <AddBankModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => { setShowAddModal(false); fetchAccounts(); }}
                />
            )}
        </div>
    );
};

export default BankAccountManager;
