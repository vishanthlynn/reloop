import axios from 'axios';
import { API_BASE_URL } from '../config';

class ProductService {
  async getProducts(params = {}) {
    const response = await axios.get(`${API_BASE_URL}/products`, { params });
    return response.data;
  }

  async getProductById(id) {
    const response = await axios.get(`${API_BASE_URL}/products/${id}`);
    return response.data.product;
  }

  async createProduct(productData) {
    const formData = new FormData();
    
    // Add product fields
    Object.keys(productData).forEach(key => {
      if (key === 'images') {
        productData.images.forEach(image => {
          formData.append('images', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.name || 'photo.jpg',
          });
        });
      } else if (typeof productData[key] === 'object') {
        formData.append(key, JSON.stringify(productData[key]));
      } else {
        formData.append(key, productData[key]);
      }
    });

    const response = await axios.post(`${API_BASE_URL}/products`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.product;
  }

  async updateProduct(id, updates) {
    const formData = new FormData();
    
    Object.keys(updates).forEach(key => {
      if (key === 'images') {
        updates.images.forEach(image => {
          if (image.uri) {
            formData.append('images', {
              uri: image.uri,
              type: image.type || 'image/jpeg',
              name: image.name || 'photo.jpg',
            });
          }
        });
      } else if (typeof updates[key] === 'object') {
        formData.append(key, JSON.stringify(updates[key]));
      } else {
        formData.append(key, updates[key]);
      }
    });

    const response = await axios.patch(`${API_BASE_URL}/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.product;
  }

  async deleteProduct(id) {
    const response = await axios.delete(`${API_BASE_URL}/products/${id}`);
    return response.data;
  }

  async getUserProducts(userId) {
    const response = await axios.get(`${API_BASE_URL}/products/user/${userId}`);
    return response.data.products;
  }

  async searchProducts(query, filters = {}) {
    const response = await axios.get(`${API_BASE_URL}/products/search`, {
      params: { q: query, ...filters },
    });
    return response.data;
  }

  async getCategories() {
    const response = await axios.get(`${API_BASE_URL}/categories`);
    return response.data.categories;
  }

  async toggleFavorite(productId) {
    const response = await axios.post(`${API_BASE_URL}/products/${productId}/favorite`);
    return response.data;
  }

  async getFavorites() {
    const response = await axios.get(`${API_BASE_URL}/products/favorites`);
    return response.data.products;
  }

  async reportProduct(productId, reason, details) {
    const response = await axios.post(`${API_BASE_URL}/products/${productId}/report`, {
      reason,
      details,
    });
    return response.data;
  }

  async placeBid(productId, amount) {
    const response = await axios.post(`${API_BASE_URL}/products/${productId}/bid`, {
      amount,
    });
    return response.data;
  }

  async getBidHistory(productId) {
    const response = await axios.get(`${API_BASE_URL}/products/${productId}/bids`);
    return response.data.bids;
  }
}

export const productService = new ProductService();
