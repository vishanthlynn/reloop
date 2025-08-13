const cron = require('node-cron');
const Product = require('../models/product.model');
const { LISTING_TYPES, AUCTION_STATUSES } = require('../utils/constants');

class AuctionJob {
  constructor(auctionHandler) {
    this.auctionHandler = auctionHandler;
  }

  start() {
    // Check for ended auctions every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.checkEndedAuctions();
      } catch (error) {
        console.error('Error in auction job:', error);
      }
    });

    // Clean up old auctions daily at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        await this.cleanupOldAuctions();
      } catch (error) {
        console.error('Error in auction cleanup:', error);
      }
    });

    console.log('Auction jobs started');
  }

  async checkEndedAuctions() {
    const now = new Date();
    
    // Find auctions that have ended
    const endedAuctions = await Product.find({
      listingType: LISTING_TYPES.AUCTION,
      'auction.status': AUCTION_STATUSES.ACTIVE,
      'auction.endTime': { $lte: now }
    });

    for (const auction of endedAuctions) {
      await this.auctionHandler.endAuction(auction._id);
    }
  }

  async cleanupOldAuctions() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Archive old ended auctions
    await Product.updateMany(
      {
        listingType: LISTING_TYPES.AUCTION,
        'auction.status': { $in: [AUCTION_STATUSES.ENDED, AUCTION_STATUSES.CANCELLED] },
        'auction.endTime': { $lt: thirtyDaysAgo }
      },
      {
        isActive: false
      }
    );

    console.log('Old auctions cleaned up');
  }
}

module.exports = AuctionJob;
