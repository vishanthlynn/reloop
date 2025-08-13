import axios from 'axios';
import crypto from 'crypto';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';

class KYCService {
  constructor() {
    this.apiKey = process.env.KYC_API_KEY;
    this.apiSecret = process.env.KYC_API_SECRET;
    this.baseUrl = process.env.KYC_API_URL || 'https://api.digio.in';
  }

  // Initiate KYC verification
  async initiateKYC({ userId, documentType, documentNumber }) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      if (user.kycStatus === 'verified') {
        throw new ApiError(400, 'User already KYC verified');
      }

      // Create KYC request
      const kycRequest = {
        userId: user._id,
        documentType,
        documentNumber,
        status: 'pending',
        requestId: this.generateRequestId(),
        initiatedAt: new Date()
      };

      // Store KYC request
      user.kycData = kycRequest;
      user.kycStatus = 'pending';
      await user.save();

      // Initiate verification based on document type
      let verificationResult;
      
      switch (documentType) {
        case 'aadhaar':
          verificationResult = await this.verifyAadhaar(documentNumber, user);
          break;
        case 'pan':
          verificationResult = await this.verifyPAN(documentNumber, user);
          break;
        case 'driving_license':
          verificationResult = await this.verifyDrivingLicense(documentNumber, user);
          break;
        default:
          throw new ApiError(400, 'Invalid document type');
      }

