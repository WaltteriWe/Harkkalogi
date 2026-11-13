import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.ts";

/**
 * demoGuard middleware prevents demo actions (such as demo database reset)
 * from being executed in production environments.
 */
export function demoGuard(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === "production") {
    res.status(403).json({
      error: "Forbidden: Demo features are disabled in production environment.",
    });
    return;
  }
  next();
}
