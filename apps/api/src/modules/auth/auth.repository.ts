import {
  AuthRateModel,
  OtpChallengeModel,
  SessionModel,
} from "./auth.models.js";
import { UserModel } from "../users/user.model.js";

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export class AuthRepository {
  async consumeQuota(
    key: string,
    limit: number,
    expiresAt: Date,
  ): Promise<boolean> {
    try {
      await AuthRateModel.findOneAndUpdate(
        { _id: key, count: { $lt: limit } },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, setDefaultsOnInsert: false },
      );
      return true;
    } catch (error) {
      if (isDuplicateKey(error)) return false;
      throw error;
    }
  }

  async reserveChallenge(input: {
    mobile: string;
    challengeId: string;
    codeHash: string;
    now: Date;
    expiresAt: Date;
    nextSendAt: Date;
  }): Promise<boolean> {
    const { mobile, now, ...values } = input;
    try {
      await OtpChallengeModel.findOneAndUpdate(
        { _id: mobile, nextSendAt: { $lte: now } },
        {
          $set: {
            ...values,
            attempts: 0,
            state: "pending",
            deleteAfter: new Date(now.getTime() + 86_400_000),
          },
        },
        { upsert: true, setDefaultsOnInsert: false },
      );
      return true;
    } catch (error) {
      if (isDuplicateKey(error)) return false;
      throw error;
    }
  }

  async finishDelivery(
    mobile: string,
    challengeId: string,
    state: "ready" | "failed",
  ) {
    return OtpChallengeModel.updateOne(
      { _id: mobile, challengeId, state: "pending" },
      { $set: { state } },
    );
  }

  async takeAttempt(
    mobile: string,
    challengeId: string,
    now: Date,
    maxAttempts: number,
  ) {
    // Reserve an attempt atomically before comparing. Parallel guesses share the same budget.
    return OtpChallengeModel.findOneAndUpdate(
      {
        _id: mobile,
        challengeId,
        state: "ready",
        expiresAt: { $gt: now },
        attempts: { $lt: maxAttempts },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    ).lean();
  }

  async consumeChallenge(
    mobile: string,
    challengeId: string,
    now: Date,
  ): Promise<boolean> {
    const result = await OtpChallengeModel.updateOne(
      { _id: mobile, challengeId, state: "ready", expiresAt: { $gt: now } },
      { $set: { state: "consumed" } },
    );
    return result.modifiedCount === 1;
  }

  async getOrCreateUser(mobile: string, now: Date) {
    try {
      return await UserModel.findOneAndUpdate(
        { mobile },
        {
          $setOnInsert: { mobile, mobileVerifiedAt: now },
          $set: { lastLoginAt: now },
        },
        { upsert: true, returnDocument: "after", runValidators: true },
      ).lean();
    } catch (error) {
      if (isDuplicateKey(error)) return UserModel.findOne({ mobile }).lean();
      throw error;
    }
  }

  async createSession(hash: string, userId: string, expiresAt: Date) {
    await SessionModel.create({ _id: hash, userId, expiresAt });
  }

  async findSession(hash: string, now: Date) {
    return SessionModel.findOne({ _id: hash, expiresAt: { $gt: now } }).lean();
  }

  async findUser(userId: string) {
    return UserModel.findById(userId).lean();
  }

  async revokeSession(hash: string) {
    await SessionModel.deleteOne({ _id: hash });
  }
}

export async function ensureAuthIndexes() {
  await Promise.all([
    UserModel.createIndexes(),
    OtpChallengeModel.createIndexes(),
    SessionModel.createIndexes(),
    AuthRateModel.createIndexes(),
  ]);
}
