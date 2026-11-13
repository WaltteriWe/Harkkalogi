import { Router } from "express";
import { demoController } from "./demo.controller.ts";
import { demoGuard } from "../../middlewares/demo.middleware.ts";

const router = Router();

// Ensure all demo endpoints pass through demoGuard
router.use(demoGuard);

router.post("/reset", (req, res, next) =>
  demoController.resetDemo(req, res, next)
);

export const demoRoutes = router;
export default demoRoutes;
