 import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, TrendingUp, Package, Shield, 
  Truck, ChevronRight, Sparkles, Clock, MapPin 
} from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import apiService from '../services/api.service';
import { toast } from 'react-hot-toast';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    condition: '',
    sortBy: 'relevance'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        apiService.getProducts({ limit: 12 }),
        apiService.getCategories()
      ]);
      
      setProducts(productsData.products || []);
      setFeaturedProducts(productsData.products?.slice(0, 4) || []);
      setCategories(categoriesData || defaultCategories);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const sampleProducts = [
    "iPhone 14 Pro", "Samsung Galaxy S23", "MacBook Air M2", "Dell XPS 15",
    "Sony WH-1000XM5 Headphones", "Bose QuietComfort 45", "Apple Watch Series 8",
    "Garmin Fenix 7", "Nike Air Max", "Adidas Ultraboost", "Canon EOS R6 Camera",
    "Sony A7 IV", "LG C2 OLED TV", "Samsung QN90B QLED TV"
  ];

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 1) {
      const filteredSuggestions = sampleProducts.filter(
        (item) => item.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : prevIndex
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[activeSuggestionIndex]);
      }
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const results = await apiService.searchProducts(searchQuery, {
        category: selectedCategory,
        ...filters
      });
      setProducts(results.products || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    try {
      setLoading(true);
      const data = await apiService.getProducts({ category, limit: 12 });
      setProducts(data.products || []);
    } catch (error) {
      toast.error('Failed to load category products');
    } finally {
      setLoading(false);
    }
  };

  const defaultCategories = [
    { name: 'Electronics', icon: '📱', count: 1234 },
    { name: 'Fashion', icon: '👕', count: 892 },
    { name: 'Home & Living', icon: '🏠', count: 567 },
    { name: 'Vehicles', icon: '🚗', count: 234 },
    { name: 'Sports & Fitness', icon: '⚽', count: 456 },
    { name: 'Books & Media', icon: '📚', count: 789 },
    { name: 'Beauty & Health', icon: '💄', count: 345 },
    { name: 'Toys & Baby', icon: '🧸', count: 123 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight mb-4">
            The Nation's Marketplace, Reimagined
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10">
            Discover unique items, sell your goods, and connect with a community of buyers and sellers across India.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-6 h-6" />
              <input
                type="search"
                placeholder="What are you looking for today?"
                className="w-full pl-14 pr-32 py-4 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border-transparent rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 transition"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
              >
                Search
              </button>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-2">
                  <ul className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-left overflow-hidden">
                    {suggestions.map((suggestion, index) => {
                      const queryIndex = suggestion.toLowerCase().indexOf(searchQuery.toLowerCase());
                      const before = suggestion.slice(0, queryIndex);
                      const match = suggestion.slice(queryIndex, queryIndex + searchQuery.length);
                      const after = suggestion.slice(queryIndex + searchQuery.length);

                      return (
                        <li
                          key={suggestion}
                          className={`px-5 py-3 cursor-pointer text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors duration-150 ${
                            index === activeSuggestionIndex ? 'bg-indigo-50 dark:bg-indigo-900/50' : ''
                          }`}
                          onMouseDown={() => handleSuggestionClick(suggestion)}
                        >
                          <span>
                            {before}
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{match}</span>
                            {after}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Explore Popular Categories</h2>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">Find what you need from our wide selection.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6 text-center">
            {defaultCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategorySelect(category.name)}
                className="group flex flex-col items-center p-4 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-5xl mb-3 transition-transform duration-300 group-hover:scale-110">
                  {category.icon}
                </div>
                <p className="text-base font-semibold text-gray-800 dark:text-gray-200">{category.name}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-10">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Freshly Recommended For You</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                  <div className="w-full h-56 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">A Marketplace You Can Trust</h2>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">We prioritize your safety, security, and satisfaction.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Shield className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Buyer Protection</h3>
              <p className="text-gray-600 dark:text-gray-300">Shop with confidence. We protect your purchases from click to delivery with our escrow system.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Truck className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Verified Sellers</h3>
              <p className="text-gray-600 dark:text-gray-300">We ensure our sellers meet high standards, so you can buy with peace of mind.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Sparkles className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">AI-Powered Safety</h3>
              <p className="text-gray-600 dark:text-gray-300">Our smart technology works 24/7 to detect scams and keep our community safe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto text-center py-16 px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">Ready to Join?</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 my-6">
            Become part of India's most vibrant marketplace. It's free to sign up!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/sell"
              className="inline-block px-10 py-4 bg-indigo-600 text-white rounded-full font-semibold text-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105"
            >
              Start Selling Now
            </Link>
            <Link
              to="/how-it-works"
              className="inline-block px-10 py-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-full font-semibold text-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transform hover:scale-105"
            >
              Learn How It Works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
