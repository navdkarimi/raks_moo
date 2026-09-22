import { model, Schema } from "mongoose";

const challengeSchema = new Schema(
  {
    _id: { type: String, required: true }, // Normalized mobile; one active challenge per mobile.
    challengeId: { type: String, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, required: true, default: 0 },
    state: {
      type: String,
      enum: ["pending", "ready", "consumed", "failed"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    nextSendAt: { type: Date, required: true },
    deleteAfter: { type: Date, required: true },
  },
  { versionKey: false },
);
challengeSchema.index({ deleteAfter: 1 }, { expireAfterSeconds: 0 });

const sessionSchema = new Schema(
  {
    _id: { type: String, required: true }, // SHA-256 of the random session token.
    userId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const rateSchema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
rateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpChallengeModel = model("OtpChallenge", challengeSchema);
export const SessionModel = model("AuthSession", sessionSchema);
export const AuthRateModel = model("AuthRate", rateSchema);
