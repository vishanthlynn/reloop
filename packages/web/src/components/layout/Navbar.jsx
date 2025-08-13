import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Plus, Heart, ShoppingBag } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const isLoggedIn = false; // TODO: Get from auth context

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <ShoppingBag className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">Marketplace</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link
              to="/sell"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Sell
            </Link>

            {isLoggedIn ? (
              <>
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <Heart className="h-6 w-6" />
                </button>
                <Link to="/profile" className="p-2 text-gray-600 hover:text-gray-900">
                  <User className="h-6 w-6" />
                </Link>
              </>
            ) : (
              <div className="flex space-x-2">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
