export default async function teardown() {
  const key = process.env.RAQS_E2E_KEY;
  if (!key) throw new Error("Missing browser test run key");
  const response = await fetch("http://127.0.0.1:4100/__test/database", {
    method: "DELETE",
    headers: { "x-e2e-key": key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`Browser test database cleanup failed: ${response.status}`);
}
