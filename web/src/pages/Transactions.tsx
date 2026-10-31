import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Transaction, Settlement, TransactionType } from '../models';
import { isTransactionPaidByMe, isTransactionPersonalMine } from '../LedgerCalculator';
import { Trash2, RefreshCw, Search } from 'lucide-react';

export const Transactions: React.FC = () => {
    const { appUser, partnerUser, household } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'SHARED' | 'PERSONAL'>('ALL');

    useEffect(() => {
        if (!household) return;
        const txQ = query(collection(db, 'households', household.id, 'transactions'), orderBy('dateMillis', 'desc'));
        const unsubTx = onSnapshot(txQ, (snap) => {
            setTransactions(snap.docs.map(d => d.data() as Transaction));
        });

        const setQ = query(collection(db, 'households', household.id, 'settlements'), orderBy('dateMillis', 'desc'));
        const unsubSet = onSnapshot(setQ, (snap) => {
            setSettlements(snap.docs.map(d => d.data() as Settlement));
        });

        return () => {
            unsubTx();
            unsubSet();
        };
    }, [household?.id]);

    const partnerName = partnerUser?.name?.trim() ? partnerUser.name.split(' ')[0] : 'Partner';
    const partnerId = household?.members.find(m => m !== appUser?.id) || 'partner';

    const handleDelete = async (id: string, isSettlement: boolean) => {
        if (!household || !confirm('Are you sure you want to delete this entry?')) return;
        try {
            const col = isSettlement ? 'settlements' : 'transactions';
            await deleteDoc(doc(db, 'households', household.id, col, id));
        } catch (e) {
            console.error('Delete error', e);
        }
    };

    const handleTogglePayer = async (tx: Transaction) => {
        if (!household || !appUser) return;
        const isPaidByMe = isTransactionPaidByMe(tx, appUser.id, partnerId, appUser.email, appUser.name, partnerName);
        const newPayerId = isPaidByMe ? partnerId : appUser.id;
        try {
            await updateDoc(doc(db, 'households', household.id, 'transactions', tx.id), {
                paidBy: newPayerId
            });
        } catch (e) {
            console.error('Update error', e);
        }
    };

    // Combine transactions and settlements
    const combined = [
        ...transactions.map(t => ({ ...t, isSettlement: false })),
        ...settlements.map(s => ({
            id: s.id,
            amountPaise: s.amountPaise,
            category: 'Settlement',
            notes: s.notes || 'Settlement payment',
            dateMillis: s.dateMillis,
            paidBy: s.paidBy,
            createdBy: s.createdBy,
            personal: false,
            splitMethod: 'EQUAL',
            splits: [],
            type: TransactionType.TRANSFER,
            paymentMethod: s.paymentMethod,
            isDeleted: false,
            isSettlement: true
        }))
    ].sort((a, b) => b.dateMillis - a.dateMillis);

    const filtered = combined.filter(item => {
        if (filter === 'SHARED' && (item.personal || item.isSettlement)) return false;
        if (filter === 'PERSONAL' && !item.personal) return false;
        if (search) {
            const q = search.toLowerCase();
            return item.category.toLowerCase().includes(q) || item.notes.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <div className="p-4 min-h-screen bg-slate-50 pb-24">
            <h1 className="text-2xl font-black text-slate-900 mb-4 mt-2">Ledger History</h1>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search expenses..."
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 mb-4">
                {(['ALL', 'SHARED', 'PERSONAL'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                            filter === tab
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {tab === 'ALL' ? 'All' : tab === 'SHARED' ? 'Shared' : 'Personal'}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                        <p className="text-slate-400 font-medium text-sm">No transactions found.</p>
                    </div>
                ) : (
                    filtered.map(tx => {
                        const isPaidByMe = isTransactionPaidByMe(tx, appUser?.id || '', partnerId, appUser?.email || '', appUser?.name || '', partnerName);
                        const isPersonalMine = isTransactionPersonalMine(tx, appUser?.id || '', partnerId, appUser?.email || '', appUser?.name || '', partnerName);
                        const isTransfer = tx.type === TransactionType.TRANSFER;

                        return (
                            <div key={tx.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 text-sm">{tx.notes || tx.category}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* Pill badge */}
                                            {tx.personal ? (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100">
                                                    {isPersonalMine ? 'Personal' : `${partnerName}'s`}
                                                </span>
                                            ) : isTransfer ? (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-600 border border-teal-100">
                                                    Settlement
                                                </span>
                                            ) : isPaidByMe ? (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    You paid
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                                                    {partnerName} paid
                                                </span>
                                            )}
                                            <span className="text-xs text-slate-400">
                                                {new Date(tx.dateMillis).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <span className="text-xs text-slate-400">• {tx.paymentMethod}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-black text-base ${isTransfer ? 'text-teal-600' : 'text-slate-900'}`}>
                                            ₹{(tx.amountPaise / 100).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick actions row */}
                                {!isTransfer && !tx.personal && (
                                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-50 text-xs">
                                        <button
                                            onClick={() => handleTogglePayer(tx)}
                                            className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 py-0.5 px-2 rounded-lg hover:bg-indigo-50"
                                        >
                                            <RefreshCw size={12} />
                                            Mark as paid by {isPaidByMe ? partnerName : 'You'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tx.id, tx.isSettlement)}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition"
                                            title="Delete entry"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
