import http from "node:http";
import { spawn } from "node:child_process";

const STUDIO_PORT = 5556;
const PROXY_PORT = 5555;

console.log("==> Starting Prisma Studio on internal port " + STUDIO_PORT + "...");
const studio = spawn("npx", ["prisma", "studio", "--port", String(STUDIO_PORT), "--browser", "none"], {
  stdio: "inherit",
});

studio.on("exit", (code) => {
  console.log("Prisma studio exited with code", code);
  process.exit(code || 0);
});

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: STUDIO_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${STUDIO_PORT}`,
      origin: `http://localhost:${STUDIO_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", () => {
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain");
    res.end("Prisma Studio is starting up... please refresh in a moment.");
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`🚀 Prisma Studio Bridge listening on http://0.0.0.0:${PROXY_PORT}`);
});

process.on("SIGTERM", () => {
  studio.kill("SIGTERM");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  studio.kill("SIGINT");
  server.close(() => process.exit(0));
});

