import { prisma } from "@/lib/db";
import { handle } from "@/lib/api";

export async function GET() {
  return handle(() => prisma.user.findMany({ orderBy: { name: "asc" } }));
}
