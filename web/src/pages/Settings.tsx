import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Settings: React.FC = () => {
    const { appUser, partnerUser, household, logOut } = useAuth();

    return (
        <div className="p-4 min-h-screen bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 mt-2">Settings</h1>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Account</h3>
                <div className="mb-4">
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{appUser?.name}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{appUser?.email}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Group</h3>
                <div className="mb-4">
                    <p className="text-sm text-gray-500">Group Code (Share this to invite partner)</p>
                    <p className="text-2xl font-mono font-bold text-blue-600 tracking-widest">{household?.code}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Partner</p>
                    <p className="font-medium text-gray-900">{partnerUser ? partnerUser.name : 'Waiting for partner...'}</p>
                </div>
            </div>

            <button 
                onClick={logOut}
                className="w-full bg-gray-200 text-gray-800 font-semibold py-4 px-4 rounded-xl hover:bg-gray-300"
            >
                Sign Out
            </button>
        </div>
    );
};
