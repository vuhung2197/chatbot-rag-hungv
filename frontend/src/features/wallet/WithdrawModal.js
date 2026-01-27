
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BankAccountManager from './BankAccountManager';
import { FaMoneyBillWave, FaArrowRight, FaExclamationCircle } from 'react-icons/fa';

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
                `${process.env.REACT_APP_API_URL}/api/wallet/withdrawal/calculate-fee`,
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
                `${process.env.REACT_APP_API_URL}/api/wallet/withdraw`,
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
                >
                    &times;
                </button>

                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                    <FaMoneyBillWave className="text-green-600" /> Withdraw Funds
                </h2>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm flex items-start gap-2">
                        <FaExclamationCircle className="mt-1 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* STEP 1: Select Bank Account */}
                {step === 1 && (
                    <div>
                        <p className="text-gray-600 mb-4 text-sm">Select a bank account to receive your funds:</p>
                        <div className="mb-6">
                            <BankAccountManager
                                onSelect={(acc) => setSelectedBank(acc)}
                                selectedId={selectedBank?.id}
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!selectedBank}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                            >
                                Next Step <FaArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Enter Amount */}
                {step === 2 && (
                    <div>
                        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                            <div className="flex justify-between items-center text-sm text-blue-800 mb-1">
                                <span>Selected Account:</span>
                                <button onClick={() => setStep(1)} className="text-blue-600 hover:underline text-xs">Change</button>
                            </div>
                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-xs text-blue-600">
                                    {selectedBank.bank_code}
                                </span>
                                {selectedBank.bank_name}
                            </div>
                            <div className="font-mono text-gray-600 text-sm mt-1">
                                {selectedBank.account_number} • {selectedBank.account_holder_name}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2 text-gray-700">Amount to Withdraw ({currency})</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="w-full border border-gray-300 p-3 rounded-lg text-lg font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder-gray-300"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:bg-gray-200"
                                    onClick={() => setAmount(balance)}
                                >
                                    MAX
                                </button>
                            </div>
                            <div className="text-right text-sm text-gray-500 mt-2">
                                Available Balance: <span className="font-bold text-gray-800">{balance} {currency}</span>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCalculateFee}
                                disabled={!amount || parseFloat(amount) <= 0 || loading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md transition-all"
                            >
                                {loading ? 'Calculating...' : 'Review Withdrawal'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Confirm */}
                {step === 3 && feeData && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-center">Confirm Withdrawal</h3>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 space-y-3">
                            <div className="flex justify-between items-center text-gray-600">
                                <span>Withdrawal Amount</span>
                                <span className="font-medium text-gray-900">{feeData.amount} {currency}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                                <span>Transaction Fee</span>
                                <span className="text-red-500 font-medium">- {feeData.fee} {currency}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                                <span className="font-bold text-gray-800">You Receive</span>
                                <span className="text-xl font-bold text-green-600">{feeData.net_amount} {currency}</span>
                            </div>
                        </div>

                        <div className="text-sm text-gray-500 mb-6 text-center bg-yellow-50 p-3 rounded text-yellow-800 border border-yellow-100">
                            Funds will be transferred to your <b>{selectedBank.bank_code}</b> account ending in <b>{selectedBank.account_number.slice(-4)}</b> within 1-3 business days.
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(2)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleWithdraw}
                                disabled={loading}
                                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all font-bold w-full ml-4"
                            >
                                {loading ? 'Processing...' : 'Confirm Withdrawal'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WithdrawModal;
