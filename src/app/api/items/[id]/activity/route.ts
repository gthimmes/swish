import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id: workItemId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.body) return badRequest("body is required");
  return handle(() =>
    prisma.activity.create({
      data: {
        workItemId,
        kind: "comment",
        body: body.body,
        userId: body.userId ?? null,
        parentId: body.parentId ?? null,
      },
      include: { user: true },
    })
  );
}
