import express from "express";
import helmet from "helmet";
import type { ApiError } from "@raqs/contracts";
import { errorHandler } from "./http/error-handler.js";
import { createHealthRouter } from "./modules/health/health.routes.js";

export function createApp(dependencies: { isReady: () => boolean }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/v1/health", createHealthRouter(dependencies.isReady));
  app.use((_req, res) => {
    const body: ApiError = { error: { code: "NOT_FOUND", message: "مسیر مورد نظر پیدا نشد." } };
    res.status(404).json(body);
  });
  app.use(errorHandler);
  return app;
}
