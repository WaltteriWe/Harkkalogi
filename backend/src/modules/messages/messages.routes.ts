import { Router } from "express";
import { messagesController } from "./messages.controller.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";

const router = Router();

router.use(authenticateToken);

router.get("/inbox", (req, res, next) => messagesController.getInbox(req, res, next));
router.get("/thread/:id", (req, res, next) => messagesController.getThread(req, res, next));

export const messagesRoutes = router;
export default messagesRoutes;

