import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";
const parsedOrigin = new URL(apiOrigin);
if (
  !["http:", "https:"].includes(parsedOrigin.protocol) ||
  parsedOrigin.origin !== apiOrigin
) {
  throw new Error(
    "API_ORIGIN must be an HTTP(S) origin without a path or credentials",
  );
}

const config: NextConfig = {
  distDir: process.env.RAQS_E2E === "1" ? ".next-e2e" : ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@raqs/contracts"],
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` },
    ];
  },
};

export default config;
