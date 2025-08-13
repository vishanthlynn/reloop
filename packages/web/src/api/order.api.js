import apiClient from './apiClient';

export const createOrder = async (orderData) => {
  const response = await apiClient.post('/orders', orderData);
  return response.data;
};

export const fetchOrderById = async (id) => {
  const response = await apiClient.get(`/orders/${id}`);
  return response.data;
};

export const fetchMyOrders = async () => {
  const response = await apiClient.get('/orders/my-orders');
  return response.data;
};

export const cancelOrder = async (id) => {
  const response = await apiClient.post(`/orders/${id}/cancel`);
  return response.data;
};
