import { describe, it, expect, beforeEach } from "vitest";
import { PUT as putSpec, DELETE as deleteSpec } from "@/app/api/items/[id]/spec/route";
import { POST as addCriterion } from "@/app/api/items/[id]/criteria/route";
import { POST as addTest } from "@/app/api/items/[id]/tests/route";
import { PATCH as patchCriterion, DELETE as delCriterion } from "@/app/api/criteria/[id]/route";
import { PATCH as patchTest, DELETE as delTest } from "@/app/api/tests/[id]/route";
import { prisma } from "@/lib/db";
import { resetDb, itemByKey, ctx, jsonRequest, readJson } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

/** An item that starts without a spec (WIP-limits task in the seed). */
async function specless() {
  return itemByKey("SWISH-6");
}

describe("spec API", () => {
  it("upserts a spec: creates on first PUT, updates on the second", async () => {
    const item = await specless();
    const r1 = await readJson(await putSpec(jsonRequest("PUT", { problem: "P1", status: "DRAFT" }), ctx({ id: item.id })));
    expect(r1.status).toBe(200);
    expect(r1.body.problem).toBe("P1");
    expect(r1.body.status).toBe("DRAFT");

    const r2 = await readJson(await putSpec(jsonRequest("PUT", { problem: "P2", status: "APPROVED" }), ctx({ id: item.id })));
    expect(r2.body.problem).toBe("P2");
    expect(r2.body.status).toBe("APPROVED");
    expect(r2.body.id).toBe(r1.body.id); // same spec, upserted

    expect(await prisma.spec.count({ where: { workItemId: item.id } })).toBe(1);
  });

  it("rejects an invalid spec status", async () => {
    const item = await specless();
    const { status } = await readJson(await putSpec(jsonRequest("PUT", { status: "SHIPPED" }), ctx({ id: item.id })));
    expect(status).toBe(400);
  });

  it("adds acceptance criteria with incrementing order, creating the spec if needed", async () => {
    const item = await specless();
    const c1 = await readJson(await addCriterion(jsonRequest("POST", { text: "first" }), ctx({ id: item.id })));
    const c2 = await readJson(await addCriterion(jsonRequest("POST", { text: "second" }), ctx({ id: item.id })));
    expect(c1.status).toBe(200);
    expect(c1.body.order).toBe(0);
    expect(c2.body.order).toBe(1);
    expect(await prisma.spec.count({ where: { workItemId: item.id } })).toBe(1);
  });

  it("requires text when adding a criterion", async () => {
    const item = await specless();
    const { status } = await readJson(await addCriterion(jsonRequest("POST", {}), ctx({ id: item.id })));
    expect(status).toBe(400);
  });

  it("toggles a criterion done and deletes it", async () => {
    const item = await specless();
    const created = await readJson(await addCriterion(jsonRequest("POST", { text: "toggle me" }), ctx({ id: item.id })));
    const id = created.body.id;

    const patched = await readJson(await patchCriterion(jsonRequest("PATCH", { done: true }), ctx({ id })));
    expect(patched.body.done).toBe(true);

    await delCriterion(jsonRequest("DELETE"), ctx({ id }));
    expect(await prisma.acceptanceCriterion.findUnique({ where: { id } })).toBeNull();
  });

  it("adds a test-plan item, updates its status, and rejects invalid status", async () => {
    const item = await specless();
    const created = await readJson(await addTest(jsonRequest("POST", { text: "E2E: happy path" }), ctx({ id: item.id })));
    expect(created.body.status).toBe("TODO");
    const id = created.body.id;

    const passed = await readJson(await patchTest(jsonRequest("PATCH", { status: "PASS" }), ctx({ id })));
    expect(passed.body.status).toBe("PASS");

    const bad = await readJson(await patchTest(jsonRequest("PATCH", { status: "MAYBE" }), ctx({ id })));
    expect(bad.status).toBe(400);

    await delTest(jsonRequest("DELETE"), ctx({ id }));
    expect(await prisma.testPlanItem.findUnique({ where: { id } })).toBeNull();
  });

  it("deletes a spec and cascades its criteria and tests", async () => {
    // SWISH-3 has a seeded spec with criteria + tests.
    const item = await itemByKey("SWISH-3");
    const spec = await prisma.spec.findFirstOrThrow({ where: { workItemId: item.id } });
    expect(await prisma.acceptanceCriterion.count({ where: { specId: spec.id } })).toBeGreaterThan(0);

    await deleteSpec(jsonRequest("DELETE"), ctx({ id: item.id }));
    expect(await prisma.spec.count({ where: { workItemId: item.id } })).toBe(0);
    expect(await prisma.acceptanceCriterion.count({ where: { specId: spec.id } })).toBe(0);
    expect(await prisma.testPlanItem.count({ where: { specId: spec.id } })).toBe(0);
  });
});
