import { Request, Response, NextFunction } from "express";
import { Role } from "../../generated/prisma/client.ts";

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

