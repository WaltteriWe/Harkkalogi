import { Request, Response, NextFunction } from "express";
import { messagesService } from "./messages.service.ts";

export class MessagesController {
  async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }
      const messages = await messagesService.getInboxForUser(req.user.id);
      res.status(200).json({ messages });
    } catch (error) {
      next(error);
    }
  }

  async getThread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const thread = await messagesService.getThreadById(id);
      if (!thread) {
        res.status(404).json({ error: "Message thread not found" });
        return;
      }
      res.status(200).json({ thread });
    } catch (error) {
      next(error);
    }
  }
}

export const messagesController = new MessagesController();
