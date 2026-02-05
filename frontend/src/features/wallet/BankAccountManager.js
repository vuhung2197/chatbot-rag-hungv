
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTrash, FaPlus, FaUniversity, FaCheckCircle } from 'react-icons/fa';
import AddBankModal from './AddBankModal';
import '../../styles/BankAccountManager.css';

const BankAccountManager = ({ onSelect, selectedId, refreshTrigger }) => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/wallet/bank-accounts`, {
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
            await axios.delete(`${process.env.REACT_APP_API_URL}/wallet/bank-accounts/${id}`, {
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
            <div className="bank-manager-header">
                <h3>Bank Accounts</h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-add-new-bank"
                >
                    <FaPlus size={12} /> Add New
                </button>
            </div>

            {accounts.length === 0 ? (
                <div className="empty-bank-state">
                    <FaUniversity className="empty-bank-icon" />
                    <p className="empty-bank-text">No bank accounts linked yet.</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-link-first"
                    >
                        Link Your First Account
                    </button>
                </div>
            ) : (
                <div className="bank-accounts-list">
                    {accounts.map(acc => (
                        <div
                            key={acc.id}
                            className={`bank-account-item ${selectedId === acc.id ? 'selected' : ''}`}
                            onClick={() => onSelect && onSelect(acc)}
                        >
                            <div className="bank-item-left">
                                <div className="bank-icon-placeholder">
                                    <FaUniversity />
                                </div>
                                <div className="bank-info-group">
                                    <div className="bank-code-row">
                                        <span className="bank-code">{acc.bank_code}</span>
                                        <span className="bank-name-short">
                                            {acc.bank_name.split('-')[0].trim()}
                                        </span>
                                    </div>
                                    <p className="bank-account-number">
                                        •••• {acc.account_number.slice(-4)}
                                    </p>
                                    <p className="bank-holder-name">
                                        {acc.account_holder_name}
                                    </p>
                                </div>
                            </div>

                            <div className="bank-item-right">
                                {selectedId === acc.id && (
                                    <FaCheckCircle className="check-icon" />
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }}
                                    className="btn-delete-bank"
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
