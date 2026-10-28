import { Router } from "express";
import { usersController } from "./users.controller.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";
import { requireRole } from "../../middlewares/role.middleware.ts";
import { Role } from "../../../generated/prisma/client.ts";

const router = Router();

router.use(authenticateToken);

router.get("/", requireRole([Role.ADMIN, Role.TEACHER]), (req, res, next) =>
  usersController.list(req, res, next)
);

router.get("/:id", (req, res, next) =>
  usersController.getById(req, res, next)
);

export const usersRoutes = router;
export default usersRoutes;

