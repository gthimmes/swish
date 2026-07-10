import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";
import { itemListInclude } from "@/lib/include";
import { ITEM_TYPES, PRIORITIES } from "@/lib/enums";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return badRequest("projectId is required");

  const assigneeId = url.searchParams.get("assigneeId");
  const type = url.searchParams.get("type");
  const priority = url.searchParams.get("priority");
  const labelId = url.searchParams.get("labelId");
  const q = url.searchParams.get("q");

  const where: Record<string, unknown> = { projectId };
  if (assigneeId) where.assigneeId = assigneeId === "none" ? null : assigneeId;
  if (type) where.type = type;
  if (priority) where.priority = priority;
  if (labelId) where.labels = { some: { id: labelId } };
  if (q)
    where.OR = [
      { title: { contains: q } },
      { key: { contains: q } },
      { description: { contains: q } },
    ];

  // Custom-field filters: field_<id>=value (AND across fields).
  const fieldConds: unknown[] = [];
  for (const [k, v] of url.searchParams) {
    if (k.startsWith("field_") && v) {
      fieldConds.push({ fieldValues: { some: { fieldId: k.slice("field_".length), value: v } } });
    }
  }
  if (fieldConds.length) where.AND = fieldConds;

  return handle(() =>
    prisma.workItem.findMany({
      where,
      include: itemListInclude,
      orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
    })
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { projectId, title } = body;
  if (!projectId || !title) return badRequest("projectId and title are required");
  if (body.type && !ITEM_TYPES.includes(body.type)) return badRequest("invalid type");
  if (body.priority && !PRIORITIES.includes(body.priority)) return badRequest("invalid priority");

  return handle(async () => {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { seq: { increment: 1 } },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    const stageId =
      body.stageId ?? project.stages[0]?.id;
    if (!stageId) throw new Error("Project has no stages");

    // Place new items at the top of their column.
    const min = await prisma.workItem.aggregate({
      where: { stageId },
      _min: { rank: true },
    });
    const rank = (min._min.rank ?? 1000) - 100;

    const item = await prisma.workItem.create({
      data: {
        key: `${project.key}-${project.seq}`,
        title,
        type: body.type ?? "STORY",
        priority: body.priority ?? "MEDIUM",
        estimate: body.estimate ?? null,
        description: body.description ?? null,
        rank,
        projectId,
        stageId,
        assigneeId: body.assigneeId ?? null,
        epicId: body.epicId ?? null,
        labels: body.labelIds ? { connect: body.labelIds.map((id: string) => ({ id })) } : undefined,
        spec: body.withSpec ? { create: {} } : undefined,
      },
      include: itemListInclude,
    });

    await prisma.activity.create({
      data: { workItemId: item.id, kind: "event", body: `created ${item.key}` },
    });
    // Seed the transition history with the item's initial placement.
    await prisma.stageTransition.create({
      data: { workItemId: item.id, fromStageId: null, toStageId: stageId },
    });
    return item;
  });
}
