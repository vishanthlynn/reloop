import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, MapPin } from 'lucide-react';

const ProductCard = ({ product, onFavorite, onAddToCart }) => {
  const {
    _id,
    title,
    price,
    images,
    condition,
    location,
    seller,
    rating,
    reviewCount,
    isAuction,
    currentBid,
    endTime
  } = product;

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTimeRemaining = () => {
    if (!isAuction || !endTime) return null;
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d left`;
    return `${hours}h left`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <Link to={`/product/${_id}`} className="block relative">
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
          <img
            src={images?.[0] || '/placeholder.jpg'}
            alt={title}
            className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
        
        {isAuction && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
            AUCTION
          </div>
        )}
        
        {condition === 'new' && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
            NEW
          </div>
        )}
      </Link>

      <div className="p-4">
        <Link to={`/product/${_id}`}>
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 mb-2">
            {title}
          </h3>
        </Link>

        <div className="flex items-center justify-between mb-2">
          <div>
            {isAuction ? (
              <div>
                <p className="text-sm text-gray-500">Current Bid</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(currentBid || price)}</p>
                <p className="text-xs text-red-600">{getTimeRemaining()}</p>
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-900">{formatPrice(price)}</p>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              onFavorite?.(product);
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Add to favorites"
          >
            <Heart className="w-5 h-5 text-gray-400 hover:text-red-500" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{location?.city || 'Location not specified'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {seller?.avatar ? (
              <img
                src={seller.avatar}
                alt={seller.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300" />
            )}
            <span className="text-sm text-gray-600 truncate">{seller?.name || 'Unknown'}</span>
          </div>

          {rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">
                {rating.toFixed(1)} ({reviewCount})
              </span>
            </div>
          )}
        </div>

        {!isAuction && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(product);
            }}
            className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
