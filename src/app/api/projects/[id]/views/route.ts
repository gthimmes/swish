import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";
import { GROUP_BY } from "@/lib/enums";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  return handle(() =>
    prisma.savedView.findMany({ where: { projectId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] })
  );
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.name) return badRequest("name is required");
  if (body.groupBy && !GROUP_BY.includes(body.groupBy)) return badRequest("invalid groupBy");

  return handle(async () => {
    const max = await prisma.savedView.aggregate({ where: { projectId }, _max: { order: true } });
    return prisma.savedView.create({
      data: {
        projectId,
        name: String(body.name).slice(0, 60),
        groupBy: body.groupBy ?? "none",
        filters: JSON.stringify(body.filters ?? {}),
        order: (max._max.order ?? -1) + 1,
      },
    });
  });
}
