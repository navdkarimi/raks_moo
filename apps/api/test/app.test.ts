import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { apiErrorSchema, healthResponseSchema } from "@raqs/contracts";
import { createApp } from "../src/app.js";
import { readEnv } from "../src/config/env.js";

test("liveness stays healthy while readiness reflects database availability", async () => {
  let ready = false;
  const app = createApp({ isReady: () => ready });
  const live = await request(app).get("/api/v1/health/live").expect(200);
  assert.equal(healthResponseSchema.parse(live.body).status, "ok");
  const unavailable = await request(app)
    .get("/api/v1/health/ready")
    .expect(503);
  assert.equal(
    healthResponseSchema.parse(unavailable.body).status,
    "not_ready",
  );
  ready = true;
  await request(app).get("/api/v1/health/ready").expect(200);
});

test("invalid JSON is a client error and does not expose parser details", async () => {
  const response = await request(createApp({ isReady: () => true }))
    .post("/api/v1/unknown")
    .set("Content-Type", "application/json")
    .send('{"secret":')
    .expect(400);
  assert.equal(apiErrorSchema.parse(response.body).error.code, "INVALID_JSON");
  assert.ok(!response.text.includes("secret"));
});

test("unexpected dependency errors are sanitized", async () => {
  const response = await request(
    createApp({
      isReady: () => {
        throw new Error("private-connection-string");
      },
    }),
  )
    .get("/api/v1/health/ready")
    .expect(500);
  assert.equal(
    apiErrorSchema.parse(response.body).error.code,
    "INTERNAL_ERROR",
  );
  assert.ok(!response.text.includes("private-connection-string"));
});

test("environment validation rejects invalid values without exposing credentials", () => {
  assert.throws(
    () => readEnv({ PORT: "0", MONGODB_URI: "private-credentials" }),
    /PORT, MONGODB_URI/,
  );
  assert.equal(
    readEnv({
      MONGODB_URI: "mongodb://127.0.0.1:27017/test",
      AUTH_SECRET: "test-only-secret-not-for-production",
    }).PORT,
    4000,
  );
});

test("production requires HTTPS for the browser origin", () => {
  assert.throws(
    () =>
      readEnv({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://127.0.0.1:27017/test",
        AUTH_SECRET: "test-only-secret-not-for-production",
        WEB_ORIGIN: "http://example.com",
      }),
    /WEB_ORIGIN/,
  );
});
