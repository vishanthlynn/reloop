import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          <div className="lg:col-span-3">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Store className="h-7 w-7 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Reloop</span>
            </Link>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-xs">
              The trusted community marketplace for buying and selling pre-loved treasures.
            </p>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wider uppercase">Shop</h3>
            <ul className="mt-4 space-y-3">
              <li><Link to="/products" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">All Products</Link></li>
              <li><Link to="/categories/electronics" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Electronics</Link></li>
              <li><Link to="/categories/furniture" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Furniture</Link></li>
              <li><Link to="/categories/fashion" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Fashion</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wider uppercase">About</h3>
            <ul className="mt-4 space-y-3">
              <li><Link to="/about" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">About Us</Link></li>
              <li><Link to="/sell" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">How to Sell</Link></li>
              <li><Link to="/careers" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Careers</Link></li>
              <li><Link to="/press" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Press</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-wider uppercase">Stay in the loop</h3>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Get the latest deals and updates straight to your inbox.</p>
            <form className="mt-4 flex sm:max-w-md">
              <input type="email" placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-r-lg hover:bg-indigo-700">Subscribe</button>
            </form>
          </div>

        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">&copy; 2024 Reloop. All rights reserved.</p>
          <div className="flex items-center space-x-5 mt-4 sm:mt-0">
            <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"><Facebook className="h-5 w-5" /></a>
            <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"><Twitter className="h-5 w-5" /></a>
            <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"><Instagram className="h-5 w-5" /></a>
            <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"><Linkedin className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
