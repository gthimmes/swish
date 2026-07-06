import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.name) return badRequest("name is required");
  return handle(() =>
    prisma.label.create({
      data: { projectId, name: body.name, color: body.color ?? "#94a3b8" },
    })
  );
}
