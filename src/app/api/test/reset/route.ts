import { prisma } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { handle } from "@/lib/api";

// Test-only: restore the database to a known seed state. Disabled in production.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not available", { status: 403 });
  }
  return handle(async () => {
    const result = await seedDatabase(prisma);
    return { ok: true, ...result };
  });
}
