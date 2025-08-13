import OpenAI from 'openai';
import { ApiError } from '../../utils/ApiError.js';

class ScamDetectionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Common scam patterns
    this.scamPatterns = {
      urls: /(?:http[s]?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/gi,
      emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      phones: /(?:\+91|91|0)?[6-9]\d{9}/g,
      upi: /[a-zA-Z0-9._-]+@[a-zA-Z0-9]+/g,
      suspiciousWords: [
        'urgent', 'limited time', 'act now', 'wire transfer', 'western union',
        'advance payment', 'processing fee', 'customs fee', 'shipping fee upfront',
        'too good to be true', 'guaranteed profit', 'no risk', 'free money',
        'lottery', 'prize', 'winner', 'claim now', 'verify account',
        'suspended account', 'update payment', 'confirm identity'
      ]
    };
  }

  // Analyze product listing for scams
  async analyzeProductListing({ title, description, price, category, images, seller }) {
    try {
      const checks = await Promise.all([
        this.checkTextForScam(title + ' ' + description),
        this.checkPriceAnomaly(price, category),
        this.checkImageAuthenticity(images),
        this.checkSellerReputation(seller)
      ]);

      const riskScore = this.calculateRiskScore(checks);
      const issues = this.compileIssues(checks);

      return {
        riskScore,
        riskLevel: this.getRiskLevel(riskScore),
        passed: riskScore < 50,
        issues,
        recommendations: this.getRecommendations(issues),
        requiresManualReview: riskScore >= 70
      };
    } catch (error) {
      console.error('Scam detection failed:', error);
      // Default to allowing with manual review flag
      return {
        riskScore: 50,
        riskLevel: 'Medium',
        passed: true,
        issues: ['Automated check failed - requires manual review'],
        recommendations: ['Manual review recommended'],
        requiresManualReview: true
      };
    }
  }

  // Check text content for scam indicators
  async checkTextForScam(text) {
    const issues = [];
    let score = 0;

    // Check for suspicious URLs
    const urls = text.match(this.scamPatterns.urls);
    if (urls && urls.length > 2) {
      issues.push('Multiple URLs detected');
      score += 20;
    }

    // Check for direct contact attempts
    const emails = text.match(this.scamPatterns.emails);
    const phones = text.match(this.scamPatterns.phones);
    const upis = text.match(this.scamPatterns.upi);

    if (emails || phones || upis) {
      issues.push('Direct contact information in listing');
      score += 30;
    }

    // Check for suspicious words
    const suspiciousCount = this.scamPatterns.suspiciousWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;

    if (suspiciousCount > 3) {
      issues.push('Multiple suspicious phrases detected');
      score += 25;
    }

    // Use AI for deeper analysis
    try {
      const aiAnalysis = await this.analyzeWithAI(text);
      if (aiAnalysis.isScam) {
        issues.push(aiAnalysis.reason);
        score += aiAnalysis.confidence;
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    }

    return { score, issues, type: 'text' };
  }

  // Check for price anomalies
  async checkPriceAnomaly(price, category) {
    const issues = [];
    let score = 0;

    // Check for suspiciously low prices
    if (price < 10) {
      issues.push('Suspiciously low price');
      score += 40;
    }

    // Check for round numbers that might indicate placeholder
    if (price === 99999 || price === 12345 || price === 11111) {
      issues.push('Placeholder price detected');
      score += 30;
    }

    // Category-specific checks
    const highValueCategories = ['electronics', 'jewelry', 'vehicles'];
    if (highValueCategories.includes(category) && price < 100) {
      issues.push('Price too low for category');
      score += 35;
    }

    return { score, issues, type: 'price' };
  }

  // Check image authenticity
  async checkImageAuthenticity(images) {
    const issues = [];
    let score = 0;

    if (!images || images.length === 0) {
      issues.push('No images provided');
      score += 20;
    } else if (images.length === 1) {
      issues.push('Only one image provided');
      score += 10;
    }

    // In production, implement reverse image search
    // to check if images are stolen from other sites

    return { score, issues, type: 'images' };
  }

  // Check seller reputation
  async checkSellerReputation(seller) {
    const issues = [];
    let score = 0;

    if (!seller.isVerified) {
      issues.push('Unverified seller');
      score += 15;
    }

    if (seller.accountAge < 7) { // Days
      issues.push('New seller account');
      score += 20;
    }

    if (seller.totalSales === 0) {
      issues.push('No previous sales');
      score += 10;
    }

    if (seller.rating < 3 && seller.totalReviews > 5) {
      issues.push('Low seller rating');
      score += 25;
    }

    return { score, issues, type: 'seller' };
  }

  // Analyze with AI
  async analyzeWithAI(text) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a scam detection expert. Analyze text for potential scams, fraudulent activity, or policy violations in an online marketplace context.'
          },
          {
            role: 'user',
            content: `Analyze this listing for scam indicators: "${text}". 
            Return JSON with: 
            - isScam: boolean
            - confidence: number (0-100)
            - reason: string (brief explanation)
            - category: string (type of scam if detected)`
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI scam analysis failed:', error);
      return { isScam: false, confidence: 0, reason: '', category: '' };
    }
  }

  // Analyze chat messages for scams
  async analyzeChatMessage(message, context = {}) {
    const issues = [];
    let score = 0;

    // Check for attempts to move conversation off-platform
    const offPlatformKeywords = [
      'whatsapp', 'telegram', 'email me', 'call me', 'text me',
      'contact me directly', 'outside the app', 'off the platform'
    ];

    const hasOffPlatform = offPlatformKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (hasOffPlatform) {
      issues.push('Attempt to move conversation off-platform');
      score += 40;
    }

    // Check for payment outside platform
    const paymentKeywords = [
      'pay directly', 'bank transfer', 'wire transfer', 'western union',
      'pay outside', 'avoid fees', 'save commission'
    ];

    const hasPaymentIssue = paymentKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (hasPaymentIssue) {
      issues.push('Attempt to bypass platform payment');
      score += 50;
    }

    // Check for suspicious links
    const urls = message.match(this.scamPatterns.urls);
    if (urls) {
      const suspiciousUrls = urls.filter(url => 
        !url.includes(process.env.PLATFORM_DOMAIN)
      );
      
      if (suspiciousUrls.length > 0) {
        issues.push('External links detected');
        score += 30;
      }
    }

    // Check for personal information requests
    const infoRequests = [
      'password', 'otp', 'pin', 'cvv', 'card number',
      'account number', 'aadhaar', 'pan card'
    ];

    const hasInfoRequest = infoRequests.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (hasInfoRequest) {
      issues.push('Request for sensitive information');
      score += 60;
    }

    return {
      riskScore: score,
      riskLevel: this.getRiskLevel(score),
      shouldBlock: score >= 60,
      shouldWarn: score >= 30,
      issues,
      filteredMessage: this.filterMessage(message)
    };
  }

  // Filter potentially harmful content from messages
  filterMessage(message) {
    let filtered = message;

    // Remove emails
    filtered = filtered.replace(this.scamPatterns.emails, '[email removed]');

    // Remove phone numbers
    filtered = filtered.replace(this.scamPatterns.phones, '[phone removed]');

    // Remove UPI IDs
    filtered = filtered.replace(this.scamPatterns.upi, '[payment ID removed]');

    // Remove suspicious URLs
    const urls = filtered.match(this.scamPatterns.urls) || [];
    urls.forEach(url => {
      if (!url.includes(process.env.PLATFORM_DOMAIN)) {
        filtered = filtered.replace(url, '[link removed]');
      }
    });

    return filtered;
  }

  // Calculate overall risk score
  calculateRiskScore(checks) {
    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    const maxScore = checks.length * 100;
    return Math.min(100, Math.round((totalScore / maxScore) * 100));
  }

  // Get risk level from score
  getRiskLevel(score) {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Minimal';
  }

  // Compile all issues
  compileIssues(checks) {
    return checks.reduce((allIssues, check) => {
      return allIssues.concat(check.issues);
    }, []);
  }

  // Get recommendations based on issues
  getRecommendations(issues) {
    const recommendations = [];

    if (issues.includes('Direct contact information in listing')) {
      recommendations.push('Remove contact information from listing');
    }

    if (issues.includes('Suspiciously low price')) {
      recommendations.push('Verify price is accurate');
    }

    if (issues.includes('No images provided')) {
      recommendations.push('Add product images');
    }

    if (issues.includes('Unverified seller')) {
      recommendations.push('Complete seller verification');
    }

    return recommendations;
  }

  // Batch analyze multiple items
  async batchAnalyze(items, type = 'listing') {
    const results = await Promise.all(
      items.map(item => 
        type === 'listing' 
          ? this.analyzeProductListing(item)
          : this.analyzeChatMessage(item.message, item.context)
      )
    );

    return {
      totalAnalyzed: results.length,
      flagged: results.filter(r => !r.passed || r.shouldBlock).length,
      results
    };
  }

  // Report false positive/negative
  async reportFeedback({ itemId, itemType, wasScam, feedback }) {
    // Store feedback to improve detection
    console.log('Scam detection feedback:', {
      itemId,
      itemType,
      wasScam,
      feedback,
      timestamp: new Date()
    });

    // In production, use this to retrain models
    return { success: true, message: 'Feedback recorded' };
  }
}

export const scamDetectionService = new ScamDetectionService();
