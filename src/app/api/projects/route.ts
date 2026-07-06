import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";

export async function GET() {
  return handle(() =>
    prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { items: true } } },
    })
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { key, name, description } = body;
  if (!key || !name) return badRequest("key and name are required");

  return handle(async () => {
    const project = await prisma.project.create({
      data: {
        key: String(key).toUpperCase(),
        name,
        description: description ?? null,
        stages: {
          create: [
            { name: "Backlog", color: "#64748b", category: "BACKLOG", order: 0 },
            { name: "Todo", color: "#0ea5e9", category: "IN_PROGRESS", order: 1 },
            { name: "In Progress", color: "#3b82f6", category: "IN_PROGRESS", order: 2 },
            { name: "Done", color: "#22c55e", category: "DONE", order: 3 },
          ],
        },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    return project;
  });
}
