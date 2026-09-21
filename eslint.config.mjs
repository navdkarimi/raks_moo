import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals.map((config) => ({ ...config, files: ["apps/web/**/*.{ts,tsx,js,mjs}"] })),
  { rules: { "@typescript-eslint/consistent-type-imports": "error" } },
);
