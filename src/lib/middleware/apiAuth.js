import { APIKeyManager } from '../apiAuth';

// In-memory storage for demo (use database in production)
const API_KEYS = new Map([
  // Demo API keys (hash -> metadata)
  [
    APIKeyManager.hashAPIKey('1g15r15g1s15dwg8ajweohiwegoihghld56'),
    {
      name: 'Admin API Key',
      permissions: ['read', 'write', 'admin'],
      rateLimitPerHour: 1000,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true
    }
  ],
  [
    APIKeyManager.hashAPIKey('pk_demo_1234567890abcdef1234567890abcdef'),
    {
      name: 'Demo API Key',
      permissions: ['read', 'write'],
      rateLimitPerHour: 1000,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true
    }
  ],
  [
    APIKeyManager.hashAPIKey('pk_test_abcdef1234567890abcdef1234567890'),
    {
      name: 'Test API Key',
      permissions: ['read'],
      rateLimitPerHour: 100,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true
    }
  ]
]);

// Rate limiting storage (in-memory for demo)
const rateLimitStorage = new Map();

export function withAPIAuth(requiredPermissions = []) {
  return function authMiddleware(handler) {
    return async function authenticatedHandler(req, res) {
      try {
        // Extract API key
        const apiKey = APIKeyManager.extractAPIKey(req);
        
        if (!apiKey) {
          return res.status(401).json({
            error: 'API key required',
            message: 'Please provide an API key via Authorization header, X-API-Key header, or api_key query parameter'
          });
        }

        // Validate key format
        if (!APIKeyManager.isValidKeyFormat(apiKey)) {
          return res.status(401).json({
            error: 'Invalid API key format',
            message: 'API key must be in the correct format'
          });
        }

        // Check if key exists
        const keyHash = APIKeyManager.hashAPIKey(apiKey);
        const keyMetadata = API_KEYS.get(keyHash);
        
        if (!keyMetadata) {
          return res.status(401).json({
            error: 'Invalid API key',
            message: 'The provided API key does not exist or is invalid'
          });
        }

        // Check if key is active
        if (!keyMetadata.isActive) {
          return res.status(401).json({
            error: 'API key disabled',
            message: 'This API key has been disabled'
          });
        }

        // Check permissions
        const hasRequiredPermissions = requiredPermissions.every(
          permission => keyMetadata.permissions.includes(permission)
        );
        
        if (!hasRequiredPermissions) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: `This API key requires the following permissions: ${requiredPermissions.join(', ')}`
          });
        }

        // Rate limiting
        const now = new Date();
        const hourKey = `${keyHash}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}`;
        const currentUsage = rateLimitStorage.get(hourKey) || 0;
        
        if (currentUsage >= keyMetadata.rateLimitPerHour) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `API key has exceeded the rate limit of ${keyMetadata.rateLimitPerHour} requests per hour`,
            retryAfter: 3600 - (now.getMinutes() * 60 + now.getSeconds())
          });
        }

        // Update rate limit counter
        rateLimitStorage.set(hourKey, currentUsage + 1);

        // Update last used timestamp
        keyMetadata.lastUsed = now.toISOString();

        // Add API key info to request for logging
        req.apiKey = {
          hash: keyHash,
          metadata: keyMetadata
        };

        // Add rate limiting headers
        res.setHeader('X-RateLimit-Limit', keyMetadata.rateLimitPerHour);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, keyMetadata.rateLimitPerHour - currentUsage - 1));
        res.setHeader('X-RateLimit-Reset', Math.ceil((3600 - (now.getMinutes() * 60 + now.getSeconds())) / 60));

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