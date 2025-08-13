import axios from 'axios';
import { ApiError } from '../utils/ApiError.js';

class ShippingService {
  constructor() {
    this.shiprocketBaseUrl = 'https://apiv2.shiprocket.in/v1/external';
    this.shiprocketToken = null;
    this.tokenExpiry = null;
  }

  // Authenticate with Shiprocket
  async authenticate() {
    try {
      if (this.shiprocketToken && this.tokenExpiry > Date.now()) {
        return this.shiprocketToken;
      }

      const response = await axios.post(`${this.shiprocketBaseUrl}/auth/login`, {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD
      });

      this.shiprocketToken = response.data.token;
      this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

      return this.shiprocketToken;
    } catch (error) {
      console.error('Shiprocket authentication failed:', error);
      throw new ApiError(500, 'Shipping service authentication failed');
    }
  }

  // Create shipment
  async createShipment({ orderId, orderDetails, pickup, delivery }) {
    try {
      const token = await this.authenticate();

      const shipmentData = {
        order_id: orderId.toString(),
        order_date: new Date().toISOString(),
        pickup_location: pickup.location || 'Primary',
        channel_id: process.env.SHIPROCKET_CHANNEL_ID,
        comment: orderDetails.comment || '',
        billing_customer_name: delivery.name,
        billing_last_name: '',
        billing_address: delivery.addressLine1,
        billing_address_2: delivery.addressLine2 || '',
        billing_city: delivery.city,
        billing_pincode: delivery.pincode,
        billing_state: delivery.state,
        billing_country: 'India',
        billing_email: delivery.email,
        billing_phone: delivery.phone,
        shipping_is_billing: true,
        order_items: orderDetails.items.map(item => ({
          name: item.name,
          sku: item.sku || item.id,
          units: item.quantity,
          selling_price: item.price,
          discount: item.discount || 0,
          tax: item.tax || 0,
          hsn: item.hsn || ''
        })),
        payment_method: orderDetails.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        shipping_charges: orderDetails.shippingCharges || 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: orderDetails.discount || 0,
        sub_total: orderDetails.subtotal,
        length: orderDetails.dimensions?.length || 10,
        breadth: orderDetails.dimensions?.breadth || 10,
        height: orderDetails.dimensions?.height || 10,
        weight: orderDetails.weight || 0.5
      };

      const response = await axios.post(
        `${this.shiprocketBaseUrl}/orders/create/adhoc`,
        shipmentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        id: response.data.order_id,
        shipmentId: response.data.shipment_id,
        status: response.data.status,
        courier: response.data.courier_name,
        trackingNumber: response.data.awb,
        label: response.data.label_url
      };
    } catch (error) {
      console.error('Shipment creation failed:', error);
      throw new ApiError(500, 'Failed to create shipment');
    }
  }

