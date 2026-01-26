// src/lib/middleware/apiAuth.ts
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import type { 
  Permission, 
  APIKeyConfig, 
  RateLimitResult, 
  AuthenticatedNextApiRequest 
} from '../types/auth';

/**
 * Simplified API authentication middleware using environment variables
 * No database required - keys stored in .env
 */

// Simple in-memory rate limiting (resets on server restart)
const rateLimitStorage = new Map<string, number>();

/**
 * Get API keys configuration from environment
 */
const getApiKeys = (): Map<string, APIKeyConfig> => {
  const keys = new Map<string, APIKeyConfig>();
  
  // Master admin key
  if (process.env.API_MASTER_KEY) {
    keys.set(hashKey(process.env.API_MASTER_KEY), {
      name: 'Master Admin Key',
      permissions: ['read', 'write', 'admin'],
      rateLimitPerHour: 10000
    });
  }
  
  // Sync webhook key (for Google Apps Script)
  if (process.env.SYNC_API_KEY) {
    keys.set(hashKey(process.env.SYNC_API_KEY), {
      name: 'Sync Webhook Key',
      permissions: ['write'],
      rateLimitPerHour: 5000
    });
  }
  
  // Read-only key
  if (process.env.API_READ_KEY) {
    keys.set(hashKey(process.env.API_READ_KEY), {
      name: 'Read-Only Key',
      permissions: ['read'],
      rateLimitPerHour: 1000
    });
  }
  
  return keys;
};

/**
 * Hash API key for comparison
 */
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Extract API key from request
 */
function extractAPIKey(req: NextApiRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check x-api-key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }
  
  // Check query parameter
  if (req.query?.api_key && typeof req.query.api_key === 'string') {
    return req.query.api_key;
  }
  
  // Check request body (for webhooks)
  if (req.body?.apiKey && typeof req.body.apiKey === 'string') {
    return req.body.apiKey;
  }
  
  return null;
}

/**
 * Check if request is from internal source
 */
function isInternalRequest(req: NextApiRequest): boolean {
  const host = req.headers.host || '';
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  
  return (
    origin.includes(host) ||
    referer.includes(host) ||
    req.headers['x-internal-request'] === 'true'
  );
}

/**
 * Check rate limit
 */
function checkRateLimit(keyHash: string, limit: number): RateLimitResult {
  const now = new Date();
  const hourKey = `${keyHash}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}`;
  
  const currentUsage = rateLimitStorage.get(hourKey) || 0;
  
  if (currentUsage >= limit) {
    const minutesRemaining = 60 - now.getMinutes();
    return {
      exceeded: true,
      current: currentUsage,
      limit,
      retryAfter: minutesRemaining * 60
    };
  }
  
  // Increment usage
  rateLimitStorage.set(hourKey, currentUsage + 1);
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupOldRateLimits();
  }
  
  return {
    exceeded: false,
    current: currentUsage + 1,
    limit,
    remaining: limit - currentUsage - 1
  };
}

/**
 * Clean up old rate limit entries (older than 2 hours)
 */
function cleanupOldRateLimits(): void {
  const now = new Date();
  const twoHoursAgo = now.getTime() - (2 * 60 * 60 * 1000);
  
  for (const [key] of rateLimitStorage.entries()) {
    // Extract timestamp from key format: hash_year_month_day_hour
    const parts = key.split('_');
    if (parts.length >= 5) {
      const year = parseInt(parts[parts.length - 4]);
      const month = parseInt(parts[parts.length - 3]);
      const day = parseInt(parts[parts.length - 2]);
      const hour = parseInt(parts[parts.length - 1]);
      
      const keyDate = new Date(year, month, day, hour);
      if (keyDate.getTime() < twoHoursAgo) {
        rateLimitStorage.delete(key);
      }
    }
  }
}

/**
 * Get client IP address
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0];
  }
  
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Main authentication middleware
 */
export function withAPIAuth(requiredPermissions: Permission[] = []) {
  return function authMiddleware(handler: NextApiHandler) {
    return async function authenticatedHandler(
      req: AuthenticatedNextApiRequest,
      res: NextApiResponse
    ) {
      try {
        // Skip authentication for internal requests
        if (isInternalRequest(req)) {
          return handler(req, res);
        }

        // Extract API key
        const apiKey = extractAPIKey(req);
        
        if (!apiKey) {
          return res.status(401).json({
            error: 'API key required',
            message: 'Provide an API key via Authorization header (Bearer token), X-API-Key header, or api_key parameter'
          });
        }

        // Look up key configuration
        const keyHash = hashKey(apiKey);
        const apiKeys = getApiKeys();
        const keyConfig = apiKeys.get(keyHash);
        
        if (!keyConfig) {
          console.warn('Invalid API key attempt from:', getClientIp(req));
          return res.status(401).json({
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
          });
        }

        // Check permissions
        const hasPermissions = requiredPermissions.every(
          permission => keyConfig.permissions.includes(permission)
        );
        
        if (!hasPermissions) {
          console.warn(`Insufficient permissions for key "${keyConfig.name}":`, {
            required: requiredPermissions,
            granted: keyConfig.permissions
          });
          
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: `This endpoint requires: ${requiredPermissions.join(', ')}`,
            required: requiredPermissions,
            granted: keyConfig.permissions
          });
        }

        // Check rate limit
        const rateLimit = checkRateLimit(keyHash, keyConfig.rateLimitPerHour);
        
        if (rateLimit.exceeded) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Rate limit of ${rateLimit.limit} requests/hour exceeded`,
            retryAfter: rateLimit.retryAfter
          });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
        res.setHeader('X-RateLimit-Remaining', (rateLimit.remaining || 0).toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil((rateLimit.retryAfter || 0) / 60).toString());

        // Add API key info to request
        req.apiKey = {
          name: keyConfig.name,
          permissions: keyConfig.permissions
        };

        // Log usage
        console.log(`API Request: ${req.method} ${req.url} by "${keyConfig.name}"`);

        // Call the actual handler
        return handler(req, res);

      } catch (error) {
        console.error('API Auth Error:', error);
        return res.status(500).json({
          error: 'Authentication error',
          message: 'An error occurred during authentication'
        });
      }
    };
  };
}

/**
 * Generate a new API key (for manual rotation)
 */
export function generateAPIKey(prefix: string = 'sk'): string {
  const randomBytes = crypto.randomBytes(32);
  const timestamp = Date.now().toString(36);
  const hash = crypto.createHash('sha256').update(randomBytes).digest('hex');
  return `${prefix}_${timestamp}_${hash.substring(0, 32)}`;
}

// Export for use in scripts
export { hashKey, extractAPIKey };
