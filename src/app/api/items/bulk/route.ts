import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";
import { PRIORITIES } from "@/lib/enums";

// Bulk update or delete work items.
// Body: { ids: string[], patch?: {stageId?, assigneeId?, priority?}, delete?: boolean }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) return badRequest("ids is required");

  if (body.delete) {
    return handle(async () => {
      const res = await prisma.workItem.deleteMany({ where: { id: { in: ids } } });
      return { count: res.count };
    });
  }

  const patch = body.patch ?? {};
  if (patch.priority && !PRIORITIES.includes(patch.priority)) return badRequest("invalid priority");

  const data: Record<string, unknown> = {};
  if (patch.stageId !== undefined) data.stageId = patch.stageId;
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (Object.keys(data).length === 0) return badRequest("patch has no supported fields");

  return handle(async () => {
    const res = await prisma.workItem.updateMany({ where: { id: { in: ids } }, data });
    return { count: res.count };
  });
}
