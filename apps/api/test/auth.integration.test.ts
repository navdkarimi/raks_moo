import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { otpRequestedSchema, sessionResponseSchema } from "@raqs/contracts";
import { createApp } from "../src/app.js";
import {
  AuthRepository,
  ensureAuthIndexes,
} from "../src/modules/auth/auth.repository.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { defaultAuthPolicy } from "../src/modules/auth/auth.policy.js";
import {
  AuthRateModel,
  OtpChallengeModel,
  SessionModel,
} from "../src/modules/auth/auth.models.js";
import { UserModel } from "../src/modules/users/user.model.js";
import {
  UnconfiguredSmsSender,
  type SmsSender,
} from "../src/modules/auth/sms-sender.js";

const origin = "http://localhost:3000";
const databaseName = `raqs_auth_test_${randomUUID().replaceAll("-", "")}`;
const sent = new Map<string, string>();
let currentTime = Date.now();
let sendFails = false;
const sms: SmsSender = {
  available: true,
  async sendOtp({ mobile, code }) {
    if (sendFails) throw new Error("provider-private-key");
    sent.set(mobile, code);
  },
};
const repository = new AuthRepository();
const service = new AuthService(
  repository,
  sms,
  "test-only-secret-not-for-production",
  defaultAuthPolicy,
  () => new Date(currentTime),
);
const app = createApp({
  isReady: () => true,
  auth: { service, origin, production: true },
});
let phoneSequence = 1000000;
const nextMobile = () => `+98912${phoneSequence++}`;

before(async () => {
  await mongoose.connect(
    process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017",
    { dbName: databaseName, serverSelectionTimeoutMS: 5000 },
  );
  await ensureAuthIndexes();
});
after(async () => {
  // Only delete the unique database created by this test process.
  if (
    mongoose.connection.name === databaseName &&
    /^raqs_auth_test_[a-f0-9]{32}$/.test(databaseName)
  ) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

async function issue(mobile: string) {
  const response = await request(app)
    .post("/api/v1/auth/otp/request")
    .set("Origin", origin)
    .send({ mobile })
    .expect(202);
  return otpRequestedSchema.parse(response.body);
}

test("verified OTP creates a customer session; replay fails and logout revokes it", async () => {
  const mobile = nextMobile();
  const challenge = await issue(mobile);
  assert.equal(await UserModel.countDocuments({ mobile }), 0);
  const code = sent.get(mobile)!;
  const stored = await OtpChallengeModel.findById(mobile).lean();
  assert.ok(
    stored && stored.codeHash !== code && stored.codeHash.length === 64,
  );
  const response = await request(app)
    .post("/api/v1/auth/otp/verify")
    .set("Origin", origin)
    .send({ mobile, challengeId: challenge.challengeId, code })
    .expect(200);
  assert.equal(sessionResponseSchema.parse(response.body).user.mobile, mobile);
  assert.equal(response.body.token, undefined);
  const rawCookie = String(response.headers["set-cookie"]?.[0]);
  assert.match(rawCookie, /HttpOnly/);
  assert.match(rawCookie, /Secure/);
  assert.match(rawCookie, /SameSite=Lax/);
  const cookie = rawCookie.split(";")[0]!;
  const rawToken = cookie.split("=")[1]!;
  assert.equal(await SessionModel.findById(rawToken), null);
  await request(app).get("/api/v1/auth/me").set("Cookie", cookie).expect(200);
  await request(app)
    .post("/api/v1/auth/otp/verify")
    .set("Origin", origin)
    .send({ mobile, challengeId: challenge.challengeId, code })
    .expect(400);
  await request(app)
    .post("/api/v1/auth/logout")
    .set("Origin", origin)
    .set("Cookie", cookie)
    .expect(204);
  await request(app).get("/api/v1/auth/me").set("Cookie", cookie).expect(401);
});

test("parallel successful verification can issue only one session", async () => {
  const mobile = nextMobile();
  const challenge = await issue(mobile);
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      request(app)
        .post("/api/v1/auth/otp/verify")
        .set("Origin", origin)
        .send({
          mobile,
          challengeId: challenge.challengeId,
          code: sent.get(mobile),
        }),
    ),
  );
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 400).length, 3);
});

test("wrong attempts are bounded even under concurrency", async () => {
  const mobile = nextMobile();
  const challenge = await issue(mobile);
  const wrong = sent.get(mobile) === "000000" ? "111111" : "000000";
  const results = await Promise.all(
    Array.from({ length: 9 }, () =>
      request(app)
        .post("/api/v1/auth/otp/verify")
        .set("Origin", origin)
        .send({ mobile, challengeId: challenge.challengeId, code: wrong }),
    ),
  );
  assert.ok(results.every((result) => result.status === 400));
  assert.equal(
    (await OtpChallengeModel.findById(mobile))?.attempts,
    defaultAuthPolicy.maxAttempts,
  );
  await request(app)
    .post("/api/v1/auth/otp/verify")
    .set("Origin", origin)
    .send({
      mobile,
      challengeId: challenge.challengeId,
      code: sent.get(mobile),
    })
    .expect(400);
});

