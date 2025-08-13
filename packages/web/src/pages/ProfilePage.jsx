import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Package, Heart, Star, Settings, LogOut,
  ShoppingBag, MessageCircle, Bell, Shield, Camera,
  MapPin, Phone, Mail, Calendar, CheckCircle, AlertCircle
} from 'lucide-react';
import apiService from '../services/api.service';
import { toast } from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState(null);
  const [stats, setStats] = useState({
    totalListings: 0,
    totalSold: 0,
    totalPurchases: 0,
    rating: 0
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [userData, kycData, statsData] = await Promise.all([
        apiService.getProfile(),
        apiService.getKYCStatus(),
        apiService.getUserStats()
      ]);
      
      setUser(userData);
      setKycStatus(kycData);
      setStats(statsData || stats);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async () => {
    try {
      switch (activeTab) {
        case 'listings':
          const listingsData = await apiService.getProducts({ seller: user?._id });
          setListings(listingsData.products || []);
          break;
        case 'orders':
          const ordersData = await apiService.getOrders();
          setOrders(ordersData.orders || []);
          break;
        case 'favorites':
          const favoritesData = await apiService.getFavorites();
          setFavorites(favoritesData.products || []);
          break;
      }
    } catch (error) {
      console.error('Failed to fetch tab data:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await apiService.uploadAvatar(file);
      setUser(prev => ({ ...prev, avatar: response.url }));
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const handleLogout = () => {
    apiService.logout();
    navigate('/login');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
                {kycStatus?.verified && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {user.phone}
                  </div>
                )}
                {user?.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {user.location.city}, {user.location.state}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Member since {formatDate(user?.createdAt)}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalListings}</p>
                  <p className="text-sm text-gray-500">Listings</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSold}</p>
                  <p className="text-sm text-gray-500">Sold</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
                  <p className="text-sm text-gray-500">Purchases</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.rating > 0 ? stats.rating.toFixed(1) : '-'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">Rating</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                {!kycStatus?.verified && (
                  <button
                    onClick={() => navigate('/kyc')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Verify Account
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('listings')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'listings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                My Listings
              </div>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Orders
              </div>
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Favorites
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'listings' && (
          <div>
            {listings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
                <p className="text-gray-500 mb-4">Start selling by creating your first listing</p>
                <button
                  onClick={() => navigate('/sell')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {listings.map((product) => (
                  <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <img
                      src={product.images?.[0] || '/placeholder.jpg'}
                      alt={product.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{product.title}</h3>
                      <p className="text-lg font-bold text-gray-900 mb-2">{formatPrice(product.price)}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.status === 'available'
                            ? 'bg-green-100 text-green-700'
                            : product.status === 'sold'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {product.status}
                        </span>
                        <button
                          onClick={() => navigate(`/product/${product._id}/edit`)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-500 mb-4">Your order history will appear here</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'shipped'
                          ? 'bg-blue-100 text-blue-700'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {order.items?.slice(0, 3).map((item, index) => (
                          <img
                            key={index}
                            src={item.product?.images?.[0] || '/placeholder.jpg'}
                            alt={item.product?.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ))}
                        {order.items?.length > 3 && (
                          <span className="text-sm text-gray-500">
                            +{order.items.length - 3} more
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatPrice(order.totalAmount)}</p>
                        <button
                          onClick={() => navigate(`/order/${order._id}`)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
                <p className="text-gray-500 mb-4">Items you favorite will appear here</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {favorites.map((product) => (
                  <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <img
                      src={product.images?.[0] || '/placeholder.jpg'}
                      alt={product.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{product.title}</h3>
                      <p className="text-lg font-bold text-gray-900 mb-2">{formatPrice(product.price)}</p>
                      <button
                        onClick={() => navigate(`/product/${product._id}`)}
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        View Product
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
