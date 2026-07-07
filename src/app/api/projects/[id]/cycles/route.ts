import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  return handle(() =>
    prisma.cycle.findMany({ where: { projectId }, orderBy: { startDate: "asc" } })
  );
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.startDate || !body.endDate) {
    return badRequest("name, startDate and endDate are required");
  }
  return handle(() =>
    prisma.cycle.create({
      data: {
        projectId,
        name: String(body.name).slice(0, 60),
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
    })
  );
}
