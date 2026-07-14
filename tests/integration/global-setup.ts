import { execSync } from "node:child_process";
import fs from "node:fs";

// Provision a dedicated test database once for the whole integration run:
// wipe any leftover file, then apply the migration history to build the schema.
// Per-test seeding is handled by resetDb() in helpers.ts.
export default function setup() {
  const url = "file:./test-int.db";
  for (const f of ["test-int.db", "test-int.db-journal", "test-int.db-wal", "test-int.db-shm"]) {
    try {
      fs.rmSync(f);
    } catch {
      // not present — fine
    }
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
