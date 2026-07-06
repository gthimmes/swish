import { prisma } from "@/lib/db";
import { badRequest, handle, pick } from "@/lib/api";
import { TEST_STATUSES } from "@/lib/enums";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.status && !TEST_STATUSES.includes(body.status)) return badRequest("invalid status");
  return handle(() =>
    prisma.testPlanItem.update({
      where: { id },
      data: pick(body, ["text", "status", "order"]),
    })
  );
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    await prisma.testPlanItem.delete({ where: { id } });
    return { ok: true };
  });
}
