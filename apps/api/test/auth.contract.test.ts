import assert from "node:assert/strict";
import test from "node:test";
import {
  mobileSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from "@raqs/contracts";

test("Iranian mobile forms normalize to one identity", () => {
  for (const value of [
    "09123456789",
    "۰۹۱۲۳۴۵۶۷۸۹",
    "٠٩١٢٣٤٥٦٧٨٩",
    "+98 912 345 6789",
    "00989123456789",
  ]) {
    assert.equal(mobileSchema.parse(value), "+989123456789");
  }
});

test("malformed phones and attempts to assign privileges are rejected", () => {
  for (const value of [
    "09123",
    "+14155552671",
    "abc09123456789",
    "02112345678",
  ]) {
    assert.equal(mobileSchema.safeParse(value).success, false);
  }
  assert.equal(
    requestOtpSchema.safeParse({ mobile: "09123456789", role: "admin" })
      .success,
    false,
  );
});

test("OTP input accepts Persian digits without accepting extra data", () => {
  const input = {
    mobile: "09123456789",
    challengeId: "bd6cad65-1c7a-49ab-9eb4-a750025d6410",
    code: "۱۲۳۴۵۶",
  };
  assert.equal(verifyOtpSchema.parse(input).code, "123456");
  assert.equal(
    verifyOtpSchema.safeParse({ ...input, code: "12345" }).success,
    false,
  );
});
