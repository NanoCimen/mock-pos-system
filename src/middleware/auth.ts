import { Request, Response, NextFunction } from "express";

export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const providedKey =
    req.headers["x-pos-api-key"] as string | undefined;

  const validKey = process.env.POS_API_KEY;

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      error: "Missing X-POS-API-KEY header",
    });
  }

  if (!validKey) {
    console.error("POS_API_KEY is not set in environment");
    return res.status(500).json({
      success: false,
      error: "POS API key not configured",
    });
  }

  if (providedKey !== validKey) {
    return res.status(403).json({
      success: false,
      error: "Invalid POS API key",
    });
  }

  next();
}
