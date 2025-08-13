import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User as UserIcon, Plus, Heart, ShoppingBag, Store, LogOut, ChevronDown } from 'lucide-react';
import { useAuthContext } from '../../hooks/useAuth.jsx';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Store className="h-7 w-7 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Reloop</span>
          </Link>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Home</Link>
            <Link to="/products" className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Shop</Link>
            <Link to="/about" className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About</Link>
            
            <div className="h-6 border-l border-gray-300 dark:border-gray-600"></div>

            <Link
              to="/sell"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Sell
            </Link>

            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <img src={user.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${user.name}`} alt="user avatar" className="w-8 h-8 rounded-full bg-gray-200"/>
                  <span>{user.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">My Profile</Link>
                    <Link to="/my-listings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">My Listings</Link>
                    <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Login</Link>
                <Link to="/register" className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
