import { prisma } from "@/lib/db";
import { handle, pick } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return handle(() =>
    prisma.acceptanceCriterion.update({
      where: { id },
      data: pick(body, ["text", "done", "order"]),
    })
  );
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    await prisma.acceptanceCriterion.delete({ where: { id } });
    return { ok: true };
  });
}
