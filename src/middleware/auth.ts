import { Request, Response, NextFunction } from 'express';

const VALID_API_KEY = process.env.POS_API_KEY || 'dev-api-key-12345';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-pos-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing X-POS-API-KEY header',
    });
  }

  if (apiKey !== VALID_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  next();
}
