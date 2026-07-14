import { describe, it, expect, beforeEach } from "vitest";
import { GET as listItems, POST as createItem } from "@/app/api/items/route";
import { PATCH as patchItem, DELETE as deleteItem, GET as getItem } from "@/app/api/items/[id]/route";
import { GET as getFlow } from "@/app/api/projects/[id]/flow/route";
import { prisma } from "@/lib/db";
import { resetDb, seededProject, stageByName, itemByKey, ctx, jsonRequest, readJson } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

function itemsUrl(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return new Request(`http://test.local/api/items?${qs}`);
}

describe("items API", () => {
  it("lists items for a project", async () => {
    const project = await seededProject();
    const { status, body } = await readJson(await listItems(itemsUrl({ projectId: project.id })));
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty("key");
  });

  it("requires projectId", async () => {
    const { status, body } = await readJson(await listItems(itemsUrl({})));
    expect(status).toBe(400);
    expect(body.error).toMatch(/projectId/);
  });

  it("filters by type", async () => {
    const project = await seededProject();
    const { body } = await readJson(await listItems(itemsUrl({ projectId: project.id, type: "BUG" })));
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((i: { type: string }) => i.type === "BUG")).toBe(true);
  });

  it("full-text search matches title/key/description", async () => {
    const project = await seededProject();
    const { body } = await readJson(await listItems(itemsUrl({ projectId: project.id, q: "velocity" })));
    expect(body.length).toBeGreaterThan(0);
    expect(
      body.some((i: { title: string }) => /velocity/i.test(i.title))
    ).toBe(true);
  });

  it("creates an item, assigns the next key, and records an initial transition", async () => {
    const project = await seededProject();
    const before = await prisma.stageTransition.count();
    const res = await createItem(jsonRequest("POST", { projectId: project.id, title: "New integration item", type: "TASK" }));
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.key).toMatch(/^SWISH-\d+$/);
    expect(body.title).toBe("New integration item");

    // An initial (null -> stage) transition was written.
    const trs = await prisma.stageTransition.findMany({ where: { workItemId: body.id } });
    expect(trs).toHaveLength(1);
    expect(trs[0].fromStageId).toBeNull();
    expect(await prisma.stageTransition.count()).toBe(before + 1);
  });

  it("rejects invalid type/priority on create", async () => {
    const project = await seededProject();
    const r1 = await readJson(await createItem(jsonRequest("POST", { projectId: project.id, title: "x", type: "NONSENSE" })));
    expect(r1.status).toBe(400);
    const r2 = await readJson(await createItem(jsonRequest("POST", { projectId: project.id, title: "x", priority: "WHENEVER" })));
    expect(r2.status).toBe(400);
  });

  it("requires projectId and title on create", async () => {
    const { status } = await readJson(await createItem(jsonRequest("POST", { title: "no project" })));
    expect(status).toBe(400);
  });

  it("patches a field and returns the updated item", async () => {
    const item = await itemByKey("SWISH-3");
    const res = await patchItem(jsonRequest("PATCH", { title: "Renamed via test" }), ctx({ id: item.id }));
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.title).toBe("Renamed via test");
  });

  it("moving stages writes a timestamped transition and an activity event", async () => {
    const item = await itemByKey("SWISH-3");
    const done = await stageByName("Done");
    const review = await stageByName("In Review");
    // Move to In Review (from wherever it is).
    const trBefore = await prisma.stageTransition.count({ where: { workItemId: item.id } });
    await patchItem(jsonRequest("PATCH", { stageId: review.id }), ctx({ id: item.id }));
    await patchItem(jsonRequest("PATCH", { stageId: done.id }), ctx({ id: item.id }));

    const trs = await prisma.stageTransition.findMany({ where: { workItemId: item.id }, orderBy: { createdAt: "asc" } });
    expect(trs.length).toBe(trBefore + 2);
    expect(trs.at(-1)!.toStageId).toBe(done.id);

    const events = await prisma.activity.findMany({ where: { workItemId: item.id, kind: "event", body: { contains: "moved" } } });
    expect(events.length).toBeGreaterThanOrEqual(2);
  });

  it("does not write a transition when the stage is unchanged", async () => {
    const item = await itemByKey("SWISH-3");
    const before = await prisma.stageTransition.count({ where: { workItemId: item.id } });
    await patchItem(jsonRequest("PATCH", { stageId: item.stageId, title: "same stage" }), ctx({ id: item.id }));
    const after = await prisma.stageTransition.count({ where: { workItemId: item.id } });
    expect(after).toBe(before);
  });

  it("deletes an item and cascades its transitions", async () => {
    const item = await itemByKey("SWISH-3");
    await deleteItem(jsonRequest("DELETE"), ctx({ id: item.id }));
    const { status } = await readJson(await getItem(jsonRequest("GET"), ctx({ id: item.id })));
    expect(status).toBe(404);
    expect(await prisma.stageTransition.count({ where: { workItemId: item.id } })).toBe(0);
  });

  it("flow endpoint derives metrics from the seeded transition history", async () => {
    const project = await seededProject();
    const { status, body } = await readJson(await getFlow(jsonRequest("GET"), ctx({ id: project.id })));
    expect(status).toBe(200);
    expect(body.cycleTime.count).toBeGreaterThan(0);
    expect(body.cycleTime.medianDays).toBeGreaterThan(0);
    expect(body.cycleTime.p85Days).toBeGreaterThanOrEqual(body.cycleTime.medianDays);
    expect(body.throughput.total).toBeGreaterThan(0);
    const summed = body.throughput.weeks.reduce((n: number, w: { count: number }) => n + w.count, 0);
    expect(summed).toBe(body.throughput.total);
    expect(body.wip.count).toBeGreaterThan(0);
  });

  it("flow reacts to a live stage move into Done", async () => {
    const project = await seededProject();
    // Pick a backlog item, push it straight to Done — throughput total should rise by one.
    const before = await readJson(await getFlow(jsonRequest("GET"), ctx({ id: project.id })));
    const backlogItem = await prisma.workItem.findFirstOrThrow({
      where: { projectId: project.id, type: { not: "EPIC" }, stage: { category: "BACKLOG" } },
    });
    const done = await stageByName("Done");
    await patchItem(jsonRequest("PATCH", { stageId: done.id }), ctx({ id: backlogItem.id }));
    const after = await readJson(await getFlow(jsonRequest("GET"), ctx({ id: project.id })));
    expect(after.body.throughput.total).toBe(before.body.throughput.total + 1);
  });
});
