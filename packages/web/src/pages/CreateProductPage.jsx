import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, X, Plus, Loader, AlertCircle, 
  CheckCircle, Camera, Tag, MapPin, Package,
  DollarSign, Info, Sparkles
} from 'lucide-react';
import apiService from '../services/api.service';
import { toast } from 'react-hot-toast';

const CreateProductPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState(null);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    brand: '',
    condition: 'used',
    price: '',
    isAuction: false,
    startingBid: '',
    auctionDuration: 7,
    quantity: 1,
    images: [],
    location: {
      address: '',
      city: '',
      state: '',
      pincode: ''
    },
    shippingOptions: {
      localPickup: true,
      shipping: false,
      shippingCost: ''
    },
    tags: []
  });

  const categories = [
    'Electronics', 'Fashion', 'Home & Living', 'Vehicles',
    'Sports & Fitness', 'Books & Media', 'Beauty & Health',
    'Toys & Baby', 'Real Estate', 'Services'
  ];

  const conditions = [
    { value: 'new', label: 'Brand New', description: 'Never used, in original packaging' },
    { value: 'like-new', label: 'Like New', description: 'Used once or twice, excellent condition' },
    { value: 'used', label: 'Used', description: 'Normal wear and tear' },
    { value: 'refurbished', label: 'Refurbished', description: 'Professionally restored' }
  ];

  useEffect(() => {
    if (formData.title && formData.description) {
      const debounceTimer = setTimeout(() => {
        fetchAISuggestions();
      }, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [formData.title, formData.description]);

  const fetchAISuggestions = async () => {
    try {
      setAiLoading(true);
      
      // Get AI suggestions for price and category
      const [priceData, categoryData] = await Promise.all([
        apiService.getSuggestedPrice({
          title: formData.title,
          description: formData.description,
          condition: formData.condition,
          category: formData.category
        }),
        apiService.categorizeProduct({
          title: formData.title,
          description: formData.description
        })
      ]);

      setSuggestedPrice(priceData.suggestedPrice);
      setSuggestedCategory(categoryData);
      
      // Auto-fill category if confidence is high
      if (categoryData.confidence > 0.8) {
        setFormData(prev => ({
          ...prev,
          category: categoryData.category,
          tags: categoryData.tags || []
        }));
        toast.success('Category auto-detected!');
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (formData.images.length + files.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    try {
      const uploadPromises = files.map(file => {
        const formData = new FormData();
        formData.append('file', file);
        return apiService.uploadFile(file, 'product');
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls.map(res => res.url)]
      }));
      
      toast.success('Images uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload images');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (formData.images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    try {
      setLoading(true);
      
      const productData = {
        ...formData,
        price: formData.isAuction ? formData.startingBid : formData.price
      };
      
      const response = await apiService.createProduct(productData);
      
      toast.success('Product listed successfully!');
      navigate(`/product/${response._id}`);
    } catch (error) {
      toast.error('Failed to create product listing');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestedPrice = () => {
    if (suggestedPrice) {
      setFormData(prev => ({
        ...prev,
        price: suggestedPrice.toString(),
        startingBid: suggestedPrice.toString()
      }));
      toast.success('Suggested price applied');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Product Listing</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Images Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Product Images
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {formData.images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Product ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {formData.images.length < 10 && (
              <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Add Photo</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            Add up to 10 photos. First photo will be the main image.
          </p>
        </div>

        {/* Product Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Details
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="What are you selling?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your product in detail..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  
                  {suggestedCategory && suggestedCategory.category !== formData.category && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-md flex items-center justify-between">
                      <span className="text-sm text-blue-700">
                        AI suggests: {suggestedCategory.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, category: suggestedCategory.category })}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Apple, Samsung"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {conditions.map(condition => (
                  <label
                    key={condition.value}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      formData.condition === condition.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value={condition.value}
                      checked={formData.condition === condition.value}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="sr-only"
                    />
                    <div className="text-sm font-medium">{condition.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{condition.description}</div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!formData.isAuction}
                  onChange={() => setFormData({ ...formData, isAuction: false })}
                  className="text-blue-600"
                />
                <span>Fixed Price</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.isAuction}
                  onChange={() => setFormData({ ...formData, isAuction: true })}
                  className="text-blue-600"
                />
                <span>Auction</span>
              </label>
            </div>

            {formData.isAuction ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starting Bid *
                  </label>
                  <input
                    type="number"
                    value={formData.startingBid}
                    onChange={(e) => setFormData({ ...formData, startingBid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="₹0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (days)
                  </label>
                  <select
                    value={formData.auctionDuration}
                    onChange={(e) => setFormData({ ...formData, auctionDuration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="₹0"
                    required
                  />
                  
                  {suggestedPrice && (
                    <div className="mt-2 p-3 bg-green-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700">
                            AI suggests: ₹{suggestedPrice.toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={applySuggestedPrice}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Apply
                        </button>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Based on market analysis and similar products
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location & Shipping
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.location.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: { ...formData.location, city: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  value={formData.location.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: { ...formData.location, state: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.shippingOptions.localPickup}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingOptions: { ...formData.shippingOptions, localPickup: e.target.checked }
                    })}
                    className="text-blue-600"
                  />
                  <span>Local Pickup Available</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.shippingOptions.shipping}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingOptions: { ...formData.shippingOptions, shipping: e.target.checked }
                    })}
                    className="text-blue-600"
                  />
                  <span>Shipping Available</span>
                </label>
              </div>
              
              {formData.shippingOptions.shipping && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Cost
                  </label>
                  <input
                    type="number"
                    value={formData.shippingOptions.shippingCost}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingOptions: { ...formData.shippingOptions, shippingCost: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="₹0 (Free shipping)"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Loading Indicator */}
        {aiLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Loader className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-700">
              AI is analyzing your product for suggestions...
            </span>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Creating Listing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Create Listing
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductPage;
