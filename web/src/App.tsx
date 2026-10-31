import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { JoinGroup } from './pages/JoinGroup';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Transactions } from './pages/Transactions';
import { AddTransaction } from './pages/AddTransaction';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
    const { user, appUser, household, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }

    if (!user || !appUser) {
        return <Login />;
    }

    if (!household || !appUser.householdId) {
        return <JoinGroup />;
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="add" element={<AddTransaction />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
