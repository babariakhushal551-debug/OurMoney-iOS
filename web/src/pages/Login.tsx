import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export const Login: React.FC = () => {
    const { signIn } = useAuth();
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-blue-600">O</span>
                </div>
                <h1 className="text-2xl font-bold mb-2">OurMoney</h1>
                <p className="text-gray-500 mb-8">Shared expenses for roommates and couples.</p>
                <button 
                    onClick={signIn}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                    <LogIn size={20} className="text-gray-500" />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};
