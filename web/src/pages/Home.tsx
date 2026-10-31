import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore';
import { Transaction, Settlement, Settlement as SettlementModel } from '../models';
import { calculateNetBalance, LedgerBalance, isTransactionPaidByMe, isTransactionPersonalMine } from '../LedgerCalculator';
import { Link } from 'react-router-dom';
import { PlusCircle, HandCoins, Copy, Check, Smartphone } from 'lucide-react';

export const Home: React.FC = () => {
    const { appUser, partnerUser, household } = useAuth();
    const [balance, setBalance] = useState<LedgerBalance | null>(null);
    const [recentTx, setRecentTx] = useState<Transaction[]>([]);
    const [copied, setCopied] = useState(false);

    const partnerName = partnerUser?.name?.trim() ? partnerUser.name.split(' ')[0] : 'Partner';
    const partnerId = household?.members.find(m => m !== appUser?.id) || 'partner';

    // Settle Up Modal State
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [settleAmount, setSettleAmount] = useState('');
    const [settleMethod, setSettleMethod] = useState('UPI');
    const [settlePaidByMe, setSettlePaidByMe] = useState(true);
    const [settleLoading, setSettleLoading] = useState(false);

    useEffect(() => {
        if (!household || !appUser) return;
        const txRef = collection(db, 'households', household.id, 'transactions');
        const setRef = collection(db, 'households', household.id, 'settlements');
        
        const unsubTx = onSnapshot(query(txRef, orderBy('dateMillis', 'desc')), (snap) => {
            const txs = snap.docs.map(d => d.data() as Transaction);
            setRecentTx(txs.slice(0, 6));
            
            const unsubSet = onSnapshot(setRef, (setSnap) => {
                const sets = setSnap.docs.map(d => d.data() as Settlement);
                setBalance(calculateNetBalance(appUser.id, txs, sets, partnerId, appUser.email || '', appUser.name || '', partnerName));
            });
            return () => unsubSet();
        });
        return () => unsubTx();
    }, [household?.id, appUser?.id, partnerId, partnerName]);



    const handleCopyCode = () => {
        if (!household) return;
        navigator.clipboard.writeText(household.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareLink = () => {
        if (!household) return;
        const url = `${window.location.origin}/join?code=${household.code}`;
        if (navigator.share) {
            navigator.share({
                title: 'Join OurMoney',
                text: `Join my OurMoney group on your iPhone to track expenses together! Code: ${household.code}`,
                url
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRecordSettlement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!household || !appUser) return;
        const val = parseFloat(settleAmount);
        if (isNaN(val) || val <= 0) return;

        setSettleLoading(true);
        try {
            const amtPaise = Math.round(val * 100);
            const payerId = settlePaidByMe ? appUser.id : partnerId;
            const receiverId = settlePaidByMe ? partnerId : appUser.id;
            const id = crypto.randomUUID();

            const s: SettlementModel = {
                id,
                amountPaise: amtPaise,
                paidBy: payerId,
                receivedBy: receiverId,
                dateMillis: Date.now(),
                paymentMethod: settleMethod,
                notes: `Settled via ${settleMethod}`,
                createdBy: appUser.id,
                createdAt: Date.now()
            };

            await setDoc(doc(db, 'households', household.id, 'settlements', id), s);
            setShowSettleModal(false);
            setSettleAmount('');
        } catch (e) {
            console.error('Failed to record settlement', e);
        }
        setSettleLoading(false);
    };

    if (!balance || !appUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Syncing with household...</p>
            </div>
        );
    }

    return (
        <div className="p-4 min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <header className="mb-5 mt-2 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">
                        Hello, {appUser.name.split(' ')[0]}
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                        Shared with <span className="font-bold text-slate-700">{partnerName}</span>
                    </p>
                </div>
                {/* Sync Badge */}
                <button 
                    onClick={handleShareLink}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition"
                >
                    <Smartphone size={14} />
                    <span>Sync Link</span>
                </button>
            </header>

            {/* iOS PWA Banner */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-3 text-white mb-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    <div>
                        <p className="text-xs font-bold">iOS Real-time Sync Active</p>
                        <p className="text-[11px] opacity-90">Code: <span className="font-mono font-black">{household?.code}</span></p>
                    </div>
                </div>
                <button 
                    onClick={handleCopyCode}
                    className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>

            {/* Balance Card */}
            <div className={`p-6 rounded-3xl mb-6 text-white shadow-lg transition-all ${
                balance.netBalancePaise > 0 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-200' 
                    : balance.netBalancePaise < 0 
                        ? 'bg-gradient-to-br from-rose-500 to-red-700 shadow-rose-200' 
                        : 'bg-gradient-to-br from-slate-800 to-slate-900 shadow-slate-200'
            }`}>
                <h2 className="text-xs font-bold opacity-80 mb-1 uppercase tracking-wider">
                    {balance.netBalancePaise > 0 ? 'You are owed' : balance.netBalancePaise < 0 ? 'You owe' : 'All Settled Up'}
                </h2>
                <div className="text-4xl font-black mb-4">
                    ₹{Math.abs(balance.netBalancePaise / 100).toFixed(2)}
                </div>
                
                {balance.netBalancePaise !== 0 ? (
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-sm flex items-center justify-between">
                        <span className="font-medium text-xs">
                            {balance.netBalancePaise > 0 ? `${partnerName} owes you` : `You owe ${partnerName}`}
                        </span>
                        <span className="font-bold text-sm">
                            ₹{Math.abs(balance.netBalancePaise / 100).toFixed(2)}
                        </span>
                    </div>
                ) : (
                    <p className="text-xs opacity-80">Everything is balanced 50/50.</p>
                )}
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <Link 
                    to="/add" 
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold py-3.5 px-4 rounded-2xl shadow-sm transition"
                >
                    <PlusCircle size={18} />
                    <span>Add Expense</span>
                </Link>

                <button 
                    onClick={() => {
                        setSettleAmount((Math.abs(balance.netBalancePaise) / 100).toFixed(0));
                        setSettlePaidByMe(balance.netBalancePaise < 0);
                        setShowSettleModal(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:scale-98 text-slate-800 border border-slate-200 font-bold py-3.5 px-4 rounded-2xl shadow-sm transition"
                >
                    <HandCoins size={18} className="text-emerald-600" />
                    <span>Settle Up</span>
                </button>
            </div>

            {/* Recent Activity */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
                    <Link to="/transactions" className="text-indigo-600 text-xs font-bold">View All</Link>
                </div>
                
                <div className="space-y-2.5">
                    {recentTx.length === 0 ? (
                        <p className="text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-100 text-sm">
                            No shared expenses yet.
                        </p>
                    ) : (
                        recentTx.map(tx => {
                            const isPaidByMe = isTransactionPaidByMe(tx, appUser.id, partnerId, appUser.email || '', appUser.name || '', partnerName);
                            const isPersonalMine = isTransactionPersonalMine(tx, appUser.id, partnerId, appUser.email || '', appUser.name || '', partnerName);
                            return (
                                <div key={tx.id} className="flex justify-between items-center p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{tx.notes || tx.category}</h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                tx.personal 
                                                    ? 'bg-sky-50 text-sky-600' 
                                                    : isPaidByMe 
                                                        ? 'bg-emerald-50 text-emerald-600' 
                                                        : 'bg-purple-50 text-purple-600'
                                            }`}>
                                                {tx.personal ? (isPersonalMine ? 'Personal' : `${partnerName}'s`) : isPaidByMe ? 'You paid' : `${partnerName} paid`}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                • {new Date(tx.dateMillis).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-slate-900 text-sm">
                                            ₹{(tx.amountPaise / 100).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Settle Up Modal */}
            {showSettleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100">
                        <h3 className="text-lg font-black text-slate-900 mb-1">Record Settlement</h3>
                        <p className="text-xs text-slate-400 mb-4">Mark payment made between you & {partnerName}</p>

                        <form onSubmit={handleRecordSettlement} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Amount (₹)
                                </label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={settleAmount}
                                    onChange={(e) => setSettleAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full text-2xl font-black border border-slate-200 rounded-2xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Who Paid?
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSettlePaidByMe(true)}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                                            settlePaidByMe ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        You Paid {partnerName}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSettlePaidByMe(false)}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                                            !settlePaidByMe ? 'bg-purple-50 border-purple-500 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {partnerName} Paid You
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Payment Mode
                                </label>
                                <div className="flex gap-2">
                                    {['UPI', 'Cash', 'Bank'].map(mode => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setSettleMethod(mode)}
                                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                                                settleMethod === mode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSettleModal(false)}
                                    className="flex-1 py-3 text-slate-600 font-bold rounded-xl hover:bg-slate-100 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={settleLoading || !settleAmount}
                                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-xs shadow-md shadow-emerald-200"
                                >
                                    {settleLoading ? 'Recording...' : 'Save Settlement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
