import { prisma } from "@/lib/db";
import { handle } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    await prisma.dependency.delete({ where: { id } });
    return { ok: true };
  });
}
