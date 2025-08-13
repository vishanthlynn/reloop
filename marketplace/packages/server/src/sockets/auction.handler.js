const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { AUCTION_STATUSES } = require('../utils/constants');

class AuctionHandler {
  constructor(io) {
    this.io = io;
    this.auctionRooms = new Map();
  }

  handleConnection(socket) {
    console.log(`User ${socket.userId} connected to auction`);

    // Join auction room
    socket.on('join_auction', async (productId) => {
      try {
        const product = await Product.findById(productId);
        if (!product || product.listingType !== 'auction') {
          socket.emit('error', { message: 'Invalid auction' });
          return;
        }

        const roomName = `auction_${productId}`;
        socket.join(roomName);
        
        // Send current auction state
        socket.emit('auction_state', {
          productId,
          currentBid: product.auction.currentBid,
          totalBids: product.auction.totalBids,
          highestBidder: product.auction.highestBidder,
          endTime: product.auction.endTime,
          status: product.auction.status
        });

        // Track active users in auction
        if (!this.auctionRooms.has(roomName)) {
          this.auctionRooms.set(roomName, new Set());
        }
        this.auctionRooms.get(roomName).add(socket.userId);

        // Notify others
        socket.to(roomName).emit('user_joined', {
          userId: socket.userId,
          activeUsers: this.auctionRooms.get(roomName).size
        });
      } catch (error) {
        console.error('Error joining auction:', error);
        socket.emit('error', { message: 'Failed to join auction' });
      }
    });

    // Leave auction room
    socket.on('leave_auction', (productId) => {
      const roomName = `auction_${productId}`;
      socket.leave(roomName);
      
      if (this.auctionRooms.has(roomName)) {
        this.auctionRooms.get(roomName).delete(socket.userId);
        
        socket.to(roomName).emit('user_left', {
          userId: socket.userId,
          activeUsers: this.auctionRooms.get(roomName).size
        });
      }
    });

    // Place bid
    socket.on('place_bid', async ({ productId, bidAmount }) => {
      try {
        const product = await Product.findById(productId);
        
        if (!product || product.listingType !== 'auction') {
          socket.emit('bid_error', { message: 'Invalid auction' });
          return;
        }

        // Validate bid
        const minBid = product.auction.currentBid + product.auction.bidIncrement;
        if (bidAmount < minBid) {
          socket.emit('bid_error', { 
            message: `Minimum bid is ₹${minBid}` 
          });
          return;
        }

        // Check auction status
        const now = new Date();
        if (now > product.auction.endTime || product.auction.status !== AUCTION_STATUSES.ACTIVE) {
          socket.emit('bid_error', { message: 'Auction has ended' });
          return;
        }

        // Update auction
        product.auction.currentBid = bidAmount;
        product.auction.highestBidder = socket.userId;
        product.auction.totalBids += 1;

        // Add bid history
        if (!product.auction.bidHistory) {
          product.auction.bidHistory = [];
        }
        product.auction.bidHistory.push({
          bidder: socket.userId,
          amount: bidAmount,
          timestamp: new Date()
        });

        await product.save();

        // Notify all users in auction room
        const roomName = `auction_${productId}`;
        this.io.to(roomName).emit('new_bid', {
          productId,
          bidAmount,
          bidderId: socket.userId,
          totalBids: product.auction.totalBids,
          timestamp: new Date()
        });

        // Send confirmation to bidder
        socket.emit('bid_success', {
          productId,
          bidAmount,
          message: 'Bid placed successfully'
        });

        // Extend auction if bid placed in last 2 minutes
        const timeRemaining = product.auction.endTime - now;
        if (timeRemaining < 120000) { // 2 minutes
          product.auction.endTime = new Date(now.getTime() + 120000);
          await product.save();
          
          this.io.to(roomName).emit('auction_extended', {
            productId,
            newEndTime: product.auction.endTime
          });
        }
      } catch (error) {
        console.error('Error placing bid:', error);
        socket.emit('bid_error', { message: 'Failed to place bid' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Remove user from all auction rooms
      this.auctionRooms.forEach((users, roomName) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          socket.to(roomName).emit('user_left', {
            userId: socket.userId,
            activeUsers: users.size
          });
        }
      });
    });
  }

  // End auction (called by cron job)
  async endAuction(productId) {
    try {
      const product = await Product.findById(productId).populate('auction.highestBidder');
      
      if (!product || product.auction.status !== AUCTION_STATUSES.ACTIVE) {
        return;
      }

      product.auction.status = AUCTION_STATUSES.ENDED;
      
      // Check if reserve price was met
      if (product.auction.reservePrice && product.auction.currentBid < product.auction.reservePrice) {
        product.auction.status = AUCTION_STATUSES.CANCELLED;
        await product.save();
        
        // Notify users
        const roomName = `auction_${productId}`;
        this.io.to(roomName).emit('auction_ended', {
          productId,
          status: 'reserve_not_met',
          finalBid: product.auction.currentBid
        });
        return;
      }

      // Mark as sold if there was a winner
      if (product.auction.highestBidder) {
        product.isSold = true;
        product.soldTo = product.auction.highestBidder._id;
        product.soldAt = new Date();
        
        // Create order
        const order = await Order.create({
          buyer: product.auction.highestBidder._id,
          seller: product.seller,
          product: product._id,
          amount: product.auction.currentBid,
          paymentMethod: 'pending',
          status: 'payment_pending'
        });

        await product.save();

        // Notify winner and others
        const roomName = `auction_${productId}`;
        this.io.to(roomName).emit('auction_ended', {
          productId,
          status: 'sold',
          winner: product.auction.highestBidder._id,
          finalBid: product.auction.currentBid,
          orderId: order._id
        });
      } else {
        await product.save();
        
        const roomName = `auction_${productId}`;
        this.io.to(roomName).emit('auction_ended', {
          productId,
          status: 'no_bids'
        });
      }
    } catch (error) {
      console.error('Error ending auction:', error);
    }
  }
}

module.exports = AuctionHandler;
