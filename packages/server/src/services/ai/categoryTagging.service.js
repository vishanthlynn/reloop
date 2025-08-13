import OpenAI from 'openai';
import { ApiError } from '../../utils/ApiError.js';

class CategoryTaggingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Define category hierarchy
    this.categories = {
      'Electronics': {
        subcategories: ['Mobile Phones', 'Laptops', 'Tablets', 'Cameras', 'Audio', 'Gaming', 'Accessories'],
        keywords: ['phone', 'laptop', 'computer', 'camera', 'headphone', 'speaker', 'console', 'charger']
      },
      'Fashion': {
        subcategories: ['Men', 'Women', 'Kids', 'Shoes', 'Bags', 'Watches', 'Jewelry'],
        keywords: ['shirt', 'dress', 'jeans', 'shoes', 'bag', 'watch', 'necklace', 'clothing']
      },
      'Home & Living': {
        subcategories: ['Furniture', 'Decor', 'Kitchen', 'Bedding', 'Lighting', 'Storage'],
        keywords: ['sofa', 'table', 'chair', 'bed', 'lamp', 'curtain', 'mattress', 'shelf']
      },
      'Books & Media': {
        subcategories: ['Fiction', 'Non-Fiction', 'Educational', 'Comics', 'Movies', 'Music'],
        keywords: ['book', 'novel', 'textbook', 'comic', 'dvd', 'cd', 'magazine']
      },
      'Sports & Fitness': {
        subcategories: ['Equipment', 'Clothing', 'Footwear', 'Supplements', 'Outdoor'],
        keywords: ['gym', 'fitness', 'sports', 'exercise', 'yoga', 'running', 'cycling']
      },
      'Vehicles': {
        subcategories: ['Cars', 'Bikes', 'Scooters', 'Parts', 'Accessories'],
        keywords: ['car', 'bike', 'motorcycle', 'scooter', 'vehicle', 'auto', 'parts']
      },
      'Beauty & Health': {
        subcategories: ['Skincare', 'Makeup', 'Hair Care', 'Health', 'Personal Care'],
        keywords: ['cosmetic', 'makeup', 'skincare', 'perfume', 'health', 'medicine', 'vitamin']
      },
      'Toys & Baby': {
        subcategories: ['Toys', 'Baby Care', 'Kids Fashion', 'School Supplies'],
        keywords: ['toy', 'baby', 'kids', 'children', 'game', 'doll', 'diaper', 'stroller']
      },
      'Real Estate': {
        subcategories: ['Apartments', 'Houses', 'Land', 'Commercial', 'PG/Roommates'],
        keywords: ['apartment', 'house', 'flat', 'property', 'land', 'rent', 'sale', 'real estate']
      },
      'Services': {
        subcategories: ['Home Services', 'Professional', 'Events', 'Classes', 'Repairs'],
        keywords: ['service', 'repair', 'maintenance', 'tutor', 'class', 'event', 'professional']
      }
    };
  }

  // Auto-categorize product based on title and description
  async categorizeProduct({ title, description, images = [] }) {
    try {
      // First try rule-based categorization
      const ruleBasedCategory = this.ruleBasedCategorization(title + ' ' + description);
      
      // Then use AI for more accurate categorization
      const aiCategory = await this.aiCategorization(title, description);
      
      // Generate tags
      const tags = await this.generateTags(title, description, aiCategory.category);
      
      // Analyze images if provided
      let imageAnalysis = null;
      if (images.length > 0) {
        imageAnalysis = await this.analyzeProductImages(images);
      }
      
      // Combine results
      const finalCategory = this.combineResults(ruleBasedCategory, aiCategory, imageAnalysis);
      
      return {
        category: finalCategory.category,
        subcategory: finalCategory.subcategory,
        confidence: finalCategory.confidence,
        tags,
        suggestedCategories: finalCategory.alternatives,
        attributes: finalCategory.attributes
      };
    } catch (error) {
      console.error('Product categorization failed:', error);
      throw new ApiError(500, 'Failed to categorize product');
    }
  }

  // Rule-based categorization
  ruleBasedCategorization(text) {
    const textLower = text.toLowerCase();
    const scores = {};
    
    for (const [category, data] of Object.entries(this.categories)) {
      scores[category] = 0;
      
      // Check keywords
      data.keywords.forEach(keyword => {
        if (textLower.includes(keyword)) {
          scores[category] += 1;
        }
      });
      
      // Check subcategories
      data.subcategories.forEach(subcat => {
        if (textLower.includes(subcat.toLowerCase())) {
          scores[category] += 2;
        }
      });
    }
    
    // Find category with highest score
    const sortedCategories = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, score]) => score > 0);
    
    if (sortedCategories.length === 0) {
      return { category: 'Others', confidence: 0 };
    }
    
    const topCategory = sortedCategories[0][0];
    const confidence = Math.min(sortedCategories[0][1] / 10, 1);
    
    return {
      category: topCategory,
      confidence,
      alternatives: sortedCategories.slice(1, 3).map(([cat]) => cat)
    };
  }

  // AI-based categorization
  async aiCategorization(title, description) {
    try {
      const prompt = `
        Categorize this product based on title and description:
        
        Title: ${title}
        Description: ${description}
        
        Available categories:
        ${Object.keys(this.categories).join(', ')}
        
        Return JSON with:
        - category: main category from the list
        - subcategory: specific subcategory
        - confidence: 0-1 confidence score
        - attributes: key product attributes (brand, model, size, color, etc.)
        - alternatives: array of alternative categories
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a product categorization expert. Categorize products accurately based on their title and description.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI categorization failed:', error);
      return {
        category: 'Others',
        subcategory: '',
        confidence: 0,
        attributes: {},
        alternatives: []
      };
    }
  }

  // Generate tags for the product
  async generateTags(title, description, category) {
    try {
      const prompt = `
        Generate relevant tags for this product:
        
        Title: ${title}
        Description: ${description}
        Category: ${category}
        
        Generate 5-10 relevant tags that will help users find this product.
        Return as JSON array of strings.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate relevant, searchable tags for products.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.tags || [];
    } catch (error) {
      console.error('Tag generation failed:', error);
      
      // Fallback to basic tag extraction
      return this.extractBasicTags(title, description);
    }
  }

  // Extract basic tags from text
  extractBasicTags(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const tags = new Set();
    
    // Extract brand names (common patterns)
    const brandPatterns = /\b(apple|samsung|sony|lg|dell|hp|lenovo|asus|nike|adidas|puma)\b/gi;
    const brands = text.match(brandPatterns);
    if (brands) {
      brands.forEach(brand => tags.add(brand.toLowerCase()));
    }
    
    // Extract colors
    const colorPatterns = /\b(red|blue|green|black|white|grey|gray|yellow|orange|purple|pink|brown)\b/gi;
    const colors = text.match(colorPatterns);
    if (colors) {
      colors.forEach(color => tags.add(color.toLowerCase()));
    }
    
    // Extract sizes
    const sizePatterns = /\b(small|medium|large|xl|xxl|xs|s|m|l)\b/gi;
    const sizes = text.match(sizePatterns);
    if (sizes) {
      sizes.forEach(size => tags.add(size.toLowerCase()));
    }
    
    // Extract condition
    const conditionPatterns = /\b(new|used|refurbished|like new|excellent|good|fair)\b/gi;
    const conditions = text.match(conditionPatterns);
    if (conditions) {
      conditions.forEach(condition => tags.add(condition.toLowerCase()));
    }
    
    return Array.from(tags);
  }

  // Analyze product images (placeholder for image recognition)
  async analyzeProductImages(images) {
    try {
      // In production, integrate with image recognition API
      // For now, return placeholder data
      console.log('Image analysis would be performed on:', images.length, 'images');
      
      return {
        detectedCategory: null,
        confidence: 0,
        detectedObjects: [],
        attributes: {}
      };
    } catch (error) {
      console.error('Image analysis failed:', error);
      return null;
    }
  }

  // Combine results from different methods
  combineResults(ruleBasedResult, aiResult, imageResult) {
    // Weight the results
    const weights = {
      ruleBased: 0.3,
      ai: 0.6,
      image: 0.1
    };
    
    // Calculate final category
    let finalCategory = aiResult.category;
    let finalConfidence = aiResult.confidence * weights.ai;
    
    // Adjust based on rule-based result
    if (ruleBasedResult.category === aiResult.category) {
      finalConfidence += ruleBasedResult.confidence * weights.ruleBased;
    }
    
    // Include image analysis if available
    if (imageResult && imageResult.detectedCategory) {
      if (imageResult.detectedCategory === finalCategory) {
        finalConfidence += imageResult.confidence * weights.image;
      }
    }
    
    // Normalize confidence
    finalConfidence = Math.min(finalConfidence, 1);
    
    return {
      category: finalCategory,
      subcategory: aiResult.subcategory,
      confidence: finalConfidence,
      alternatives: [...new Set([
        ...(ruleBasedResult.alternatives || []),
        ...(aiResult.alternatives || [])
      ])].slice(0, 3),
      attributes: aiResult.attributes || {}
    };
  }

  // Validate category
  validateCategory(category, subcategory) {
    if (!this.categories[category]) {
      return {
        valid: false,
        message: 'Invalid category',
        suggestions: Object.keys(this.categories)
      };
    }
    
    if (subcategory && !this.categories[category].subcategories.includes(subcategory)) {
      return {
        valid: false,
        message: 'Invalid subcategory',
        suggestions: this.categories[category].subcategories
      };
    }
    
    return { valid: true };
  }

  // Get category hierarchy
  getCategoryHierarchy() {
    return Object.entries(this.categories).map(([category, data]) => ({
      name: category,
      subcategories: data.subcategories
    }));
  }

  // Search categories
  searchCategories(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    for (const [category, data] of Object.entries(this.categories)) {
      // Check main category
      if (category.toLowerCase().includes(queryLower)) {
        results.push({ type: 'category', name: category });
      }
      
      // Check subcategories
      data.subcategories.forEach(subcat => {
        if (subcat.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'subcategory',
            name: subcat,
            parent: category
          });
        }
      });
    }
    
    return results;
  }

  // Batch categorize multiple products
  async batchCategorize(products) {
    const results = await Promise.all(
      products.map(product => 
        this.categorizeProduct({
          title: product.title,
          description: product.description,
          images: product.images
        })
      )
    );
    
    return results.map((result, index) => ({
      productId: products[index].id || index,
      ...result
    }));
  }

  // Get trending categories
  async getTrendingCategories() {
    // In production, this would analyze actual data
    return [
      { category: 'Electronics', trend: 'up', percentage: 15 },
      { category: 'Fashion', trend: 'up', percentage: 8 },
      { category: 'Home & Living', trend: 'stable', percentage: 0 },
      { category: 'Sports & Fitness', trend: 'up', percentage: 12 },
      { category: 'Books & Media', trend: 'down', percentage: -5 }
    ];
  }
}

export const categoryTaggingService = new CategoryTaggingService();
