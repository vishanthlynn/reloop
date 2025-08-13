import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error);
      }
    );
  }

  // Auth endpoints
  async login(credentials) {
    const response = await this.client.post('/auth/login', credentials);
    if (response.token) {
      localStorage.setItem('authToken', response.token);
    }
    return response;
  }

  async register(userData) {
    const response = await this.client.post('/auth/register', userData);
    if (response.token) {
      localStorage.setItem('authToken', response.token);
    }
    return response;
  }

  async logout() {
    localStorage.removeItem('authToken');
    return { success: true };
  }

  // Product endpoints
  async getProducts(params = {}) {
    return this.client.get('/products', { params });
  }

  async getProduct(id) {
    return this.client.get(`/products/${id}`);
  }

  async createProduct(productData) {
    return this.client.post('/products', productData);
  }

  async updateProduct(id, productData) {
    return this.client.put(`/products/${id}`, productData);
  }

  async deleteProduct(id) {
    return this.client.delete(`/products/${id}`);
  }

  async searchProducts(query, filters = {}) {
    return this.client.post('/products/search', { query, filters });
  }

  // Order endpoints
  async createOrder(orderData) {
    return this.client.post('/orders', orderData);
  }

  async getOrders(params = {}) {
    return this.client.get('/orders', { params });
  }

  async getOrder(id) {
    return this.client.get(`/orders/${id}`);
  }

  async updateOrderStatus(id, status) {
    return this.client.patch(`/orders/${id}/status`, { status });
  }

  async cancelOrder(id, reason) {
    return this.client.post(`/orders/${id}/cancel`, { reason });
  }

  // Payment endpoints
  async createPaymentIntent(orderData) {
    return this.client.post('/payments/create-intent', orderData);
  }

  async verifyPayment(paymentData) {
    return this.client.post('/payments/verify', paymentData);
  }

  // Chat endpoints
  async getConversations() {
    return this.client.get('/chat/conversations');
  }

  async getMessages(conversationId, params = {}) {
    return this.client.get(`/chat/conversations/${conversationId}/messages`, { params });
  }

  async sendMessage(conversationId, message) {
    return this.client.post(`/chat/conversations/${conversationId}/messages`, { message });
  }

  // User endpoints
  async getProfile(userId) {
    return this.client.get(`/users/${userId || 'me'}`);
  }

  async updateProfile(userData) {
    return this.client.put('/users/me', userData);
  }

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.client.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  // KYC endpoints
  async initiateKYC(kycData) {
    return this.client.post('/kyc/initiate', kycData);
  }

  async verifyKYCOTP(otpData) {
    return this.client.post('/kyc/verify-otp', otpData);
  }

  async getKYCStatus() {
    return this.client.get('/kyc/status');
  }

  // Review endpoints
  async createReview(reviewData) {
    return this.client.post('/reviews', reviewData);
  }

  async getReviews(productId, params = {}) {
    return this.client.get(`/products/${productId}/reviews`, { params });
  }

  // Notification endpoints
  async getNotifications(params = {}) {
    return this.client.get('/notifications', { params });
  }

  async markNotificationRead(id) {
    return this.client.patch(`/notifications/${id}/read`);
  }

  async markAllNotificationsRead() {
    return this.client.patch('/notifications/read-all');
  }

  // AI Services
  async getSuggestedPrice(productData) {
    return this.client.post('/ai/pricing/suggest', productData);
  }

  async categorizeProduct(productData) {
    return this.client.post('/ai/categorize', productData);
  }

  async chatbotMessage(message) {
    return this.client.post('/ai/chatbot', { message });
  }

  // Search suggestions
  async getSearchSuggestions(query) {
    return this.client.get('/search/suggestions', { params: { query } });
  }

  // File upload
  async uploadFile(file, type = 'product') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.client.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}

export default new ApiService();
