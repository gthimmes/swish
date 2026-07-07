import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// Add a dependency. body: { type: "blocks" | "blockedBy", otherId }
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { type, otherId } = body;
  if (!otherId || (type !== "blocks" && type !== "blockedBy")) {
    return badRequest("type ('blocks'|'blockedBy') and otherId are required");
  }
  if (otherId === id) return badRequest("an item cannot depend on itself");

  const blockerId = type === "blocks" ? id : otherId;
  const blockedId = type === "blocks" ? otherId : id;

  return handle(async () => {
    // avoid an exact duplicate or a direct 2-cycle
    const existing = await prisma.dependency.findFirst({
      where: {
        OR: [
          { blockerId, blockedId },
          { blockerId: blockedId, blockedId: blockerId },
        ],
      },
    });
    if (existing) return { ok: true, duplicate: true };
    await prisma.dependency.create({ data: { blockerId, blockedId } });
    return { ok: true };
  });
}
