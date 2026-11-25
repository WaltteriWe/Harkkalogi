import { Router } from "express";
import { reportsController } from "./reports.controller.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";
import { requireRole } from "../../middlewares/role.middleware.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import { Role } from "../../../generated/prisma/client.ts";
import {
  createReportSchema,
  updateReportSchema,
  reportParamSchema,
  createReviewSchema,
} from "./reports.schemas.ts";

const router = Router();

router.use(authenticateToken);

router.get("/", (req, res, next) => reportsController.list(req, res, next));
router.get("/:id", validate(reportParamSchema), (req, res, next) =>
  reportsController.getById(req, res, next)
);

router.post("/", validate(createReportSchema), (req, res, next) =>
  reportsController.create(req, res, next)
);

router.patch("/:id", validate(updateReportSchema), (req, res, next) =>
  reportsController.update(req, res, next)
);

router.post(
  "/:id/reviews",
  requireRole([Role.TEACHER, Role.ADMIN]),
  validate(createReviewSchema),
  (req, res, next) => reportsController.createReview(req, res, next)
);

router.delete("/:id", validate(reportParamSchema), (req, res, next) =>
  reportsController.delete(req, res, next)
);

export const reportsRoutes = router;
export default reportsRoutes;
