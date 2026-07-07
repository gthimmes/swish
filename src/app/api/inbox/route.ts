import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";
import { itemListInclude } from "@/lib/include";

// Per-user inbox: open items assigned to the user + comments that @mention them.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const userId = url.searchParams.get("userId");
  if (!projectId || !userId) return badRequest("projectId and userId are required");

  return handle(async () => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("user not found");
    const firstName = user.name.split(" ")[0];

    const doneStageIds = (
      await prisma.stage.findMany({ where: { projectId, category: "DONE" }, select: { id: true } })
    ).map((s) => s.id);

    const assigned = await prisma.workItem.findMany({
      where: { projectId, assigneeId: userId, stageId: { notIn: doneStageIds } },
      include: itemListInclude,
      orderBy: [{ dueDate: "asc" }, { rank: "asc" }],
    });

    const mentionRows = await prisma.activity.findMany({
      where: {
        kind: "comment",
        body: { contains: `@${firstName}` },
        workItem: { projectId },
      },
      include: {
        user: true,
        workItem: { select: { id: true, key: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { assigned, mentions: mentionRows };
  });
}
