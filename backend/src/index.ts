import { app } from "./app.ts";
import { env } from "./config/env.ts";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Harkkalogi backend server running on http://localhost:${env.PORT}`);
  console.log(`📡 CORS configured for origin: ${env.CORS_ORIGIN}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

