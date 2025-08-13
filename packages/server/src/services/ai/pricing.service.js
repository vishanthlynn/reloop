import OpenAI from 'openai';
import { Product } from '../../models/product.model.js';
import { ApiError } from '../../utils/ApiError.js';

class PricingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Get AI-suggested price for a product
  async getSuggestedPrice({ title, description, category, condition, brand }) {
    try {
      // Get similar products from database
      const similarProducts = await this.findSimilarProducts({
        category,
        condition,
        brand
      });

      // Calculate market statistics
      const marketStats = this.calculateMarketStats(similarProducts);

      // Get AI recommendation
      const prompt = `
        Analyze the following product and suggest a competitive price in INR:
        
        Product Details:
        - Title: ${title}
        - Description: ${description}
        - Category: ${category}
        - Condition: ${condition}
        - Brand: ${brand || 'Generic'}
        
        Market Analysis:
        - Average Price: ₹${marketStats.average}
        - Price Range: ₹${marketStats.min} - ₹${marketStats.max}
        - Total Similar Products: ${marketStats.count}
        
        Provide a JSON response with:
        1. suggested_price: The recommended price in INR
        2. price_range: {min, max} for acceptable price range
        3. confidence: High/Medium/Low
        4. reasoning: Brief explanation for the suggestion
        5. market_position: Premium/Competitive/Budget
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a pricing expert for an online marketplace in India. Provide accurate pricing suggestions based on market data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const suggestion = JSON.parse(response.choices[0].message.content);

      return {
        suggestedPrice: suggestion.suggested_price,
        priceRange: suggestion.price_range,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        marketPosition: suggestion.market_position,
        marketStats
      };
    } catch (error) {
      console.error('Price suggestion failed:', error);
      
      // Fallback to basic calculation if AI fails
      const similarProducts = await this.findSimilarProducts({ category, condition });
      const marketStats = this.calculateMarketStats(similarProducts);
      
      return {
        suggestedPrice: marketStats.average || 0,
        priceRange: {
          min: marketStats.min || 0,
          max: marketStats.max || 0
        },
        confidence: 'Low',
        reasoning: 'Based on average market price',
        marketPosition: 'Competitive',
        marketStats
      };
    }
  }

  // Find similar products for comparison
  async findSimilarProducts({ category, condition, brand, limit = 50 }) {
    const query = {
      category,
      status: 'available'
    };

    if (condition) {
      query.condition = condition;
    }

    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }

    const products = await Product.find(query)
      .select('price title condition createdAt')
      .sort('-createdAt')
      .limit(limit);

    return products;
  }

  // Calculate market statistics
  calculateMarketStats(products) {
    if (!products || products.length === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        count: 0
      };
    }

    const prices = products.map(p => p.price).sort((a, b) => a - b);
    const sum = prices.reduce((acc, price) => acc + price, 0);
    const average = Math.round(sum / prices.length);
    const median = prices[Math.floor(prices.length / 2)];

    return {
      average,
      median,
      min: prices[0],
      max: prices[prices.length - 1],
      count: prices.length
    };
  }

  // Analyze price trends
  async analyzePriceTrends({ category, period = 30 }) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const products = await Product.aggregate([
        {
          $match: {
            category,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Calculate trend
      const trend = this.calculateTrend(products);

      return {
        period,
        dataPoints: products,
        trend,
        summary: {
          averagePrice: products.reduce((acc, p) => acc + p.avgPrice, 0) / products.length,
          totalListings: products.reduce((acc, p) => acc + p.count, 0),
          priceDirection: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
        }
      };
    } catch (error) {
      console.error('Price trend analysis failed:', error);
      throw new ApiError(500, 'Failed to analyze price trends');
    }
  }

  // Calculate price trend
  calculateTrend(dataPoints) {
    if (dataPoints.length < 2) return 0;

    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    dataPoints.forEach((point, index) => {
      sumX += index;
      sumY += point.avgPrice;
      sumXY += index * point.avgPrice;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  // Get dynamic pricing for auctions
  async getDynamicAuctionPrice({ productId, currentBid, bidHistory }) {
    try {
      const product = await Product.findById(productId);
      
      // Calculate bid velocity
      const bidVelocity = this.calculateBidVelocity(bidHistory);
      
      // Get time remaining
      const timeRemaining = product.auctionEndDate - new Date();
      const hoursRemaining = timeRemaining / (1000 * 60 * 60);
      
      // Calculate suggested increment
      let suggestedIncrement;
      if (hoursRemaining < 1) {
        // Last hour - smaller increments
        suggestedIncrement = currentBid * 0.02; // 2%
      } else if (hoursRemaining < 24) {
        // Last day - moderate increments
        suggestedIncrement = currentBid * 0.05; // 5%
      } else {
        // More time - standard increments
        suggestedIncrement = currentBid * 0.10; // 10%
      }

      // Adjust based on bid velocity
      if (bidVelocity > 5) {
        suggestedIncrement *= 1.5; // Increase if high competition
      }

      return {
        currentBid,
        suggestedBid: Math.round(currentBid + suggestedIncrement),
        minimumIncrement: Math.round(currentBid * 0.01), // 1% minimum
        bidVelocity,
        hoursRemaining: Math.round(hoursRemaining),
        competitionLevel: bidVelocity > 5 ? 'High' : bidVelocity > 2 ? 'Medium' : 'Low'
      };
    } catch (error) {
      console.error('Dynamic auction pricing failed:', error);
      throw new ApiError(500, 'Failed to calculate auction pricing');
    }
  }

  // Calculate bid velocity (bids per hour)
  calculateBidVelocity(bidHistory) {
    if (!bidHistory || bidHistory.length < 2) return 0;

    const recentBids = bidHistory.slice(-10); // Last 10 bids
    const timeSpan = recentBids[recentBids.length - 1].timestamp - recentBids[0].timestamp;
    const hoursSpan = timeSpan / (1000 * 60 * 60);

    return hoursSpan > 0 ? recentBids.length / hoursSpan : 0;
  }

  // Validate price against market
  async validatePrice({ productId, price, category, condition }) {
    try {
      const marketStats = await this.getMarketStats({ category, condition });
      
      const priceRatio = price / marketStats.average;
      let validation = {
        isValid: true,
        warnings: [],
        suggestions: []
      };

      if (priceRatio > 2) {
        validation.warnings.push('Price is significantly above market average');
        validation.suggestions.push(`Consider pricing closer to ₹${marketStats.average}`);
      } else if (priceRatio < 0.3) {
        validation.warnings.push('Price seems unusually low');
        validation.suggestions.push('Verify if the price is correct to avoid suspicion');
      }

      if (price > marketStats.max * 1.5) {
        validation.warnings.push('Price exceeds highest market price by 50%');
      }

      validation.marketComparison = {
        yourPrice: price,
        marketAverage: marketStats.average,
        marketRange: `₹${marketStats.min} - ₹${marketStats.max}`,
        percentDifference: Math.round((priceRatio - 1) * 100)
      };

      return validation;
    } catch (error) {
      console.error('Price validation failed:', error);
      return {
        isValid: true,
        warnings: [],
        suggestions: [],
        error: 'Could not validate price against market'
      };
    }
  }

  // Get market statistics
  async getMarketStats({ category, condition }) {
    const products = await this.findSimilarProducts({ category, condition });
    return this.calculateMarketStats(products);
  }
}

export const pricingService = new PricingService();
