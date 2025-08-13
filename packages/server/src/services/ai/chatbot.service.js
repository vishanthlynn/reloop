import OpenAI from 'openai';
import { Product } from '../../models/product.model.js';
import { Order } from '../../models/order.model.js';
import { ApiError } from '../../utils/ApiError.js';

class ChatbotService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.conversationHistory = new Map();
  }

  // Process user message and generate response
  async processMessage({ userId, message, context = {} }) {
    try {
      // Get conversation history
      const history = this.getConversationHistory(userId);
      
      // Detect intent
      const intent = await this.detectIntent(message);
      
      // Generate response based on intent
      let response;
      switch (intent.type) {
        case 'product_search':
          response = await this.handleProductSearch(intent.entities, context);
          break;
        case 'order_status':
          response = await this.handleOrderStatus(userId, intent.entities);
          break;
        case 'price_inquiry':
          response = await this.handlePriceInquiry(intent.entities);
          break;
        case 'shipping_info':
          response = await this.handleShippingInfo(intent.entities);
          break;
        case 'return_policy':
          response = await this.handleReturnPolicy();
          break;
        case 'account_help':
          response = await this.handleAccountHelp(intent.entities);
          break;
        case 'payment_help':
          response = await this.handlePaymentHelp(intent.entities);
          break;
        case 'general_help':
          response = await this.handleGeneralHelp(message);
          break;
        default:
          response = await this.generateGeneralResponse(message, history);
      }
      
      // Store in history
      this.updateConversationHistory(userId, message, response);
      
      return {
        response,
        intent: intent.type,
        suggestedActions: this.getSuggestedActions(intent.type),
        confidence: intent.confidence
      };
    } catch (error) {
      console.error('Chatbot processing failed:', error);
      return {
        response: "I'm sorry, I encountered an error. Please try again or contact support.",
        error: true
      };
    }
  }

  // Detect user intent
  async detectIntent(message) {
    try {
      const prompt = `
        Analyze this customer message and identify the intent:
        "${message}"
        
        Possible intents:
        - product_search: Looking for products
        - order_status: Checking order status
        - price_inquiry: Asking about prices
        - shipping_info: Shipping questions
        - return_policy: Return/refund questions
        - account_help: Account related issues
        - payment_help: Payment issues
        - general_help: General questions
        
        Return JSON with:
        - type: the intent type
        - confidence: 0-1 confidence score
        - entities: extracted entities (product names, order numbers, etc.)
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an intent detection system for an e-commerce marketplace.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Intent detection failed:', error);
      return { type: 'general_help', confidence: 0.5, entities: {} };
    }
  }

  // Handle product search queries
  async handleProductSearch(entities, context) {
    try {
      const { product, category, priceRange } = entities;
      
      // Search for products
      const query = {};
      if (product) {
        query.$or = [
          { title: new RegExp(product, 'i') },
          { description: new RegExp(product, 'i') }
        ];
      }
      if (category) {
        query.category = category;
      }
      if (priceRange) {
        query.price = {
          $gte: priceRange.min || 0,
          $lte: priceRange.max || 999999
        };
      }

      const products = await Product.find({
        ...query,
        status: 'available'
      })
        .limit(5)
        .select('title price images condition');

      if (products.length === 0) {
        return "I couldn't find any products matching your criteria. Would you like to try a different search?";
      }

      let response = `I found ${products.length} product${products.length > 1 ? 's' : ''} for you:\n\n`;
      
      products.forEach((p, i) => {
        response += `${i + 1}. ${p.title}\n`;
        response += `   Price: ₹${p.price}\n`;
        response += `   Condition: ${p.condition}\n\n`;
      });
      
      response += "Would you like more details about any of these products?";
      
      return response;
    } catch (error) {
      console.error('Product search failed:', error);
      return "I'm having trouble searching for products right now. Please try again later.";
    }
  }

  // Handle order status queries
  async handleOrderStatus(userId, entities) {
    try {
      const { orderNumber } = entities;
      
      let query = { buyer: userId };
      if (orderNumber) {
        query.orderNumber = orderNumber;
      }

      const orders = await Order.find(query)
        .sort('-createdAt')
        .limit(3)
        .select('orderNumber status totalAmount createdAt trackingNumber');

      if (orders.length === 0) {
        return "You don't have any orders. Start shopping to place your first order!";
      }

      let response = "Here are your recent orders:\n\n";
      
      orders.forEach(order => {
        response += `Order #${order.orderNumber}\n`;
        response += `Status: ${order.status}\n`;
        response += `Amount: ₹${order.totalAmount}\n`;
        if (order.trackingNumber) {
          response += `Tracking: ${order.trackingNumber}\n`;
        }
        response += `Date: ${order.createdAt.toLocaleDateString()}\n\n`;
      });
      
      return response;
    } catch (error) {
      console.error('Order status check failed:', error);
      return "I couldn't retrieve your order information. Please check your order number or contact support.";
    }
  }

  // Handle price inquiries
  async handlePriceInquiry(entities) {
    const { product, productId } = entities;
    
    if (productId) {
      try {
        const productData = await Product.findById(productId).select('title price');
        if (productData) {
          return `The current price for "${productData.title}" is ₹${productData.price}.`;
        }
      } catch (error) {
        console.error('Price inquiry failed:', error);
      }
    }
    
    return `To check the price of a specific product, please provide the product name or ID. You can also browse our catalog to see all available products with their prices.`;
  }

  // Handle shipping information
  async handleShippingInfo(entities) {
    return `
📦 Shipping Information:

• Standard Shipping: 5-7 business days (₹50)
• Express Shipping: 2-3 business days (₹150)
• Free shipping on orders above ₹1000

We ship nationwide through our partner couriers:
- Shiprocket
- Delhivery
- BlueDart

You'll receive a tracking number once your order is dispatched. 
For specific shipping queries, please provide your order number.
    `.trim();
  }

  // Handle return policy
  async handleReturnPolicy() {
    return `
↩️ Return & Refund Policy:

• 7-day return window from delivery date
• Product must be unused and in original packaging
• Return shipping charges apply (unless item is defective)
• Refund processed within 5-7 business days after inspection

To initiate a return:
1. Go to My Orders
2. Select the order
3. Click "Return Item"
4. Follow the instructions

For damaged or wrong items, we provide free return shipping.
    `.trim();
  }

  // Handle account help
  async handleAccountHelp(entities) {
    const { issue } = entities;
    
    const responses = {
      'password': `
To reset your password:
1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your email for reset link
4. Create a new password

For security, passwords must be at least 8 characters with numbers and letters.
      `,
      'verification': `
To verify your account:
1. Go to Profile Settings
2. Click "Verify Account"
3. Upload required documents (Aadhaar/PAN)
4. Complete OTP verification

Verification helps build trust and enables additional features.
      `,
      'profile': `
To update your profile:
1. Go to Profile Settings
2. Edit your information
3. Click "Save Changes"

You can update:
- Name and contact details
- Address
- Profile picture
- Bio and preferences
      `,
      'default': `
For account assistance:
- Password reset
- Profile updates
- Account verification
- Privacy settings
- Notification preferences

Please specify what you need help with, or visit Account Settings.
      `
    };
    
    return responses[issue] || responses.default;
  }

  // Handle payment help
  async handlePaymentHelp(entities) {
    return `
💳 Payment Information:

Accepted Payment Methods:
• Credit/Debit Cards (Visa, Mastercard, Rupay)
• UPI (Google Pay, PhonePe, Paytm)
• Net Banking
• Wallets (Paytm, Mobikwik)
• Cash on Delivery (selected areas)

Payment Security:
- All transactions are encrypted
- We use Razorpay for secure processing
- Your card details are never stored

For payment issues:
1. Check your bank balance
2. Ensure card is not expired
3. Try a different payment method
4. Contact your bank if declined

Need specific help? Please describe your payment issue.
    `.trim();
  }

  // Handle general help
  async handleGeneralHelp(message) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful customer service assistant for an online marketplace. 
            Be friendly, concise, and helpful. Focus on solving customer problems.
            If you don't know something, suggest contacting human support.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('General help generation failed:', error);
      return "I'm here to help! You can ask me about products, orders, shipping, returns, or any other marketplace-related questions.";
    }
  }

  // Generate general response using conversation history
  async generateGeneralResponse(message, history) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a helpful customer service chatbot for an online marketplace.
          Be friendly, professional, and helpful. Keep responses concise.`
        }
      ];

      // Add conversation history
      history.slice(-5).forEach(h => {
        messages.push({ role: 'user', content: h.user });
        messages.push({ role: 'assistant', content: h.bot });
      });

      // Add current message
      messages.push({ role: 'user', content: message });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Response generation failed:', error);
      return "I understand you need help. Please try rephrasing your question or contact our support team.";
    }
  }

  // Get conversation history
  getConversationHistory(userId) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    return this.conversationHistory.get(userId);
  }

  // Update conversation history
  updateConversationHistory(userId, userMessage, botResponse) {
    const history = this.getConversationHistory(userId);
    history.push({
      user: userMessage,
      bot: botResponse,
      timestamp: new Date()
    });
    
    // Keep only last 20 messages
    if (history.length > 20) {
      history.shift();
    }
    
    this.conversationHistory.set(userId, history);
  }

  // Get suggested actions based on intent
  getSuggestedActions(intent) {
    const actions = {
      'product_search': [
        { label: 'View All Products', action: 'browse_products' },
        { label: 'Filter by Category', action: 'filter_category' },
        { label: 'Sort by Price', action: 'sort_price' }
      ],
      'order_status': [
        { label: 'Track Order', action: 'track_order' },
        { label: 'View All Orders', action: 'view_orders' },
        { label: 'Contact Seller', action: 'contact_seller' }
      ],
      'return_policy': [
        { label: 'Initiate Return', action: 'start_return' },
        { label: 'Check Return Status', action: 'return_status' },
        { label: 'Contact Support', action: 'contact_support' }
      ],
      'default': [
        { label: 'Browse Products', action: 'browse_products' },
        { label: 'View Orders', action: 'view_orders' },
        { label: 'Contact Support', action: 'contact_support' }
      ]
    };
    
    return actions[intent] || actions.default;
  }

  // Clear conversation history
  clearHistory(userId) {
    this.conversationHistory.delete(userId);
    return { success: true, message: 'Conversation history cleared' };
  }

  // Get chat statistics
  getChatStats() {
    return {
      activeConversations: this.conversationHistory.size,
      totalMemoryUsage: JSON.stringify([...this.conversationHistory]).length
    };
  }
}

export const chatbotService = new ChatbotService();
