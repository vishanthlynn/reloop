import apiClient from './apiClient';

export const fetchProducts = async (params) => {
  const response = await apiClient.get('/products', { params });
  return response.data;
};

export const fetchProductById = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const createProductListing = async (productData) => {
  const response = await apiClient.post('/products', productData);
  return response.data;
};

export const updateProductListing = async (id, productData) => {
  const response = await apiClient.put(`/products/${id}`, productData);
  return response.data;
};

export const deleteProductListing = async (id) => {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
};

export const fetchMyProducts = async () => {
  const response = await apiClient.get('/products/my-products');
  return response.data;
};
