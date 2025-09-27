import crypto from 'crypto';

export class APIKeyManager {
  // Generate a secure API key
  static generateAPIKey(prefix = 'pk') {
    const randomBytes = crypto.randomBytes(32);
    const timestamp = Date.now().toString(36);
    const hash = crypto.createHash('sha256').update(randomBytes).digest('hex');
    return `${prefix}_${timestamp}_${hash.substring(0, 32)}`;
  }

  // Generate API key hash for storage
  static hashAPIKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  // Validate API key format
  static isValidKeyFormat(apiKey) {
    return /^[a-zA-Z0-9_]{3,}_[a-zA-Z0-9]{8,}_[a-zA-Z0-9]{32}$/.test(apiKey);
  }

  // Get API key from request headers
  static extractAPIKey(req) {
    // Check multiple possible locations
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const apiKeyQuery = req.query.api_key;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '');
    }
    
    if (apiKeyHeader) {
      return apiKeyHeader;
    }
    
    if (apiKeyQuery) {
      return apiKeyQuery;
    }
    
    return null;
  }
}