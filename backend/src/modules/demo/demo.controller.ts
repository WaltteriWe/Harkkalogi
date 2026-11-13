import { Request, Response, NextFunction } from "express";
import { demoService } from "./demo.service.ts";

export class DemoController {
  async resetDemo(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await demoService.resetDemo();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const demoController = new DemoController();
