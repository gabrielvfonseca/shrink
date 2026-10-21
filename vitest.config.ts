import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules", "dist", ".git"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
