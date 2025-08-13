import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, MapPin } from 'lucide-react';

const ProductCard = ({ product }) => {
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
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <Link to={`/product/${_id}`} className="block">
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
          <img
            src={images?.[0] || '/placeholder.jpg'}
            alt={title}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isAuction && (
            <span className="rounded-full bg-red-100 dark:bg-red-900/50 px-3 py-1 text-xs font-semibold text-red-800 dark:text-red-300">
              Auction
            </span>
          )}
          {condition === 'new' && (
            <span className="rounded-full bg-green-100 dark:bg-green-900/50 px-3 py-1 text-xs font-semibold text-green-800 dark:text-green-300">
              New
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400">
          <Link to={`/product/${_id}`}>
            <span aria-hidden="true" className="absolute inset-0" />
            {title}
          </Link>
        </h3>
        
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span>{location?.city || 'India'}</span>
        </div>

        <div className="flex flex-1 flex-col justify-end">
          <div className="flex items-end justify-between">
            <div>
              {isAuction ? (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Bid</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatPrice(currentBid || price)}</p>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatPrice(price)}</p>
              )}
            </div>
            {isAuction && getTimeRemaining() && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{getTimeRemaining()}</p>
            )}
          </div>

          <button className="mt-4 flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <ShoppingCart className="w-5 h-5 mr-2" />
            {isAuction ? 'Place Bid' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