test("expiry is enforced without waiting for MongoDB TTL cleanup", async () => {
  const mobile = nextMobile();
  const challenge = await issue(mobile);
  currentTime += (defaultAuthPolicy.otpLifetimeSeconds + 1) * 1000;
  await request(app)
    .post("/api/v1/auth/otp/verify")
    .set("Origin", origin)
    .send({
      mobile,
      challengeId: challenge.challengeId,
      code: sent.get(mobile),
    })
    .expect(400);
});

test("resend invalidates the previous code and concurrent requests respect cooldown", async () => {
  const mobile = nextMobile();
  const first = await issue(mobile);
  const oldCode = sent.get(mobile);
  await request(app)
    .post("/api/v1/auth/otp/request")
    .set("Origin", origin)
    .send({ mobile })
    .expect(429);
  currentTime += (defaultAuthPolicy.resendDelaySeconds + 1) * 1000;
  const second = await issue(mobile);
  assert.notEqual(first.challengeId, second.challengeId);
  await request(app)
    .post("/api/v1/auth/otp/verify")
    .set("Origin", origin)
    .send({ mobile, challengeId: first.challengeId, code: oldCode })
    .expect(400);
  const another = nextMobile();
  const results = await Promise.all(
    Array.from({ length: 3 }, () =>
      request(app)
        .post("/api/v1/auth/otp/request")
        .set("Origin", origin)
        .send({ mobile: another }),
    ),
  );
  assert.equal(results.filter((result) => result.status === 202).length, 1);
  assert.equal(results.filter((result) => result.status === 429).length, 2);
});

test("untrusted origins and unavailable SMS cannot create usable challenges", async () => {
  const mobile = nextMobile();
  await request(app)
    .post("/api/v1/auth/otp/request")
    .set("Origin", "https://untrusted.example")
    .send({ mobile })
    .expect(403);
  await request(app)
    .post("/api/v1/auth/otp/request")
    .send({ mobile })
    .expect(403);
  sendFails = true;
  try {
    const failed = await request(app)
      .post("/api/v1/auth/otp/request")
      .set("Origin", origin)
      .send({ mobile })
      .expect(503);
    assert.ok(!failed.text.includes("provider-private-key"));
    assert.equal((await OtpChallengeModel.findById(mobile))?.state, "failed");
  } finally {
    sendFails = false;
  }
  const disabled = new AuthService(
    repository,
    new UnconfiguredSmsSender(),
    "test-only-secret-not-for-production",
    defaultAuthPolicy,
  );
  await assert.rejects(() => disabled.requestCode(nextMobile(), "127.0.0.1"), {
    code: "SMS_UNAVAILABLE",
  });
});

test("blocking an account invalidates access through its existing session", async () => {
  const mobile = nextMobile();
  const challenge = await issue(mobile);
  const response = await request(app)
    .post("/api/v1/auth/otp/verify")
    .set("Origin", origin)
    .send({
      mobile,
      challengeId: challenge.challengeId,
      code: sent.get(mobile),
    })
    .expect(200);
  const cookie = String(response.headers["set-cookie"]?.[0]).split(";")[0]!;
  await UserModel.updateOne({ mobile }, { $set: { status: "blocked" } });
  await request(app).get("/api/v1/auth/me").set("Cookie", cookie).expect(401);
});

test("quota updates are atomic across repository instances", async () => {
  const key = `test:${randomUUID()}`;
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      new AuthRepository().consumeQuota(key, 3, new Date(Date.now() + 60_000)),
    ),
  );
  assert.equal(results.filter(Boolean).length, 3);
  assert.equal((await AuthRateModel.findById(key))?.count, 3);
});

test("expired sessions are rejected even while their records still exist", async () => {
  const mobile = nextMobile();
  const challenge = await issue(mobile);
  const response = await request(app)
    .post("/api/v1/auth/otp/verify")
    .set("Origin", origin)
    .send({
      mobile,
      challengeId: challenge.challengeId,
      code: sent.get(mobile),
    })
    .expect(200);
  const cookie = String(response.headers["set-cookie"]?.[0]).split(";")[0]!;
  currentTime += (defaultAuthPolicy.sessionLifetimeSeconds + 1) * 1000;
  assert.ok(await SessionModel.exists({ userId: response.body.user.id }));
  await request(app).get("/api/v1/auth/me").set("Cookie", cookie).expect(401);
});
