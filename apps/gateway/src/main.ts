import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import * as jwt from "jsonwebtoken";
import { AppModule } from "./app.module";

// ── JWT middleware ────────────────────────────────────────────────────────────
// Runs on every request before proxying.
//  - Valid access token   → inject X-User-Id + X-User-Email, forward request
//  - Invalid/expired token → reject with 401 immediately
//  - No token             → pass through (downstream enforces auth if needed)
function buildJwtMiddleware(publicKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) return next();

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
      }) as jwt.JwtPayload;
      if (payload["type"] !== "access") {
        res
          .status(401)
          .json({ statusCode: 401, message: "Invalid token type" });
        return;
      }
      // Downstream services read these headers instead of re-verifying the JWT.
      req.headers["x-user-id"] = payload["sub"] as string;
      req.headers["x-user-email"] = payload["email"] as string;
    } catch {
      res
        .status(401)
        .json({ statusCode: 401, message: "Invalid or expired token" });
      return;
    }
    next();
  };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  // bodyParser: false — gateway never needs to parse bodies, only forward them.
  // If body is parsed, the raw stream is consumed and http-proxy-middleware
  // would forward an empty body to upstream services.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ["log", "warn", "error"],
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";
  const authUrl = process.env.AUTH_SERVICE_URL ?? "http://localhost:3006";
  const searchUrl = process.env.SEARCH_SERVICE_URL ?? "http://localhost:3005";
  const analyticsUrl =
    process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3007";
  const publicKey = (process.env.JWT_PUBLIC_KEY ?? "").replace(/\\n/g, "\n");

  const expressApp = app
    .getHttpAdapter()
    .getInstance() as import("express").Express;

  // 1. JWT extraction — must run before any proxy
  expressApp.use(buildJwtMiddleware(publicKey));

  // 2. Auth-service proxy  (/api/auth/*)
  expressApp.use(
    createProxyMiddleware({
      target: authUrl,
      changeOrigin: true,
      pathFilter: "/api/auth/**",
      on: {
        error: (_err, _req, res) => {
          (res as Response)
            .status(502)
            .json({ statusCode: 502, message: "Auth service unavailable" });
        },
      },
    }),
  );

  // 3. Search-service proxy  (/api/search*)
  expressApp.use(
    createProxyMiddleware({
      target: searchUrl,
      changeOrigin: true,
      pathFilter: "/api/search**",
      on: {
        error: (_err, _req, res) => {
          (res as Response)
            .status(502)
            .json({ statusCode: 502, message: "Search service unavailable" });
        },
      },
    }),
  );

  // 4. Analytics-service proxy  (/api/recommendations/*)
  expressApp.use(
    createProxyMiddleware({
      target: analyticsUrl,
      changeOrigin: true,
      pathFilter: "/api/recommendations/**",
      on: {
        error: (_err, _req, res) => {
          (res as Response)
            .status(502)
            .json({
              statusCode: 502,
              message: "Analytics service unavailable",
            });
        },
      },
    }),
  );

  // 5. Backend catch-all  (/api/* except auth + search + recommendations)
  //    /health is excluded so NestJS handles it.
  expressApp.use(
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      pathFilter: (path: string) =>
        path.startsWith("/api/") &&
        !path.startsWith("/api/auth/") &&
        !path.startsWith("/api/search") &&
        !path.startsWith("/api/recommendations"),
      on: {
        error: (_err, _req, res) => {
          (res as Response)
            .status(502)
            .json({ statusCode: 502, message: "Backend service unavailable" });
        },
      },
    }),
  );

  await app.listen(port);
  console.log(`Gateway running on port ${port}`);
  console.log(`  → /api/auth/**            → ${authUrl}`);
  console.log(`  → /api/search**           → ${searchUrl}`);
  console.log(`  → /api/recommendations/** → ${analyticsUrl}`);
  console.log(`  → /api/**                 → ${backendUrl}`);
  console.log(`  → /health                 → gateway (aggregated)`);
}

bootstrap();
