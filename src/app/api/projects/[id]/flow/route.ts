import { prisma } from "@/lib/db";
import { handle } from "@/lib/api";
import { computeFlowMetrics } from "@/lib/flow";

type Ctx = { params: Promise<{ id: string }> };

// Flow metrics for a project: cycle time, WIP aging, and throughput,
// computed from the stage-transition history.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: projectId } = await params;
  return handle(async () => {
    const [stages, items, transitions] = await Promise.all([
      prisma.stage.findMany({ where: { projectId }, select: { id: true, name: true, category: true } }),
      prisma.workItem.findMany({
        where: { projectId, type: { not: "EPIC" } },
        select: { id: true, key: true, title: true, stageId: true },
      }),
      prisma.stageTransition.findMany({
        where: { workItem: { projectId } },
        select: { workItemId: true, fromStageId: true, toStageId: true, createdAt: true },
      }),
    ]);
    return computeFlowMetrics(items, stages, transitions, Date.now());
  });
}
