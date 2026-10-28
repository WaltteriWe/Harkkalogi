import { Router } from "express";
import { messagesController } from "./messages.controller.ts";
import { authenticateToken } from "../../middlewares/auth.middleware.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import {
  getInboxSchema,
  createMessageSchema,
  replyMessageSchema,
  threadParamSchema,
} from "./messages.schemas.ts";

const router = Router();

router.use(authenticateToken);

router.get("/inbox", validate(getInboxSchema), (req, res, next) =>
  messagesController.getInbox(req, res, next)
);

router.get("/recipients", (req, res, next) =>
  messagesController.getRecipients(req, res, next)
);

router.get("/thread/:id", validate(threadParamSchema), (req, res, next) =>
  messagesController.getThread(req, res, next)
);

router.post("/", validate(createMessageSchema), (req, res, next) =>
  messagesController.create(req, res, next)
);

router.post("/thread/:id/reply", validate(replyMessageSchema), (req, res, next) =>
  messagesController.reply(req, res, next)
);

router.patch("/thread/:id/read", validate(threadParamSchema), (req, res, next) =>
  messagesController.markRead(req, res, next)
);

export const messagesRoutes = router;
export default messagesRoutes;
