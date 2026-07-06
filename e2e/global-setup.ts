import { execSync } from "node:child_process";

/** Reseed the database to a known state before the E2E run. */
export default function globalSetup() {
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}
