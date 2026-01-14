import { Request, Response, NextFunction } from 'express';

/**
 * API Key Authentication Middleware
 * Validates X-API-Key header against allowed API keys
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  // Get allowed API keys from environment (comma-separated)
  const allowedKeys = process.env.API_KEYS?.split(',').map(key => key.trim()) || [];

  if (!apiKey) {
    console.warn('⚠️ API request without API key:', req.path);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API key is required. Please provide X-API-Key header.'
    });
  }

  if (!allowedKeys.includes(apiKey)) {
    console.warn('⚠️ Invalid API key attempted:', apiKey.substring(0, 10) + '...');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid API key provided.'
    });
  }

  console.log('✅ Valid API key authenticated');
  next();
}

