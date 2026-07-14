import { prisma } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

/** Restore the shared test DB to the known seed state. Call in beforeEach. */
export async function resetDb() {
  await seedDatabase(prisma);
}

/** The seeded project (SWISH) with its stages. */
export async function seededProject() {
  const project = await prisma.project.findFirstOrThrow({ where: { key: "SWISH" }, include: { stages: true } });
  return project;
}

/** Find a stage by name within the seeded project. */
export async function stageByName(name: string) {
  return prisma.stage.findFirstOrThrow({ where: { name, project: { key: "SWISH" } } });
}

/** Find a work item by its human key (e.g. "SWISH-3"). */
export async function itemByKey(key: string) {
  return prisma.workItem.findFirstOrThrow({ where: { key } });
}

/** Build a route-handler context whose params resolve to the given values. */
export function ctx<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

/** POST/PATCH/DELETE Request helper with a JSON body. */
export function jsonRequest(method: string, body?: unknown) {
  return new Request("http://test.local/api", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Read a route handler's Response as JSON plus its status. */
export async function readJson(res: Response): Promise<{ status: number; body: any }> {
  const status = res.status;
  const text = await res.text();
  return { status, body: text ? JSON.parse(text) : null };
}
