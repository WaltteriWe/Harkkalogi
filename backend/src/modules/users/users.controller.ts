import { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service.ts";

export class UsersController {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await usersService.getAllUsers();
      res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const user = await usersService.getUserById(id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
