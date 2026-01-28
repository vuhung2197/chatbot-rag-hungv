
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BankAccountManager from './BankAccountManager';
import { FaMoneyBillWave, FaArrowRight, FaExclamationCircle } from 'react-icons/fa';

import '../../styles/WithdrawModal.css';

const WithdrawModal = ({ isOpen, onClose, balance, currency, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Select Bank, 2: Enter Amount, 3: Confirm
    const [selectedBank, setSelectedBank] = useState(null);
    const [amount, setAmount] = useState('');
    const [feeData, setFeeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedBank(null);
            setAmount('');
            setFeeData(null);
            setError('');
        }
    }, [isOpen]);

    const handleCalculateFee = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (parseFloat(amount) > parseFloat(balance)) {
            setError('Insufficient balance');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/wallet/withdrawal/calculate-fee`,
                { amount },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setFeeData(response.data);
            setStep(3); // Go to confirm step
        } catch (err) {
            setError(err.response?.data?.message || 'Error calculating fee');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${process.env.REACT_APP_API_URL}/wallet/withdraw`,
                {
                    bank_account_id: selectedBank.id,
                    amount: parseFloat(amount)
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Withdrawal failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="withdraw-modal-overlay" onClick={onClose}>
            <div className="withdraw-modal" onClick={e => e.stopPropagation()}>
                <div className="withdraw-modal-header">
                    <h2>
                        <FaMoneyBillWave /> Withdraw Funds
                    </h2>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="withdraw-modal-body">
                    {error && (
                        <div className="withdraw-error">
                            <FaExclamationCircle />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* STEP 1: Select Bank Account */}
                    {step === 1 && (
                        <div className="step-container">
                            <p className="bank-selection-header">Select a bank account to receive your funds:</p>
                            <div className="bank-list-container">
                                <BankAccountManager
                                    onSelect={(acc) => setSelectedBank(acc)}
                                    selectedId={selectedBank?.id}
                                />
                            </div>

                            <div className="step-actions">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!selectedBank}
                                    className="btn-next"
                                >
                                    Next Step <FaArrowRight />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Enter Amount */}
                    {step === 2 && (
                        <div className="step-container">
                            <div className="selected-bank-card">
                                <div className="selected-bank-header">
                                    <span>Selected Account</span>
                                    <button onClick={() => setStep(1)}>Change</button>
                                </div>
                                <div className="selected-bank-info">
                                    <span className="bank-code-tag">{selectedBank.bank_code}</span>
                                    {selectedBank.bank_name}
                                </div>
                                <div className="selected-account-number">
                                    {selectedBank.account_number} • {selectedBank.account_holder_name}
                                </div>
                            </div>

                            <div className="withdraw-amount-group">
                                <label>Amount to Withdraw ({currency})</label>
                                <div className="amount-input-wrapper">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        autoFocus
                                    />
                                    <button
                                        className="btn-max"
                                        onClick={() => setAmount(balance)}
                                    >
                                        MAX
                                    </button>
                                </div>
                                <div className="available-balance-hint">
                                    Available Balance: <strong>{balance} {currency}</strong>
                                </div>
                            </div>

                            <div className="step-actions" style={{ justifyContent: 'space-between' }}>
                                <button className="btn-back" onClick={() => setStep(1)}>
                                    Back
                                </button>
                                <button
                                    onClick={handleCalculateFee}
                                    disabled={!amount || parseFloat(amount) <= 0 || loading}
                                    className="btn-next"
                                >
                                    {loading ? 'Calculating...' : 'Review Withdrawal'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Confirm */}
                    {step === 3 && feeData && (
                        <div className="step-container">
                            <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#111827' }}>Confirm Withdrawal</h3>

                            <div className="confirm-summary">
                                <div className="summary-row">
                                    <span>Withdrawal Amount</span>
                                    <span className="value">{feeData.amount} {currency}</span>
                                </div>
                                <div className="summary-row fee">
                                    <span>Transaction Fee</span>
                                    <span className="value">- {feeData.fee} {currency}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>You Receive</span>
                                    <span className="value">{feeData.net_amount} {currency}</span>
                                </div>
                            </div>

                            <div className="processing-time-alert">
                                Funds will be transferred to your <b>{selectedBank.bank_code}</b> account ending in <b>{selectedBank.account_number.slice(-4)}</b> within 1-3 business days.
                            </div>

                            <div className="step-actions" style={{ justifyContent: 'space-between' }}>
                                <button className="btn-back" onClick={() => setStep(2)}>
                                    Back
                                </button>
                                <button
                                    onClick={handleWithdraw}
                                    disabled={loading}
                                    className="btn-confirm"
                                    style={{ width: '100%', marginLeft: '16px' }}
                                >
                                    {loading ? 'Processing...' : 'Confirm Withdrawal'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WithdrawModal;
