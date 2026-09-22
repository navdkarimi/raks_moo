import { createApp } from "./app.js";
import { readEnv } from "./config/env.js";
import {
  connectDatabase,
  disconnectDatabase,
  isDatabaseReady,
} from "./infrastructure/database.js";
import {
  AuthRepository,
  ensureAuthIndexes,
} from "./modules/auth/auth.repository.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { defaultAuthPolicy } from "./modules/auth/auth.policy.js";
import { UnconfiguredSmsSender } from "./modules/auth/sms-sender.js";

async function start() {
  const env = readEnv();
  await connectDatabase(env.MONGODB_URI, env.NODE_ENV === "production");
  await ensureAuthIndexes();
  let stopping = false;
  const app = createApp({
    isReady: () => !stopping && isDatabaseReady(),
    auth: {
      service: new AuthService(
        new AuthRepository(),
        new UnconfiguredSmsSender(),
        env.AUTH_SECRET,
        defaultAuthPolicy,
      ),
      origin: env.WEB_ORIGIN,
      production: env.NODE_ENV === "production",
    },
  });
  const server = app.listen(env.PORT, () => {
    console.info(`API listening on port ${env.PORT}`);
  });

  server.on("error", () => {
    console.error("API failed to listen. Check the configured port.");
    void disconnectDatabase().finally(() => process.exit(1));
  });

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10_000);
    deadline.unref();
    server.close(() => {
      void disconnectDatabase().then(
        () => {
          clearTimeout(deadline);
          process.exit(0);
        },
        () => process.exit(1),
      );
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void start().catch(() => {
  console.error(
    "API startup failed. Check environment variables and MongoDB connectivity.",
  );
  process.exit(1);
});
