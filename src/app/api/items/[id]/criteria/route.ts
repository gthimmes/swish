import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// Add an acceptance criterion (creates the spec if missing).
export async function POST(req: Request, { params }: Ctx) {
  const { id: workItemId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.text) return badRequest("text is required");

  return handle(async () => {
    const spec = await prisma.spec.upsert({
      where: { workItemId },
      create: { workItemId },
      update: {},
    });
    const max = await prisma.acceptanceCriterion.aggregate({
      where: { specId: spec.id },
      _max: { order: true },
    });
    return prisma.acceptanceCriterion.create({
      data: { specId: spec.id, text: body.text, order: (max._max.order ?? -1) + 1 },
    });
  });
}
