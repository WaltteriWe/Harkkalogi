import { Request, Response, NextFunction } from "express";
import { internshipsService } from "./internships.service.ts";

export class InternshipsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const studentId = req.query.studentId
        ? parseInt(req.query.studentId as string, 10)
        : user?.role === "STUDENT"
        ? user.id
        : undefined;
      const teacherId =
        user?.role === "TEACHER"
          ? user.id
          : req.query.teacherId
          ? parseInt(req.query.teacherId as string, 10)
          : undefined;
      const internships = await internshipsService.listInternships({ studentId, teacherId });
      res.status(200).json({ internships });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const user = (req as any).user;
      const internship = await internshipsService.getInternshipById(id);
      if (!internship) {
        res.status(404).json({ error: "Internship not found" });
        return;
      }
      if (
        (user?.role === "STUDENT" && internship.studentId !== user.id) ||
        (user?.role === "TEACHER" && internship.teacherId !== user.id)
      ) {
        res.status(403).json({ error: "Forbidden: You do not have access to this internship" });
        return;
      }
      res.status(200).json({ internship });
    } catch (error) {
      next(error);
    }
  }

  async updateCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const user = (req as any).user;
      const existing = await internshipsService.getInternshipById(id);
      if (!existing) {
        res.status(404).json({ error: "Internship not found" });
        return;
      }
      if (user?.role === "TEACHER" && existing.teacherId !== user.id) {
        res.status(403).json({ error: "Forbidden: You are not assigned to this internship" });
        return;
      }
      const creditsPutToOma = Boolean(req.body.creditsPutToOma);
      const updated = await internshipsService.setCreditsPutToOma(id, creditsPutToOma);
      res.status(200).json({ internship: updated });
    } catch (error) {
      next(error);
    }
  }

  async getGuidanceEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const internshipId = parseInt(String(req.params.id), 10);
      const user = (req as any).user;
      const existing = await internshipsService.getInternshipById(internshipId);
      if (!existing) {
        res.status(404).json({ error: "Internship not found" });
        return;
      }
      if (
        (user?.role === "STUDENT" && existing.studentId !== user.id) ||
        (user?.role === "TEACHER" && existing.teacherId !== user.id)
      ) {
        res.status(403).json({ error: "Forbidden: You do not have access to this evaluation" });
        return;
      }
      const evaluation = await internshipsService.getGuidanceEvaluation(internshipId);
      res.status(200).json({ evaluation });
    } catch (error) {
      next(error);
    }
  }

  async saveGuidanceEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const internshipId = parseInt(String(req.params.id), 10);
      const studentId = (req as any).user?.id || 1;
      const evaluation = await internshipsService.saveGuidanceEvaluation(
        internshipId,
        studentId,
        req.body
      );
      res.status(200).json({ evaluation });
    } catch (error) {
      next(error);
    }
  }
}

export const internshipsController = new InternshipsController();
