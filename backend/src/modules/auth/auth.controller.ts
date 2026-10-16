import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service.ts";

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const user = await authService.getMe(req.user.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In JWT stateless auth, client discards token. This provides a standard endpoint.
      res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

