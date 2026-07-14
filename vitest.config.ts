import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, "src") };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          // One shared test DB; run integration files serially with per-test reseed.
          fileParallelism: false,
          globalSetup: ["tests/integration/global-setup.ts"],
          env: { DATABASE_URL: "file:./test-int.db", NODE_ENV: "test" },
          hookTimeout: 30_000,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
