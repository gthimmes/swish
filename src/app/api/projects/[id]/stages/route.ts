import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";
import { STAGE_CATEGORIES } from "@/lib/enums";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, color, category } = body;
  if (!name) return badRequest("name is required");
  if (category && !STAGE_CATEGORIES.includes(category)) return badRequest("invalid category");

  return handle(async () => {
    const max = await prisma.stage.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    return prisma.stage.create({
      data: {
        projectId,
        name,
        color: color ?? "#64748b",
        category: category ?? "IN_PROGRESS",
        order: (max._max.order ?? -1) + 1,
      },
    });
  });
}
