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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              India's Trusted Marketplace
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Buy, Sell, and Discover Amazing Deals Near You
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for products, brands, and more..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-12 max-w-2xl mx-auto">
              <div className="text-center">
                <p className="text-3xl font-bold">1M+</p>
                <p className="text-blue-100">Active Users</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">500K+</p>
                <p className="text-blue-100">Products Listed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">100+</p>
                <p className="text-blue-100">Cities Covered</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
            <Link to="/categories" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {defaultCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategorySelect(category.name)}
                className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>
                <p className="text-sm font-medium text-gray-900">{category.name}</p>
                <p className="text-xs text-gray-500">{category.count} items</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onFavorite={(p) => console.log('Favorite:', p)}
                  onAddToCart={(p) => console.log('Add to cart:', p)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Products */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Recently Added</h2>
            </div>
            <Link to="/products" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onFavorite={(p) => console.log('Favorite:', p)}
                  onAddToCart={(p) => console.log('Add to cart:', p)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Our Marketplace?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
              <p className="text-gray-600">
                Your transactions are protected with escrow payments and fraud detection
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
              <p className="text-gray-600">
                Nationwide shipping with real-time tracking and reliable courier partners
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
              <p className="text-gray-600">
                Smart pricing suggestions, scam detection, and personalized recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">Start Selling Today!</h2>
          <p className="text-xl mb-8 text-gray-300">
            Join thousands of sellers and reach millions of buyers across India
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/sell"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Selling
            </Link>
            <Link
              to="/how-it-works"
              className="px-8 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
