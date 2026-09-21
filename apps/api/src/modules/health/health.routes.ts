import { Router } from "express";
import type { HealthResponse } from "@raqs/contracts";

export function createHealthRouter(isReady: () => boolean) {
  const router = Router();
  router.get("/live", (_req, res) => {
    const body: HealthResponse = { status: "ok", service: "raqs-api" };
    res.json(body);
  });
  router.get("/ready", (_req, res) => {
    const ready = isReady();
    const body: HealthResponse = { status: ready ? "ok" : "not_ready", service: "raqs-api" };
    res.status(ready ? 200 : 503).json(body);
  });
  return router;
}
