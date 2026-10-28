import { Router } from "express";
import { reportsController } from "./reports.controller.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";

const router = Router();

router.use(authenticateToken);

router.get("/", (req, res, next) => reportsController.list(req, res, next));
router.get("/:id", (req, res, next) => reportsController.getById(req, res, next));

export const reportsRoutes = router;
export default reportsRoutes;

