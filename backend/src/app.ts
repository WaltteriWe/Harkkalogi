import express, { Express } from "express";
import cors from "cors";
import { env } from "./config/env.ts";
import { errorHandler } from "./middlewares/error.middleware.ts";
import { authRoutes } from "./modules/auth/index.ts";
import { usersRoutes } from "./modules/users/index.ts";
import { reportsRoutes } from "./modules/reports/index.ts";
import { messagesRoutes } from "./modules/messages/index.ts";
import { internshipsRoutes } from "./modules/internships/index.ts";

export function createApp(): Express {
  const app = express();

  // Global middlewares
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());

  // Healthcheck endpoint
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Feature module routers
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/messages", messagesRoutes);
  app.use("/api/internships", internshipsRoutes);

  // Global error handler (must be registered after routes)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;

