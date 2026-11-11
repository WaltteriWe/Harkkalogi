import { Request, Response, NextFunction } from "express";
import { plansService } from "./plans.service.ts";
import type { SavePlanInput } from "./plans.schemas.ts";

export class PlansController {
  async getMyPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const plan = await plansService.getMyPlan(user.id);
      res.status(200).json({ plan });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const plan = await plansService.getPlanById(id);
      if (!plan) {
        res.status(404).json({ error: "Plan not found" });
        return;
      }
      res.status(200).json({ plan });
    } catch (error) {
      next(error);
    }
  }

  async save(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as SavePlanInput;
      const user = req.user!;
      const plan = await plansService.savePlan(user, input);
      res.status(200).json({ plan });
    } catch (error) {
      next(error);
    }
  }

  async updateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const input = req.body as SavePlanInput;
      const user = req.user!;
      const plan = await plansService.savePlan(user, input, id);
      if (!plan) {
        res.status(404).json({ error: "Plan not found" });
        return;
      }
      res.status(200).json({ plan });
    } catch (error) {
      next(error);
    }
  }
}

export const plansController = new PlansController();

