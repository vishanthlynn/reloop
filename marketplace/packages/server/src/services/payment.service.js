const Razorpay = require('razorpay');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  // Create payment intent for escrow
  async createPaymentIntent({ amount, orderId, customerId, currency = 'INR' }) {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: `order_${orderId}`,
        payment_capture: 0, // Manual capture for escrow
        notes: {
          orderId: orderId.toString(),
          customerId: customerId.toString(),
          type: 'marketplace_order'
        }
      };

      const order = await this.razorpay.orders.create(options);
      
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        orderId: orderId
      };
    } catch (error) {
      console.error('Payment intent creation failed:', error);
      throw new ApiError(500, 'Failed to create payment intent');
    }
  }

  // Verify payment signature
  async verifyPayment({ paymentId, orderId, amount, signature }) {
    try {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        return { success: false, message: 'Invalid payment signature' };
      }

      // Fetch payment details
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      if (payment.amount !== Math.round(amount * 100)) {
        return { success: false, message: 'Payment amount mismatch' };
      }

      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        // Capture the payment for escrow
        await this.razorpay.payments.capture(paymentId, payment.amount);
      }

      return {
        success: true,
        paymentId,
        amount: payment.amount / 100,
        status: payment.status,
        method: payment.method
      };
    } catch (error) {
      console.error('Payment verification failed:', error);
      return { success: false, message: 'Payment verification failed' };
    }
  }

  // Release payment from escrow to seller
  async releasePayment({ orderId, sellerId, amount }) {
    try {
      // In production, this would transfer funds to seller's account
      // For now, we'll simulate the transfer
      const transfer = {
        orderId,
        sellerId,
        amount,
        status: 'completed',
        transferredAt: new Date()
      };

      // Log the transfer for accounting
      console.log('Payment released:', transfer);

      return transfer;
    } catch (error) {
      console.error('Payment release failed:', error);
      throw new ApiError(500, 'Failed to release payment');
    }
  }

  // Process refund
  async refund({ orderId, amount, reason = 'Order cancelled' }) {
    try {
      // In production, this would process actual refund
      const refund = {
        orderId,
        amount,
        reason,
        status: 'processed',
        refundedAt: new Date()
      };

      console.log('Refund processed:', refund);

      return refund;
    } catch (error) {
      console.error('Refund failed:', error);
      throw new ApiError(500, 'Failed to process refund');
    }
  }

  // Create payout to seller
  async createPayout({ sellerId, amount, accountDetails }) {
    try {
      const payout = await this.razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        amount: Math.round(amount * 100),
        currency: 'INR',
        mode: accountDetails.mode || 'UPI',
        purpose: 'payout',
        fund_account: {
          account_type: accountDetails.type || 'bank_account',
          bank_account: accountDetails.bankAccount || null,
          vpa: accountDetails.vpa || null,
          contact: {
            name: accountDetails.name,
            email: accountDetails.email,
            contact: accountDetails.phone,
            type: 'vendor',
            reference_id: sellerId.toString()
          }
        },
        queue_if_low_balance: true,
        notes: {
          sellerId: sellerId.toString(),
          type: 'seller_payout'
        }
      });

      return {
        id: payout.id,
        amount: payout.amount / 100,
        status: payout.status,
        sellerId
      };
    } catch (error) {
      console.error('Payout creation failed:', error);
      throw new ApiError(500, 'Failed to create payout');
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      return {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        createdAt: new Date(payment.created_at * 1000)
      };
    } catch (error) {
      console.error('Failed to fetch payment details:', error);
      throw new ApiError(500, 'Failed to fetch payment details');
    }
  }

  // Calculate platform commission
  calculateCommission(amount, commissionRate = 0.05) {
    const commission = amount * commissionRate;
    const sellerAmount = amount - commission;
    
    return {
      totalAmount: amount,
      commission: Math.round(commission * 100) / 100,
      sellerAmount: Math.round(sellerAmount * 100) / 100,
      commissionRate: commissionRate * 100
    };
  }

  // Validate UPI ID
  async validateUPI(vpa) {
    try {
      // In production, this would validate with actual UPI service
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
      return upiRegex.test(vpa);
    } catch (error) {
      console.error('UPI validation failed:', error);
      return false;
    }
  }

  // Create subscription for featured listings
  async createSubscription({ sellerId, planId }) {
    try {
      const subscription = await this.razorpay.subscriptions.create({
        plan_id: planId,
        customer_notify: 1,
        total_count: 12, // 12 months
        notes: {
          sellerId: sellerId.toString(),
          type: 'featured_listing'
        }
      });

      return {
        id: subscription.id,
        planId: subscription.plan_id,
        status: subscription.status,
        sellerId
      };
    } catch (error) {
      console.error('Subscription creation failed:', error);
      throw new ApiError(500, 'Failed to create subscription');
    }
  }

  // Handle webhook events
  async handleWebhook(event, signature) {
    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(event))
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new ApiError(400, 'Invalid webhook signature');
      }

      // Process different event types
      switch (event.event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(event.payload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event.payload.payment.entity);
          break;
        case 'refund.processed':
          await this.handleRefundProcessed(event.payload.refund.entity);
          break;
        case 'payout.processed':
          await this.handlePayoutProcessed(event.payload.payout.entity);
          break;
        default:
          console.log('Unhandled webhook event:', event.event);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  // Handle payment captured event
  async handlePaymentCaptured(payment) {
    // Update order payment status in database
    console.log('Payment captured:', payment.id);
  }

  // Handle payment failed event
  async handlePaymentFailed(payment) {
    // Update order status and notify user
    console.log('Payment failed:', payment.id);
  }

  // Handle refund processed event
  async handleRefundProcessed(refund) {
    // Update order refund status
    console.log('Refund processed:', refund.id);
  }

  // Handle payout processed event
  async handlePayoutProcessed(payout) {
    // Update seller payout status
    console.log('Payout processed:', payout.id);
  }
}

export const paymentService = new PaymentService();
