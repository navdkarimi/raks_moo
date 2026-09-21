import { createApp } from "./app.js";
import { readEnv } from "./config/env.js";
import { connectDatabase, disconnectDatabase, isDatabaseReady } from "./infrastructure/database.js";

async function start() {
  const env = readEnv();
  await connectDatabase(env.MONGODB_URI, env.NODE_ENV === "production");
  let stopping = false;
  const app = createApp({ isReady: () => !stopping && isDatabaseReady() });
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
        () => { clearTimeout(deadline); process.exit(0); },
        () => process.exit(1),
      );
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void start().catch(() => {
  console.error("API startup failed. Check environment variables and MongoDB connectivity.");
  process.exit(1);
});
