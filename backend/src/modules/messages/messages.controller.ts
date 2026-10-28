import { Request, Response, NextFunction } from "express";
import { messagesService } from "./messages.service.ts";
import { AppError } from "../../middlewares/error.middleware.ts";

export class MessagesController {
  async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Unauthenticated", 401);
      }

      const search =
        typeof req.query.search === "string" ? req.query.search : undefined;
      const unreadOnly = req.query.unreadOnly === "true";

      const messages = await messagesService.getInboxForUser(req.user.id, {
        search,
        unreadOnly,
      });

      res.status(200).json({ messages });
    } catch (error) {
      next(error);
    }
  }

  async getThread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Unauthenticated", 401);
      }

      const id = parseInt(String(req.params.id), 10);
      const thread = await messagesService.getThreadById(
        id,
        req.user.id,
        req.user.role
      );

      res.status(200).json({ thread });
    } catch (error) {
      next(error);
    }
  }

  async getRecipients(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Unauthenticated", 401);
      }

      const recipientsData = await messagesService.getAvailableRecipients(
        req.user.id,
        req.user.role
      );

      res.status(200).json(recipientsData);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Unauthenticated", 401);
      }

      const message = await messagesService.createThread(
        req.user.id,
        req.user.role,
        req.body
      );

      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  }

  async reply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Unauthenticated", 401);
      }

      const threadId = parseInt(String(req.params.id), 10);
      const reply = await messagesService.replyToThread(
        threadId,
        req.user.id,
        req.user.role,
        req.body.body
      );

      res.status(201).json({ reply });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Unauthenticated", 401);
      }

      const threadId = parseInt(String(req.params.id), 10);
      const result = await messagesService.markThreadAsRead(
        threadId,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const messagesController = new MessagesController();
