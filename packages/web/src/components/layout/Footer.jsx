import React from 'react';
import { ShoppingBag } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <ShoppingBag className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-bold">Marketplace</span>
            </div>
            <p className="text-gray-400 max-w-md">
              India's trusted marketplace for buying and selling everything from electronics to furniture, with secure payments and nationwide delivery.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/products" className="hover:text-white">Browse Products</a></li>
              <li><a href="/sell" className="hover:text-white">Start Selling</a></li>
              <li><a href="/help" className="hover:text-white">Help Center</a></li>
              <li><a href="/safety" className="hover:text-white">Safety Tips</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/contact" className="hover:text-white">Contact Us</a></li>
              <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="/disputes" className="hover:text-white">Dispute Resolution</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Marketplace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