  // Get tracking information
  async getTracking({ trackingNumber, courier }) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.shiprocketBaseUrl}/courier/track/awb/${trackingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const tracking = response.data.tracking_data;

      return {
        trackingNumber,
        courier: tracking.courier_name,
        currentStatus: tracking.current_status,
        shipmentTrack: tracking.shipment_track.map(track => ({
          date: track.date,
          status: track.status,
          location: track.location,
          activity: track.activity
        })),
        deliveryDate: tracking.edd,
        origin: tracking.origin,
        destination: tracking.destination,
        isDelivered: tracking.delivered,
        deliveredDate: tracking.delivered_date
      };
    } catch (error) {
      console.error('Tracking fetch failed:', error);
      throw new ApiError(500, 'Failed to fetch tracking information');
    }
  }

  // Calculate shipping rates
  async calculateShippingRates({ pickup, delivery, weight, dimensions, cod = false }) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(`${this.shiprocketBaseUrl}/courier/serviceability/`, {
        params: {
          pickup_postcode: pickup.pincode,
          delivery_postcode: delivery.pincode,
          cod: cod ? 1 : 0,
          weight: weight || 0.5,
          length: dimensions?.length || 10,
          breadth: dimensions?.breadth || 10,
          height: dimensions?.height || 10
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const couriers = response.data.data.available_courier_companies;

      return couriers.map(courier => ({
        id: courier.courier_company_id,
        name: courier.courier_name,
        rate: courier.rate,
        estimatedDelivery: courier.estimated_delivery_days,
        cod: courier.cod === 1,
        pickupAvailable: courier.pickup_availability === 'yes',
        rating: courier.rating || 0
      })).sort((a, b) => a.rate - b.rate);
    } catch (error) {
      console.error('Shipping rate calculation failed:', error);
      throw new ApiError(500, 'Failed to calculate shipping rates');
    }
  }

  // Cancel shipment
  async cancelShipment({ shipmentId, reason }) {
    try {
      const token = await this.authenticate();

      const response = await axios.post(
        `${this.shiprocketBaseUrl}/orders/cancel`,
        {
          ids: [shipmentId],
          reason: reason || 'Order cancelled by customer'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data.status === 200,
        message: response.data.message
      };
    } catch (error) {
      console.error('Shipment cancellation failed:', error);
      throw new ApiError(500, 'Failed to cancel shipment');
    }
  }

  // Schedule pickup
  async schedulePickup({ shipmentId, pickupDate }) {
    try {
      const token = await this.authenticate();

      const response = await axios.post(
        `${this.shiprocketBaseUrl}/courier/generate/pickup`,
        {
          shipment_id: [shipmentId],
          pickup_date: pickupDate || new Date().toISOString().split('T')[0]
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data.pickup_status === 1,
        pickupTokenNumber: response.data.pickup_token_number,
        pickupScheduledDate: response.data.pickup_scheduled_date,
        message: response.data.message
      };
    } catch (error) {
      console.error('Pickup scheduling failed:', error);
      throw new ApiError(500, 'Failed to schedule pickup');
    }
  }

  // Generate shipping label
  async generateLabel({ shipmentId }) {
    try {
      const token = await this.authenticate();

      const response = await axios.post(
        `${this.shiprocketBaseUrl}/courier/generate/label`,
        {
          shipment_id: [shipmentId]
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data.label_created === 1,
        labelUrl: response.data.label_url,
        message: response.data.message
      };
    } catch (error) {
      console.error('Label generation failed:', error);
      throw new ApiError(500, 'Failed to generate shipping label');
    }
  }

  // Get return/RTO charges
  async getReturnCharges({ orderId }) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.shiprocketBaseUrl}/orders/rto-charges/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        rtoCharges: response.data.rto_charges,
        currency: 'INR'
      };
    } catch (error) {
      console.error('RTO charges fetch failed:', error);
      throw new ApiError(500, 'Failed to fetch return charges');
    }
  }

  // Check serviceability
  async checkServiceability({ pickup, delivery }) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.shiprocketBaseUrl}/courier/serviceability/`,
        {
          params: {
            pickup_postcode: pickup.pincode,
            delivery_postcode: delivery.pincode
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        serviceable: response.data.status === 200,
        availableCouriers: response.data.data?.available_courier_companies?.length || 0,
        estimatedDelivery: response.data.data?.available_courier_companies?.[0]?.estimated_delivery_days || null
      };
    } catch (error) {
      console.error('Serviceability check failed:', error);
      return {
        serviceable: false,
        availableCouriers: 0,
        estimatedDelivery: null
      };
    }
  }

  // Create return order
  async createReturn({ orderId, reason, items }) {
    try {
      const token = await this.authenticate();

      const response = await axios.post(
        `${this.shiprocketBaseUrl}/orders/create/return`,
        {
          order_id: orderId,
          order_date: new Date().toISOString(),
          channel_id: process.env.SHIPROCKET_CHANNEL_ID,
          pickup_customer_name: items[0].customerName,
          pickup_address: items[0].address,
          pickup_city: items[0].city,
          pickup_state: items[0].state,
          pickup_country: 'India',
          pickup_pincode: items[0].pincode,
          pickup_email: items[0].email,
          pickup_phone: items[0].phone,
          return_reason: reason,
          order_items: items.map(item => ({
            name: item.name,
            sku: item.sku,
            units: item.quantity,
            selling_price: item.price,
            qc_enable: true,
            qc_product_name: item.name
          }))
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        returnId: response.data.return_id,
        shipmentId: response.data.shipment_id,
        status: response.data.status,
        message: response.data.message
      };
    } catch (error) {
      console.error('Return creation failed:', error);
      throw new ApiError(500, 'Failed to create return order');
    }
  }
}

export const shippingService = new ShippingService();
