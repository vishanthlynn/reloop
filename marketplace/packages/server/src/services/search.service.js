import { Product } from '../models/product.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import OpenAI from 'openai';

class SearchService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Advanced product search with filters
  async searchProducts({
    query,
    filters = {},
    sort = { createdAt: -1 },
    page = 1,
    limit = 20,
    userId
  }) {
    try {
      // Build search query
      const searchQuery = this.buildSearchQuery(query, filters);

      // Add user preferences if available
      if (userId) {
        await this.applyUserPreferences(searchQuery, userId);
      }

      // Execute search
      const products = await Product.find(searchQuery)
        .populate('seller', 'name avatar rating totalSales isVerified')
        .populate('category', 'name path')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Get total count
      const total = await Product.countDocuments(searchQuery);

      // Apply AI ranking if query exists
      let rankedProducts = products;
      if (query) {
        rankedProducts = await this.rankByRelevance(products, query);
      }

      // Get facets for filtering
      const facets = await this.getFacets(searchQuery);

      return {
        products: rankedProducts,
        page,
        totalPages: Math.ceil(total / limit),
        total,
        facets,
        appliedFilters: filters
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw new ApiError(500, 'Search failed');
    }
  }

  // Build search query from text and filters
  buildSearchQuery(query, filters) {
    const searchQuery = {
      status: 'available',
      isActive: true
    };

    // Text search
    if (query) {
      searchQuery.$or = [
        { title: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
        { tags: new RegExp(query, 'i') },
        { brand: new RegExp(query, 'i') }
      ];
    }

    // Category filter
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        searchQuery.category = { $in: filters.category };
      } else {
        searchQuery.category = filters.category;
      }
    }

    // Price range
    if (filters.minPrice || filters.maxPrice) {
      searchQuery.price = {};
      if (filters.minPrice) searchQuery.price.$gte = filters.minPrice;
      if (filters.maxPrice) searchQuery.price.$lte = filters.maxPrice;
    }

    // Condition
    if (filters.condition) {
      searchQuery.condition = filters.condition;
    }

    // Location
    if (filters.city) {
      searchQuery['location.city'] = new RegExp(filters.city, 'i');
    }
    if (filters.state) {
      searchQuery['location.state'] = new RegExp(filters.state, 'i');
    }
    if (filters.pincode) {
      searchQuery['location.pincode'] = filters.pincode;
    }

    // Seller filters
    if (filters.verifiedSellers) {
      searchQuery['seller.isVerified'] = true;
    }
    if (filters.minRating) {
      searchQuery['seller.rating'] = { $gte: filters.minRating };
    }

    // Listing type
    if (filters.listingType) {
      searchQuery.listingType = filters.listingType;
    }

    // Auction specific
    if (filters.auctionEnding) {
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + filters.auctionEnding);
      searchQuery.auctionEndDate = { $lte: endTime };
      searchQuery.listingType = 'auction';
    }

    // Shipping options
    if (filters.freeShipping) {
      searchQuery.freeShipping = true;
    }
    if (filters.localPickup) {
      searchQuery.localPickup = true;
    }

    // Date filters
    if (filters.postedWithin) {
      const date = new Date();
      date.setDate(date.getDate() - filters.postedWithin);
      searchQuery.createdAt = { $gte: date };
    }

    return searchQuery;
  }

  // Apply user preferences to search
  async applyUserPreferences(searchQuery, userId) {
    try {
      const user = await User.findById(userId).select('preferences searchHistory');
      
      if (!user || !user.preferences) return;

      // Apply location preference
      if (user.preferences.preferredLocation && !searchQuery['location.city']) {
        searchQuery['location.city'] = user.preferences.preferredLocation;
      }

      // Apply category preferences
      if (user.preferences.preferredCategories && !searchQuery.category) {
        searchQuery.category = { $in: user.preferences.preferredCategories };
      }
    } catch (error) {
      console.error('Failed to apply user preferences:', error);
    }
  }

  // Rank products by relevance using AI
  async rankByRelevance(products, query) {
    try {
      if (!products || products.length === 0) return products;

      const prompt = `
        Given the search query: "${query}"
        
        Rank these products by relevance (1 = most relevant):
        ${products.map((p, i) => `
          ${i + 1}. Title: ${p.title}
          Description: ${p.description.substring(0, 100)}
          Category: ${p.category?.name || 'N/A'}
          Price: ₹${p.price}
        `).join('\n')}
        
        Return a JSON array of product indices in order of relevance.
        Example: [3, 1, 5, 2, 4] means product 3 is most relevant.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a search relevance expert. Rank products based on how well they match the search query.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const ranking = JSON.parse(response.choices[0].message.content);
      
      if (ranking.indices && Array.isArray(ranking.indices)) {
        const rankedProducts = [];
        ranking.indices.forEach(index => {
          if (products[index - 1]) {
            rankedProducts.push(products[index - 1]);
          }
        });
        
        // Add any products that weren't ranked
        products.forEach(product => {
          if (!rankedProducts.includes(product)) {
            rankedProducts.push(product);
          }
        });
        
        return rankedProducts;
      }
      
      return products;
    } catch (error) {
      console.error('AI ranking failed:', error);
      return products; // Return original order if AI fails
    }
  }

  // Get facets for filtering
  async getFacets(baseQuery) {
    try {
      const facets = await Product.aggregate([
        { $match: baseQuery },
        {
          $facet: {
            categories: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            priceRanges: [
              {
                $bucket: {
                  groupBy: '$price',
                  boundaries: [0, 100, 500, 1000, 5000, 10000, 50000, 100000],
                  default: 'above_100000',
                  output: { count: { $sum: 1 } }
                }
              }
            ],
            conditions: [
              { $group: { _id: '$condition', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            brands: [
              { $group: { _id: '$brand', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 20 }
            ],
            locations: [
              { $group: { _id: '$location.city', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 15 }
            ]
          }
        }
      ]);

      return facets[0];
    } catch (error) {
      console.error('Failed to get facets:', error);
      return {};
    }
  }

  // Search suggestions (autocomplete)
  async getSearchSuggestions(query, limit = 10) {
    try {
      if (!query || query.length < 2) return [];

      // Get product title suggestions
      const titleSuggestions = await Product.find({
        title: new RegExp(query, 'i'),
        status: 'available'
      })
        .select('title')
        .limit(limit / 2)
        .distinct('title');

      // Get category suggestions
      const categorySuggestions = await Product.find({
        category: new RegExp(query, 'i'),
        status: 'available'
      })
        .select('category')
        .limit(limit / 2)
        .distinct('category');

      // Get popular searches from history
      const popularSearches = await this.getPopularSearches(query, limit / 2);

      // Combine and deduplicate
      const allSuggestions = [
        ...titleSuggestions,
        ...categorySuggestions,
        ...popularSearches
      ];

      const uniqueSuggestions = [...new Set(allSuggestions)];

      return uniqueSuggestions.slice(0, limit);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }

  // Get popular searches
  async getPopularSearches(query, limit = 5) {
    try {
      // In production, this would query a search history collection
      const popularSearches = [
        'iPhone',
        'laptop',
        'shoes',
        'watch',
        'headphones',
        'camera',
        'bike',
        'furniture',
        'books',
        'clothes'
      ];

      return popularSearches
        .filter(search => search.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  // Save search history
  async saveSearchHistory({ userId, query, filters, resultsCount }) {
    try {
      if (!userId) return;

      const user = await User.findById(userId);
      if (!user) return;

      // Add to search history
      if (!user.searchHistory) {
        user.searchHistory = [];
      }

      user.searchHistory.unshift({
        query,
        filters,
        resultsCount,
        timestamp: new Date()
      });

      // Keep only last 50 searches
      user.searchHistory = user.searchHistory.slice(0, 50);

      await user.save();
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }

  // Get trending searches
  async getTrendingSearches(limit = 10) {
    try {
      // In production, aggregate from search history
      const trending = [
        { query: 'iPhone 15', count: 1250, trend: 'up' },
        { query: 'gaming laptop', count: 980, trend: 'up' },
        { query: 'air jordan', count: 750, trend: 'stable' },
        { query: 'ps5', count: 620, trend: 'down' },
        { query: 'vintage camera', count: 450, trend: 'up' }
      ];

      return trending.slice(0, limit);
    } catch (error) {
      console.error('Failed to get trending searches:', error);
      return [];
    }
  }

  // Search sellers
  async searchSellers({ query, filters = {}, page = 1, limit = 20 }) {
    try {
      const searchQuery = {};

      if (query) {
        searchQuery.$or = [
          { name: new RegExp(query, 'i') },
          { bio: new RegExp(query, 'i') },
          { storeName: new RegExp(query, 'i') }
        ];
      }

      if (filters.isVerified) {
        searchQuery.isVerified = true;
      }

      if (filters.minRating) {
        searchQuery.rating = { $gte: filters.minRating };
      }

      if (filters.category) {
        searchQuery.specializations = filters.category;
      }

      const sellers = await User.find({
        ...searchQuery,
        role: 'seller',
        isActive: true
      })
        .select('name avatar bio storeName rating totalSales totalProducts isVerified createdAt')
        .sort({ totalSales: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments({
        ...searchQuery,
        role: 'seller',
        isActive: true
      });

      return {
        sellers,
        page,
        totalPages: Math.ceil(total / limit),
        total
      };
    } catch (error) {
      console.error('Seller search failed:', error);
      throw new ApiError(500, 'Failed to search sellers');
    }
  }

  // Similar products
  async getSimilarProducts(productId, limit = 10) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Find similar products based on category, price range, and tags
      const priceRange = {
        min: product.price * 0.7,
        max: product.price * 1.3
      };

      const similarProducts = await Product.find({
        _id: { $ne: productId },
        category: product.category,
        price: { $gte: priceRange.min, $lte: priceRange.max },
        status: 'available'
      })
        .populate('seller', 'name avatar rating')
        .limit(limit);

      // If not enough similar products, expand search
      if (similarProducts.length < limit) {
        const additionalProducts = await Product.find({
          _id: { $ne: productId, $nin: similarProducts.map(p => p._id) },
          category: product.category,
          status: 'available'
        })
          .populate('seller', 'name avatar rating')
          .limit(limit - similarProducts.length);

        similarProducts.push(...additionalProducts);
      }

      return similarProducts;
    } catch (error) {
      console.error('Failed to get similar products:', error);
      throw error;
    }
  }
}

export const searchService = new SearchService();
