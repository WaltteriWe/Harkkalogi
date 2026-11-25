import { Router } from "express";
import { z } from "zod";
import { internshipsController } from "./internships.controller.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";
import { requireRole } from "../../middlewares/role.middleware.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import { Role } from "../../../generated/prisma/client.ts";

const updateCreditsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Internship ID must be numeric").transform(Number),
  }),
  body: z.object({
    creditsPutToOma: z.boolean(),
  }),
});

const router = Router();

router.use(authenticateToken);

router.get("/", (req, res, next) => internshipsController.list(req, res, next));
router.get("/:id", (req, res, next) => internshipsController.getById(req, res, next));
router.patch(
  "/:id/credits",
  requireRole([Role.TEACHER, Role.ADMIN]),
  validate(updateCreditsSchema),
  (req, res, next) => internshipsController.updateCredits(req, res, next)
);
router.get("/:id/guidance-evaluation", (req, res, next) =>
  internshipsController.getGuidanceEvaluation(req, res, next)
);
router.post("/:id/guidance-evaluation", (req, res, next) =>
  internshipsController.saveGuidanceEvaluation(req, res, next)
);

export const internshipsRoutes = router;
export default internshipsRoutes;
