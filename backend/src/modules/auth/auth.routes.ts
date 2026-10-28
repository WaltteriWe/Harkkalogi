import { Router } from "express";
import { authController } from "./auth.controller.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import { loginSchema } from "./auth.schemas.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";

const router = Router();

router.post("/login", validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.get("/me", authenticateToken, (req, res, next) =>
  authController.getMe(req, res, next)
);

router.post("/logout", (req, res, next) =>
  authController.logout(req, res, next)
);

export const authRoutes = router;
export default authRoutes;

