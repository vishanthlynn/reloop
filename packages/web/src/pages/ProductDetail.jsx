import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Heart, Share2, Shield, Truck, RotateCcw, Star, 
  MapPin, Clock, User, ShoppingCart, MessageCircle,
  AlertTriangle, CheckCircle, Package
} from 'lucide-react';
import apiService from '../services/api.service';
import { toast } from 'react-hot-toast';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [suggestedPrice, setSuggestedPrice] = useState(null);
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    fetchProductDetails();
    fetchReviews();
    fetchPriceSuggestion();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProduct(id);
      setProduct(data);
      if (data.isAuction) {
        setBidAmount(data.currentBid + 100);
      }
    } catch (error) {
      toast.error('Failed to load product details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await apiService.getReviews(id);
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const fetchPriceSuggestion = async () => {
    try {
      const data = await apiService.getSuggestedPrice({ productId: id });
      setSuggestedPrice(data.suggestedPrice);
    } catch (error) {
      console.error('Failed to fetch price suggestion:', error);
    }
  };

  const handleBuyNow = async () => {
    try {
      const orderData = {
        productId: product._id,
        quantity,
        totalAmount: product.price * quantity
      };
      const order = await apiService.createOrder(orderData);
      navigate(`/checkout/${order._id}`);
    } catch (error) {
      toast.error('Failed to create order');
    }
  };

  const handlePlaceBid = async () => {
    try {
      await apiService.placeBid(product._id, { amount: bidAmount });
      toast.success('Bid placed successfully!');
      fetchProductDetails();
    } catch (error) {
      toast.error('Failed to place bid');
    }
  };

  const handleAddToCart = async () => {
    try {
      // Add to cart logic
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleContactSeller = () => {
    navigate(`/chat?userId=${product.seller._id}`);
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

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Product not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={product.images?.[selectedImage] || '/placeholder.jpg'}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {product.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-w-1 aspect-h-1 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
            
            <div className="flex items-center gap-4 mb-4">
              {product.rating > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {product.rating} ({product.reviewCount} reviews)
                  </span>
                </div>
              )}
              
              <span className="text-sm text-gray-500">
                {product.viewCount} views
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{product.location?.city}, {product.location?.state}</span>
            </div>
          </div>

          {/* Price Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            {product.isAuction ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Current Bid</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.currentBid || product.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">Ends in 2 days 14 hours</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter bid amount"
                    min={product.currentBid + 100}
                  />
                  <button
                    onClick={handlePlaceBid}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Place Bid
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatPrice(product.price)}
                </p>
                {suggestedPrice && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    AI suggests: {formatPrice(suggestedPrice)} (Good deal!)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Condition & Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Condition:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                product.condition === 'new' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {product.condition}
              </span>
            </div>
            
            {product.brand && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Brand:</span>
                <span className="text-sm font-medium">{product.brand}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!product.isAuction && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600">Quantity:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleBuyNow}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 font-medium"
                >
                  Buy Now
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 border border-blue-600 text-blue-600 py-3 px-6 rounded-md hover:bg-blue-50 font-medium flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50">
              <Heart className="w-5 h-5" />
              Save
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50">
              <Share2 className="w-5 h-5" />
              Share
            </button>
            <button
              onClick={handleContactSeller}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <MessageCircle className="w-5 h-5" />
              Chat
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-200">
            <div className="flex flex-col items-center text-center">
              <Shield className="w-6 h-6 text-green-600 mb-1" />
              <span className="text-xs text-gray-600">Secure Payment</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Truck className="w-6 h-6 text-blue-600 mb-1" />
              <span className="text-xs text-gray-600">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <RotateCcw className="w-6 h-6 text-purple-600 mb-1" />
              <span className="text-xs text-gray-600">7-Day Returns</span>
            </div>
          </div>

          {/* Seller Info */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Seller Information</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {product.seller?.avatar ? (
                  <img
                    src={product.seller.avatar}
                    alt={product.seller.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{product.seller?.name}</p>
                  <p className="text-sm text-gray-500">
                    Member since {new Date(product.seller?.createdAt).getFullYear()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/seller/${product.seller?._id}`)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
        <div className="prose max-w-none text-gray-600">
          {product.description}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{review.user?.name}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
