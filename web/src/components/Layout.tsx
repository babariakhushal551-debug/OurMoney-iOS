import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Receipt, PlusCircle, Settings } from 'lucide-react';

export const Layout: React.FC = () => {
    return (
        <div className="flex flex-col h-screen bg-gray-50 pb-safe">
            <main className="flex-1 overflow-y-auto pb-20">
                <div className="max-w-md mx-auto h-full bg-white shadow-sm">
                    <Outlet />
                </div>
            </main>
            
            <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe z-50">
                <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
                    <NavItem to="/" icon={<Home />} label="Home" />
                    <NavItem to="/transactions" icon={<Receipt />} label="History" />
                    <div className="-mt-8">
                        <NavLink to="/add" className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                            <PlusCircle size={28} />
                        </NavLink>
                    </div>
                    <NavItem to="/settings" icon={<Settings />} label="Settings" />
                </div>
            </nav>
        </div>
    );
};

const NavItem: React.FC<{to: string, icon: React.ReactNode, label: string}> = ({to, icon, label}) => {
    return (
        <NavLink 
            to={to} 
            className={({isActive}) => `flex flex-col items-center justify-center w-16 h-full text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
            <div className="mb-1">{icon}</div>
            {label}
        </NavLink>
    );
}
