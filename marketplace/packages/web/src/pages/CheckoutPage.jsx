import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CreditCard, Truck, Shield, Lock, ChevronRight, 
  MapPin, Phone, Mail, Package, AlertCircle, CheckCircle
} from 'lucide-react';
import apiService from '../services/api.service';
import { toast } from 'react-hot-toast';

const CheckoutPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    landmark: ''
  });

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await apiService.getOrder(orderId);
      setOrder(data);
      
      // Pre-fill shipping address if available
      if (data.buyer?.address) {
        setShippingAddress(prev => ({ ...prev, ...data.buyer.address }));
      }
    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    // Validate shipping address
    if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
      toast.error('Please fill in all required shipping details');
      return;
    }

    try {
      setProcessing(true);
      
      // Create payment intent
      const paymentIntent = await apiService.createPaymentIntent({
        orderId: order._id,
        amount: order.totalAmount,
        customerId: order.buyer._id
      });

      // Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: paymentIntent.amount,
        currency: 'INR',
        name: 'Marketplace',
        description: `Order #${order.orderNumber}`,
        order_id: paymentIntent.id,
        handler: async (response) => {
          try {
            // Verify payment
            await apiService.verifyPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              amount: order.totalAmount
            });
            
            toast.success('Payment successful!');
            navigate(`/order-success/${order._id}`);
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: shippingAddress.fullName,
          email: shippingAddress.email,
          contact: shippingAddress.phone
        },
        theme: {
          color: '#2563eb'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error('Payment initialization failed');
    } finally {
      setProcessing(false);
    }
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">
                1
              </div>
              <span className="ml-2 text-sm font-medium">Cart</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">
                2
              </div>
              <span className="ml-2 text-sm font-medium">Shipping</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center">
              <div className="w-8 h-8 border-2 border-gray-300 text-gray-400 rounded-full flex items-center justify-center">
                3
              </div>
              <span className="ml-2 text-sm text-gray-400">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Shipping & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={shippingAddress.email}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
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
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.pincode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.landmark}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, landmark: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Near..."
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Method
              </h2>
              
              <div className="space-y-3">
                <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-sm text-gray-500">Visa, Mastercard, Rupay</p>
                    </div>
                  </div>
                  <CreditCard className="w-5 h-5 text-gray-400" />
                </label>
                
                <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
                  paymentMethod === 'upi' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <p className="font-medium">UPI</p>
                      <p className="text-sm text-gray-500">Google Pay, PhonePe, Paytm</p>
                    </div>
                  </div>
                </label>
                
                <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
                  paymentMethod === 'netbanking' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value="netbanking"
                      checked={paymentMethod === 'netbanking'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <p className="font-medium">Net Banking</p>
                      <p className="text-sm text-gray-500">All major banks</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Secure Payment</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Your payment information is encrypted and secure. We use industry-standard security measures.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              {order && (
                <>
                  {/* Product Details */}
                  <div className="space-y-3 mb-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex gap-3">
                        <img
                          src={item.product?.images?.[0] || '/placeholder.jpg'}
                          alt={item.product?.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product?.title}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.subtotal || order.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>{formatPrice(order.shippingCost || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>{formatPrice(order.tax || 0)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-blue-600">{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Pay {formatPrice(order.totalAmount)}
                      </>
                    )}
                  </button>
                  
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      <span>Secure</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      <span>Encrypted</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>Verified</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
