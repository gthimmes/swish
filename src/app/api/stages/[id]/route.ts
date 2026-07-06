import { prisma } from "@/lib/db";
import { badRequest, handle, notFound, pick } from "@/lib/api";
import { STAGE_CATEGORIES } from "@/lib/enums";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.category && !STAGE_CATEGORIES.includes(body.category)) return badRequest("invalid category");
  return handle(() =>
    prisma.stage.update({
      where: { id },
      data: pick(body, ["name", "color", "category", "order", "wipLimit"]),
    })
  );
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const url = new URL(req.url);
  const moveTo = url.searchParams.get("moveTo"); // stage id to reassign items to

  const stage = await prisma.stage.findUnique({
    where: { id },
    include: { _count: { select: { items: true } }, project: { include: { stages: true } } },
  });
  if (!stage) return notFound("Stage not found");
  if (stage.project.stages.length <= 1) return badRequest("A project must keep at least one stage");

  return handle(async () => {
    if (stage._count.items > 0) {
      const target =
        moveTo ?? stage.project.stages.find((s) => s.id !== id)!.id;
      await prisma.workItem.updateMany({ where: { stageId: id }, data: { stageId: target } });
    }
    await prisma.stage.delete({ where: { id } });
    return { ok: true };
  });
}
