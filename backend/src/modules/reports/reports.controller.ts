import { Request, Response, NextFunction } from "express";
import { reportsService } from "./reports.service.ts";

export class ReportsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string, 10) : undefined;
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
      const report = await reportsService.getReportById(id);
      if (!report) {
        res.status(404).json({ error: "Report not found" });
        return;
      }
      res.status(200).json({ report });
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
