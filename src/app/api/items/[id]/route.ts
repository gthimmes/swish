import { prisma } from "@/lib/db";
import { badRequest, handle, notFound } from "@/lib/api";
import { itemDetailInclude } from "@/lib/include";
import { ITEM_TYPES, PRIORITIES } from "@/lib/enums";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const item = await prisma.workItem.findUnique({
    where: { id },
    include: itemDetailInclude,
  });
  if (!item) return notFound("Item not found");
  return Response.json(item);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.type && !ITEM_TYPES.includes(body.type)) return badRequest("invalid type");
  if (body.priority && !PRIORITIES.includes(body.priority)) return badRequest("invalid priority");

  return handle(async () => {
    const existing = await prisma.workItem.findUnique({
      where: { id },
      include: { stage: true },
    });
    if (!existing) throw new Error("Item not found");

    const data: Record<string, unknown> = {};
    for (const k of ["title", "type", "priority", "estimate", "description", "rank", "stageId", "assigneeId", "epicId"] as const) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.labelIds !== undefined) {
      data.labels = { set: body.labelIds.map((lid: string) => ({ id: lid })) };
    }

    const item = await prisma.workItem.update({
      where: { id },
      data,
      include: itemDetailInclude,
    });

    // Activity trail for stage moves.
    if (body.stageId && body.stageId !== existing.stageId) {
      await prisma.activity.create({
        data: {
          workItemId: id,
          kind: "event",
          body: `moved from ${existing.stage.name} to ${item.stage.name}`,
        },
      });
    }
    return item;
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    await prisma.workItem.delete({ where: { id } });
    return { ok: true };
  });
}
