import { randomUUID } from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import {
  AuthRepository,
  ensureAuthIndexes,
} from "../../src/modules/auth/auth.repository.js";
import { AuthService } from "../../src/modules/auth/auth.service.js";
import { defaultAuthPolicy } from "../../src/modules/auth/auth.policy.js";
import type { SmsSender } from "../../src/modules/auth/sms-sender.js";

// This file is outside src, excluded from the production build and never imported by it.
if (process.env.NODE_ENV !== "test" || !process.env.RAQS_E2E_KEY) {
  throw new Error(
    "The browser fixture requires NODE_ENV=test and a run-specific key",
  );
}
const key = process.env.RAQS_E2E_KEY;
const databaseName = `raqs_browser_test_${randomUUID().replaceAll("-", "")}`;
const outbox = new Map<string, string>();
let available = true;
const sms: SmsSender = {
  get available() {
    return available;
  },
  async sendOtp({ mobile, code }) {
    outbox.set(mobile, code);
  },
};

await mongoose.connect(
  process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017",
  { dbName: databaseName, serverSelectionTimeoutMS: 5000 },
);
await ensureAuthIndexes();
const service = new AuthService(new AuthRepository(), sms, randomUUID(), {
  ...defaultAuthPolicy,
  resendDelaySeconds: 2,
  otpLifetimeSeconds: 120,
  sendsPerIpPerHour: 100,
});
const host = express();
const controls = express.Router();
controls.use((req, res, next) => {
  if (req.get("x-e2e-key") !== key) {
    res.sendStatus(403);
    return;
  }
  next();
});
controls.use(express.json());
controls.post("/sms", (req, res) => {
  available = req.body.available === true;
  res.sendStatus(204);
});
controls.get("/otp", (req, res) => {
  const code =
    typeof req.query.mobile === "string"
      ? outbox.get(req.query.mobile)
      : undefined;
  if (!code) {
    res.sendStatus(404);
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ code });
});
controls.delete("/database", async (_req, res) => {
  if (
    mongoose.connection.name !== databaseName ||
    !/^raqs_browser_test_[a-f0-9]{32}$/.test(databaseName)
  ) {
    res.sendStatus(409);
    return;
  }
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  outbox.clear();
  res.sendStatus(204);
});
host.use("/__test", controls);
host.use(
  createApp({
    isReady: () => mongoose.connection.readyState === 1,
    auth: { service, origin: "http://127.0.0.1:3100", production: false },
  }),
);
host.listen(4100, "127.0.0.1", () =>
  console.info("Browser fixture ready on loopback port 4100"),
);
