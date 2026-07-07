import { prisma } from "@/lib/db";
import { handle } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).slice(0, 40);
  if (body.order !== undefined) data.order = body.order;
  if (body.options !== undefined) {
    data.options = JSON.stringify(Array.isArray(body.options) ? body.options.map(String) : []);
  }
  return handle(() => prisma.customField.update({ where: { id }, data }));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    await prisma.customField.delete({ where: { id } });
    return { ok: true };
  });
}
