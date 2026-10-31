import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Household } from '../models';

export const JoinGroup: React.FC = () => {
    const { appUser, logOut } = useAuth();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlCode = params.get('code');
        if (urlCode) {
            setCode(urlCode.trim().toUpperCase());
        }
    }, []);

    const handleCreate = async () => {
        if (!appUser) return;
        setLoading(true);
        try {
            const hId = crypto.randomUUID();
            const hCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const h: Household = {
                id: hId,
                code: hCode,
                members: [appUser.id],
                createdAt: Date.now()
            };
            
            await setDoc(doc(db, 'households', hId), h);
            await updateDoc(doc(db, 'users', appUser.id), { householdId: hId });
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleJoin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!appUser || !code) return;
        setLoading(true);
        setError('');
        try {
            const q = query(collection(db, 'households'), where('code', '==', code.trim().toUpperCase()));
            const snap = await getDocs(q);
            if (snap.empty) {
                setError("Group not found with code " + code.trim().toUpperCase());
            } else {
                const docSnap = snap.docs[0];
                const h = docSnap.data() as Household;
                
                // Allow replacing preview/test placeholder partner if Devanshu started with a preview
                const realMembers = h.members.filter(m => !m.startsWith('partner_') && !m.startsWith('test_') && m !== appUser.id);
                
                if (h.members.includes(appUser.id)) {
                    await updateDoc(doc(db, 'users', appUser.id), { householdId: h.id });
                } else if (realMembers.length >= 2) {
                    setError("This group is already full (max 2 members).");
                } else {
                    const updatedMembers = [...realMembers, appUser.id];
                    await updateDoc(docSnap.ref, { members: updatedMembers });
                    await updateDoc(doc(db, 'users', appUser.id), { householdId: h.id });
                }
            }
        } catch (e: any) {
            setError(e.message || "Failed to join group.");
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 border border-gray-100">
                <h1 className="text-2xl font-bold mb-6 text-center">Join or Create Group</h1>
                
                <form onSubmit={handleJoin} className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Have an invite code?</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={code} 
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. A1B2C3" 
                            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                            maxLength={6}
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !code}
                            className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                        >
                            Join
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>

                <div className="relative flex items-center py-5">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400">or</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button 
                    onClick={handleCreate} 
                    disabled={loading}
                    className="w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 mb-4"
                >
                    Create New Group
                </button>
                <button 
                    onClick={logOut}
                    className="w-full text-gray-500 font-medium py-3"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};
