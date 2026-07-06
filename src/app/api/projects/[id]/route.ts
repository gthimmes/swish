import { prisma } from "@/lib/db";
import { handle, notFound, pick } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      stages: { orderBy: { order: "asc" } },
      labels: { orderBy: { name: "asc" } },
    },
  });
  if (!project) return notFound("Project not found");
  return Response.json(project);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return handle(() =>
    prisma.project.update({
      where: { id },
      data: pick(body, ["name", "description", "groupBy"]),
    })
  );
}
