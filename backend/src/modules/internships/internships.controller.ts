import { Request, Response, NextFunction } from "express";
import { internshipsService } from "./internships.service.ts";

export class InternshipsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string, 10) : undefined;
      const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string, 10) : undefined;
      const internships = await internshipsService.listInternships({ studentId, teacherId });
      res.status(200).json({ internships });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const internship = await internshipsService.getInternshipById(id);
      if (!internship) {
        res.status(404).json({ error: "Internship not found" });
        return;
      }
      res.status(200).json({ internship });
    } catch (error) {
      next(error);
    }
  }
}

export const internshipsController = new InternshipsController();
