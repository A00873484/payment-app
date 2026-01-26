// src/lib/apiAuth.ts
import crypto from 'crypto';
import type { NextApiRequest } from 'next';

export class APIKeyManager {
  /**
   * Generate a secure API key
   */
  static generateAPIKey(prefix: string = 'pk'): string {
    const randomBytes = crypto.randomBytes(32);
    const timestamp = Date.now().toString(36);
    const hash = crypto.createHash('sha256').update(randomBytes).digest('hex');
    return `${prefix}_${timestamp}_${hash.substring(0, 32)}`;
  }

  /**
   * Generate API key hash for storage
   */
  static hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Validate API key format
   */
  static isValidKeyFormat(apiKey: string): boolean {
    return /^[a-zA-Z0-9_]{3,}_[a-zA-Z0-9]{8,}_[a-zA-Z0-9]{32}$/.test(apiKey);
  }

  /**
   * Get API key from request headers
   */
  static extractAPIKey(req: NextApiRequest): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '');
    }
    
    // Check x-api-key header
    const apiKeyHeader = req.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string') {
      return apiKeyHeader;
    }
    
    // Check query parameter
    const apiKeyQuery = req.query.api_key;
    if (typeof apiKeyQuery === 'string') {
      return apiKeyQuery;
    }
    
    return null;
  }
}
