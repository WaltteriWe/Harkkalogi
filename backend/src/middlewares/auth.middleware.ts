import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";
import { prisma } from "../lib/prisma.ts";
import { AuthUser } from "../types/index.ts";

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    res.status(401).json({ error: "Access token is missing" });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studyType: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

