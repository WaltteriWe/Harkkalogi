import { Router } from "express";
import { plansController } from "./plans.controller.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import { savePlanSchema, planParamSchema } from "./plans.schemas.ts";

const router = Router();

router.use(authenticateToken);

router.get("/my-plan", (req, res, next) => plansController.getMyPlan(req, res, next));
router.get("/:id", validate(planParamSchema), (req, res, next) =>
  plansController.getById(req, res, next)
);

router.post("/", validate(savePlanSchema), (req, res, next) =>
  plansController.save(req, res, next)
);

router.put("/my-plan", validate(savePlanSchema), (req, res, next) =>
  plansController.save(req, res, next)
);

router.patch("/my-plan", validate(savePlanSchema), (req, res, next) =>
  plansController.save(req, res, next)
);

router.patch("/:id", validate(savePlanSchema), (req, res, next) =>
  plansController.updateById(req, res, next)
);

export const plansRoutes = router;
export default plansRoutes;

