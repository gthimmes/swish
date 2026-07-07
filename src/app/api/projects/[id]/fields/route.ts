import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";
import { FIELD_TYPES } from "@/lib/enums";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  return handle(() =>
    prisma.customField.findMany({ where: { projectId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] })
  );
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.name) return badRequest("name is required");
  if (body.type && !FIELD_TYPES.includes(body.type)) return badRequest("invalid type");

  const options = Array.isArray(body.options) ? body.options.filter(Boolean).map(String) : [];

  return handle(async () => {
    const max = await prisma.customField.aggregate({ where: { projectId }, _max: { order: true } });
    return prisma.customField.create({
      data: {
        projectId,
        name: String(body.name).slice(0, 40),
        type: body.type ?? "TEXT",
        options: JSON.stringify(options),
        order: (max._max.order ?? -1) + 1,
      },
    });
  });
}
