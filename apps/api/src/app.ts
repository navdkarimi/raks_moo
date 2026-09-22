import express from "express";
import helmet from "helmet";
import type { ApiError } from "@raqs/contracts";
import { errorHandler } from "./http/error-handler.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import type { AuthService } from "./modules/auth/auth.service.js";

export function createApp(dependencies: {
  isReady: () => boolean;
  auth?: { service: AuthService; origin: string; production: boolean };
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/v1/health", createHealthRouter(dependencies.isReady));
  if (dependencies.auth) {
    app.use(
      "/api/v1/auth",
      createAuthRouter(dependencies.auth.service, dependencies.auth),
    );
  }
  app.use((_req, res) => {
    const body: ApiError = {
      error: { code: "NOT_FOUND", message: "مسیر مورد نظر پیدا نشد." },
    };
    res.status(404).json(body);
  });
  app.use(errorHandler);
  return app;
}
