import { prisma } from "@/lib/db";
import { badRequest, handle, pick } from "@/lib/api";
import { SPEC_STATUSES } from "@/lib/enums";

type Ctx = { params: Promise<{ id: string }> };

// Upsert the structured spec for an item.
export async function PUT(req: Request, { params }: Ctx) {
  const { id: workItemId } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.status && !SPEC_STATUSES.includes(body.status)) return badRequest("invalid status");

  const fields = pick(body, ["problem", "goals", "nonGoals", "approach", "risks", "status"]);

  return handle(() =>
    prisma.spec.upsert({
      where: { workItemId },
      create: { workItemId, ...fields },
      update: fields,
      include: {
        criteria: { orderBy: { order: "asc" } },
        tests: { orderBy: { order: "asc" } },
      },
    })
  );
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: workItemId } = await params;
  return handle(async () => {
    await prisma.spec.deleteMany({ where: { workItemId } });
    return { ok: true };
  });
}
