import { Request, Response, NextFunction } from "express";
import { reportsService } from "./reports.service.ts";
import type { CreateReportInput, UpdateReportInput } from "./reports.schemas.ts";

export class ReportsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let studentId = req.query.studentId
        ? parseInt(req.query.studentId as string, 10)
        : undefined;

      if (user.role === "STUDENT") {
        if (studentId !== undefined && studentId !== user.id) {
          res
            .status(403)
            .json({ error: "Forbidden: You cannot view another student's reports" });
          return;
        }
        studentId = user.id;
      }

      const status = req.query.status as any;
      const reports = await reportsService.listReports({ studentId, status });
      res.status(200).json({ reports });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const user = req.user!;
      const report = await reportsService.getReportById(id, user);
      if (!report) {
        res.status(404).json({ error: "Report not found" });
        return;
      }
      res.status(200).json({ report });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateReportInput;
      const user = req.user!;
      const report = await reportsService.createReport(input, user);
      res.status(201).json({ report });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const input = req.body as UpdateReportInput;
      const user = req.user!;
      const report = await reportsService.updateReport(id, input, user);
      if (!report) {
        res.status(404).json({ error: "Report not found" });
        return;
      }
      res.status(200).json({ report });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const user = req.user!;
      const result = await reportsService.deleteReport(id, user);
      if (!result) {
        res.status(404).json({ error: "Report not found" });
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
