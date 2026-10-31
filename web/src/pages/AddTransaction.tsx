import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Transaction, TransactionType, SplitMethod, SplitAmount } from '../models';
import { ArrowLeft, Check } from 'lucide-react';

const CATEGORIES = [
    { id: 'Food & Dining', label: 'Food', icon: '🍴' },
    { id: 'Groceries', label: 'Groceries', icon: '🧺' },
    { id: 'Transport', label: 'Travel', icon: '🚗' },
    { id: 'Bills & Utilities', label: 'Bills', icon: '🧾' },
    { id: 'Shopping', label: 'Shopping', icon: '🛍️' },
    { id: 'Entertainment', label: 'Fun', icon: '🎮' },
    { id: 'Health', label: 'Health', icon: '❤️' },
    { id: 'Other', label: 'Other', icon: '⋯' }
];

export const AddTransaction: React.FC = () => {
    const { appUser, partnerUser, household } = useAuth();
    const navigate = useNavigate();

    const partnerName = partnerUser?.name?.trim() ? partnerUser.name.split(' ')[0] : 'Partner';
    const partnerId = household?.members.find(m => m !== appUser?.id) || 'partner';

    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food & Dining');
    const [notes, setNotes] = useState('');
    const [paidByMe, setPaidByMe] = useState(true);
    const [splitMode, setSplitMode] = useState<number>(0); // 0 = 50/50, 1 = Payer owes 100%, 2 = Other owes 100%, 3 = My personal, 4 = Partner personal
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleIncrement = (inc: number) => {
        const cur = parseFloat(amount) || 0;
        setAmount((cur + inc).toFixed(0));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appUser || !household) return;
        
        const amtPaise = Math.round(parseFloat(amount) * 100);
        if (isNaN(amtPaise) || amtPaise <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const id = crypto.randomUUID();
            const payerId = paidByMe ? appUser.id : partnerId;
            const isPersonal = splitMode === 3 || splitMode === 4;

            let splits: SplitAmount[] = [];
            if (splitMode === 0) {
                // Shared 50/50
                const half = Math.round(amtPaise / 2);
                splits = [
                    { userId: appUser.id, amountPaise: half },
                    { userId: partnerId, amountPaise: amtPaise - half }
                ];
            } else if (splitMode === 1) {
                // Other owes 100%
                splits = [
                    { userId: appUser.id, amountPaise: 0 },
                    { userId: partnerId, amountPaise: amtPaise }
                ];
            } else if (splitMode === 2) {
                // I owe 100%
                splits = [
                    { userId: appUser.id, amountPaise: amtPaise },
                    { userId: partnerId, amountPaise: 0 }
                ];
            } else if (splitMode === 3) {
                // My Personal
                splits = [{ userId: appUser.id, amountPaise: amtPaise }];
            } else if (splitMode === 4) {
                // Partner Personal
                splits = [{ userId: partnerId, amountPaise: amtPaise }];
            }

            const tx: Transaction = {
                id,
                amountPaise: amtPaise,
                category,
                notes: notes.trim(),
                dateMillis: Date.now(),
                paidBy: payerId,
                createdBy: appUser.id,
                personal: isPersonal,
                splitMethod: splitMode === 0 ? SplitMethod.EQUAL : SplitMethod.EXACT,
                splits,
                type: TransactionType.EXPENSE,
                paymentMethod,
                isDeleted: false
            };

            await setDoc(doc(db, 'households', household.id, 'transactions', id), tx);
            navigate('/');
        } catch (err: any) {
            console.error("Failed to add transaction", err);
            setError(err.message || "Failed to add expense. Check connection.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
                <button 
                    onClick={() => navigate(-1)} 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-bold text-slate-900">Add Expense</h1>
                <div className="w-10"></div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                {/* Amount Hero Card */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Enter Amount
                    </label>
                    <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-3xl font-extrabold text-indigo-600">₹</span>
                        <input 
                            type="number" 
                            step="0.01"
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full text-4xl font-black text-slate-900 placeholder:text-slate-300 focus:outline-none"
                            placeholder="0"
                            autoFocus
                            required 
                        />
                    </div>
                    {/* Quick increment buttons */}
                    <div className="flex gap-2">
                        {[100, 200, 500, 1000].map(inc => (
                            <button
                                key={inc}
                                type="button"
                                onClick={() => handleIncrement(inc)}
                                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold rounded-xl text-xs transition"
                            >
                                +₹{inc}
                            </button>
                        ))}
                    </div>
                </div>

                {/* WHO PAID? */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Who Paid?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setPaidByMe(true)}
                            className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                                paidByMe 
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <div>
                                <p className="font-bold text-sm">You Paid</p>
                                <p className="text-xs text-slate-500">Your upfront spend</p>
                            </div>
                            {paidByMe && <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check size={14} /></div>}
                        </button>

                        <button
                            type="button"
                            onClick={() => setPaidByMe(false)}
                            className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                                !paidByMe 
                                    ? 'bg-purple-50 border-purple-500 text-purple-900' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <div>
                                <p className="font-bold text-sm">{partnerName} Paid</p>
                                <p className="text-xs text-slate-500">Added to {partnerName}'s spend</p>
                            </div>
                            {!paidByMe && <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center"><Check size={14} /></div>}
                        </button>
                    </div>
                </div>

                {/* SPLIT RULES */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Split Rules
                    </label>
                    <div className="space-y-2">
                        {[
                            { mode: 0, title: 'Shared 50 / 50', desc: 'Split equally between both' },
                            { mode: 1, title: `${partnerName} owes 100%`, desc: `Full amount owed by ${partnerName}` },
                            { mode: 2, title: 'You owe 100%', desc: 'Full amount owed by You' },
                            { mode: 3, title: 'My Personal Expense', desc: 'Private to you, not split' },
                            { mode: 4, title: `${partnerName}'s Personal Expense`, desc: `Private to ${partnerName}, not split` }
                        ].map(item => (
                            <button
                                key={item.mode}
                                type="button"
                                onClick={() => {
                                    setSplitMode(item.mode);
                                    if (item.mode === 3) setPaidByMe(true);
                                    if (item.mode === 4) setPaidByMe(false);
                                }}
                                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                                    splitMode === item.mode
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                                        : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <div>
                                    <p className="font-semibold text-sm">{item.title}</p>
                                    <p className="text-xs text-slate-400">{item.desc}</p>
                                </div>
                                {splitMode === item.mode && (
                                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                        <Check size={12} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CATEGORY GRID */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Category
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCategory(cat.id)}
                                className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition ${
                                    category === cat.id
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <span className="text-xl">{cat.icon}</span>
                                <span className="text-xs font-semibold truncate w-full text-center">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* NOTE / TITLE & PAYMENT METHOD */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Note / Merchant (Optional)
                        </label>
                        <input 
                            type="text" 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Swiggy, Blinkit, Petrol" 
                            className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Payment Method
                        </label>
                        <div className="flex gap-2">
                            {['UPI', 'Cash', 'Card'].map(pm => (
                                <button
                                    key={pm}
                                    type="button"
                                    onClick={() => setPaymentMethod(pm)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                                        paymentMethod === pm
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {pm}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SAVE BUTTON */}
                <button 
                    type="submit" 
                    disabled={loading || !amount}
                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 transition"
                >
                    {loading ? 'Saving...' : 'Save Expense'}
                </button>
            </form>
        </div>
    );
};
