import type { ErrorRequestHandler } from "express";
import type { ApiError } from "@raqs/contracts";

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (res.headersSent) {
    _next(error);
    return;
  }
  const type = typeof error === "object" && error !== null && "type" in error ? error.type : undefined;
  const invalidJson = type === "entity.parse.failed";
  const tooLarge = type === "entity.too.large";
  const status = invalidJson ? 400 : tooLarge ? 413 : 500;
  const body: ApiError = {
    error: {
      code: invalidJson ? "INVALID_JSON" : tooLarge ? "PAYLOAD_TOO_LARGE" : "INTERNAL_ERROR",
      message: invalidJson ? "ساختار درخواست معتبر نیست." : tooLarge ? "حجم درخواست بیش از حد مجاز است." : "خطای داخلی رخ داده است.",
    },
  };
  res.status(status).json(body);
};
