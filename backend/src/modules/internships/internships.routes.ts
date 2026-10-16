import { Router } from "express";
import { internshipsController } from "./internships.controller.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";

const router = Router();

router.use(authenticateToken);

router.get("/", (req, res, next) => internshipsController.list(req, res, next));
router.get("/:id", (req, res, next) => internshipsController.getById(req, res, next));

export const internshipsRoutes = router;
export default internshipsRoutes;