      return {
        requestId: kycRequest.requestId,
        status: 'initiated',
        documentType,
        verificationUrl: verificationResult.url,
        message: 'KYC verification initiated'
      };
    } catch (error) {
      console.error('KYC initiation failed:', error);
      throw error;
    }
  }

  // Verify Aadhaar
  async verifyAadhaar(aadhaarNumber, user) {
    try {
      // Validate Aadhaar format
      if (!this.validateAadhaar(aadhaarNumber)) {
        throw new ApiError(400, 'Invalid Aadhaar number format');
      }

      // In production, integrate with actual Aadhaar verification API
      // For now, simulate the process
      const mockResponse = {
        url: `${this.baseUrl}/kyc/aadhaar/${user._id}`,
        otp_sent: true,
        masked_mobile: 'XXXXXX' + user.phone?.slice(-4)
      };

      // Store verification session
      user.kycData.verificationSession = {
        type: 'aadhaar',
        sessionId: this.generateSessionId(),
        otpSent: true,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      };
      await user.save();

      return mockResponse;
    } catch (error) {
      console.error('Aadhaar verification failed:', error);
      throw new ApiError(500, 'Aadhaar verification failed');
    }
  }

  // Verify PAN
  async verifyPAN(panNumber, user) {
    try {
      // Validate PAN format
      if (!this.validatePAN(panNumber)) {
        throw new ApiError(400, 'Invalid PAN number format');
      }

      // In production, integrate with actual PAN verification API
      const mockResponse = {
        url: `${this.baseUrl}/kyc/pan/${user._id}`,
        name_match: true,
        pan_status: 'active'
      };

      // Update user KYC data
      user.kycData.panDetails = {
        number: panNumber,
        verifiedAt: new Date(),
        status: 'verified'
      };
      await user.save();

      return mockResponse;
    } catch (error) {
      console.error('PAN verification failed:', error);
      throw new ApiError(500, 'PAN verification failed');
    }
  }

  // Verify Driving License
  async verifyDrivingLicense(licenseNumber, user) {
    try {
      // Validate license format
      if (!licenseNumber || licenseNumber.length < 10) {
        throw new ApiError(400, 'Invalid driving license number');
      }

      // In production, integrate with actual DL verification API
      const mockResponse = {
        url: `${this.baseUrl}/kyc/dl/${user._id}`,
        license_status: 'active',
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };

      return mockResponse;
    } catch (error) {
      console.error('Driving license verification failed:', error);
      throw new ApiError(500, 'Driving license verification failed');
    }
  }

  // Verify OTP for Aadhaar
  async verifyOTP({ userId, otp, sessionId }) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.kycData.verificationSession) {
        throw new ApiError(400, 'Invalid verification session');
      }

      const session = user.kycData.verificationSession;
      
      // Check session expiry
      if (new Date() > new Date(session.expiresAt)) {
        throw new ApiError(400, 'Verification session expired');
      }

      // Check attempts
      if (session.attempts >= 3) {
        throw new ApiError(400, 'Maximum OTP attempts exceeded');
      }

      // In production, verify OTP with actual API
      // For now, simulate with a test OTP
      const isValidOTP = otp === '123456'; // Test OTP

      if (!isValidOTP) {
        session.attempts += 1;
        await user.save();
        throw new ApiError(400, 'Invalid OTP');
      }

      // Mark as verified
      user.kycStatus = 'verified';
      user.kycData.verifiedAt = new Date();
      user.kycData.verificationMethod = 'aadhaar_otp';
      user.isVerified = true;
      
      // Clear session
      user.kycData.verificationSession = undefined;
      await user.save();

      return {
        success: true,
        message: 'KYC verification successful',
        kycStatus: 'verified'
      };
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  }

  // Upload KYC documents
  async uploadDocuments({ userId, documents }) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Store document references
      user.kycData.documents = documents.map(doc => ({
        type: doc.type,
        url: doc.url,
        uploadedAt: new Date(),
        status: 'pending_review'
      }));

      user.kycStatus = 'documents_uploaded';
      await user.save();

      // In production, trigger document verification
      // For now, simulate async verification
      setTimeout(() => {
        this.processDocumentVerification(userId);
      }, 5000);

      return {
        success: true,
        message: 'Documents uploaded successfully',
        documentsCount: documents.length
      };
    } catch (error) {
      console.error('Document upload failed:', error);
      throw new ApiError(500, 'Failed to upload documents');
    }
  }

  // Process document verification (async)
  async processDocumentVerification(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.kycData.documents) {
        return;
      }

      // Simulate document verification
      // In production, use OCR and document verification APIs
      
      const allDocumentsValid = user.kycData.documents.every(doc => {
        // Simulate verification logic
        return true;
      });

      if (allDocumentsValid) {
        user.kycStatus = 'verified';
        user.kycData.verifiedAt = new Date();
        user.kycData.verificationMethod = 'document_upload';
        user.isVerified = true;
        
        // Mark all documents as verified
        user.kycData.documents.forEach(doc => {
          doc.status = 'verified';
          doc.verifiedAt = new Date();
        });
      } else {
        user.kycStatus = 'rejected';
        user.kycData.rejectionReason = 'Documents could not be verified';
      }

      await user.save();

      // Send notification to user
      // TODO: Implement notification service
    } catch (error) {
      console.error('Document verification processing failed:', error);
    }
  }

  // Get KYC status
  async getKYCStatus(userId) {
    try {
      const user = await User.findById(userId).select('kycStatus kycData isVerified');
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      return {
        status: user.kycStatus || 'not_initiated',
        isVerified: user.isVerified || false,
        verifiedAt: user.kycData?.verifiedAt,
        verificationMethod: user.kycData?.verificationMethod,
        documents: user.kycData?.documents?.map(doc => ({
          type: doc.type,
          status: doc.status,
          uploadedAt: doc.uploadedAt
        })),
        rejectionReason: user.kycData?.rejectionReason
      };
    } catch (error) {
      console.error('Failed to get KYC status:', error);
      throw error;
    }
  }

  // Re-initiate KYC after rejection
  async reinitiateKYC(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      if (user.kycStatus === 'verified') {
        throw new ApiError(400, 'User already KYC verified');
      }

      // Reset KYC data
      user.kycStatus = 'not_initiated';
      user.kycData = {
        previousAttempts: (user.kycData?.previousAttempts || 0) + 1,
        lastAttemptAt: user.kycData?.initiatedAt
      };
      
      await user.save();

      return {
        success: true,
        message: 'KYC reset successfully. You can now initiate a new verification.'
      };
    } catch (error) {
      console.error('Failed to reinitiate KYC:', error);
      throw error;
    }
  }

  // Validate Aadhaar format
  validateAadhaar(aadhaar) {
    const aadhaarRegex = /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
  }

  // Validate PAN format
  validatePAN(pan) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  }

  // Generate request ID
  generateRequestId() {
    return 'KYC_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  }

  // Generate session ID
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Admin: Get pending KYC verifications
  async getPendingVerifications({ page = 1, limit = 20 }) {
    try {
      const users = await User.find({
        kycStatus: { $in: ['pending', 'documents_uploaded'] }
      })
        .select('name email phone kycStatus kycData createdAt')
        .sort('-kycData.initiatedAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments({
        kycStatus: { $in: ['pending', 'documents_uploaded'] }
      });

      return {
        users,
        page,
        totalPages: Math.ceil(total / limit),
        total
      };
    } catch (error) {
      console.error('Failed to get pending verifications:', error);
      throw new ApiError(500, 'Failed to fetch pending verifications');
    }
  }

  // Admin: Manually verify/reject KYC
  async manualVerification({ userId, adminId, action, reason }) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      if (action === 'approve') {
        user.kycStatus = 'verified';
        user.kycData.verifiedAt = new Date();
        user.kycData.verificationMethod = 'manual';
        user.kycData.verifiedBy = adminId;
        user.isVerified = true;
      } else if (action === 'reject') {
        user.kycStatus = 'rejected';
        user.kycData.rejectionReason = reason;
        user.kycData.rejectedBy = adminId;
        user.kycData.rejectedAt = new Date();
      } else {
        throw new ApiError(400, 'Invalid action');
      }

      await user.save();

      // Send notification to user
      // TODO: Implement notification

      return {
        success: true,
        message: `KYC ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      };
    } catch (error) {
      console.error('Manual verification failed:', error);
      throw error;
    }
  }
}

export const kycService = new KYCService();
