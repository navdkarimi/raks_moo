import { randomUUID } from "node:crypto";
import { model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    mobile: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
      required: true,
    },
    mobileVerifiedAt: { type: Date, required: true },
    lastLoginAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel = model("User", userSchema);
