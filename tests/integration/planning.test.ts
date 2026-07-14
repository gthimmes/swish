import { describe, it, expect, beforeEach } from "vitest";
import { GET as listCycles, POST as createCycle } from "@/app/api/projects/[id]/cycles/route";
import { PATCH as patchCycle, DELETE as deleteCycle } from "@/app/api/cycles/[id]/route";
import { POST as addDep } from "@/app/api/items/[id]/dependencies/route";
import { DELETE as removeDep } from "@/app/api/dependencies/[id]/route";
import { GET as listFields, POST as createField } from "@/app/api/projects/[id]/fields/route";
import { PATCH as patchField, DELETE as deleteField } from "@/app/api/fields/[id]/route";
import { PUT as putFieldValue } from "@/app/api/items/[id]/fields/route";
import { GET as listItems } from "@/app/api/items/route";
import { POST as bulk } from "@/app/api/items/bulk/route";
import { prisma } from "@/lib/db";
import { resetDb, seededProject, itemByKey, ctx, jsonRequest, readJson } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

describe("cycles API", () => {
  it("lists seeded cycles ordered by start date", async () => {
    const project = await seededProject();
    const { body } = await readJson(await listCycles(jsonRequest("GET"), ctx({ id: project.id })));
    expect(body.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < body.length; i++) {
      expect(new Date(body[i - 1].startDate).getTime()).toBeLessThanOrEqual(new Date(body[i].startDate).getTime());
    }
  });

  it("creates, patches, and deletes a cycle", async () => {
    const project = await seededProject();
    const created = await readJson(
      await createCycle(jsonRequest("POST", { name: "Sprint 99", startDate: "2026-08-01", endDate: "2026-08-14" }), ctx({ id: project.id }))
    );
    expect(created.status).toBe(200);
    const id = created.body.id;

    const patched = await readJson(await patchCycle(jsonRequest("PATCH", { name: "Sprint 99b" }), ctx({ id })));
    expect(patched.body.name).toBe("Sprint 99b");

    await deleteCycle(jsonRequest("DELETE"), ctx({ id }));
    expect(await prisma.cycle.findUnique({ where: { id } })).toBeNull();
  });

  it("requires name and dates to create a cycle", async () => {
    const project = await seededProject();
    const { status } = await readJson(await createCycle(jsonRequest("POST", { name: "x" }), ctx({ id: project.id })));
    expect(status).toBe(400);
  });
});

describe("dependencies API", () => {
  it("creates a blocks dependency and prevents self- and duplicate/2-cycle links", async () => {
    const a = await itemByKey("SWISH-4");
    const b = await itemByKey("SWISH-5");

    const ok = await readJson(await addDep(jsonRequest("POST", { type: "blocks", otherId: b.id }), ctx({ id: a.id })));
    expect(ok.status).toBe(200);
    expect(await prisma.dependency.count({ where: { blockerId: a.id, blockedId: b.id } })).toBe(1);

    // self-dependency rejected
    const self = await readJson(await addDep(jsonRequest("POST", { type: "blocks", otherId: a.id }), ctx({ id: a.id })));
    expect(self.status).toBe(400);

    // reverse direction is treated as a duplicate (2-cycle guard), no new row
    const dup = await readJson(await addDep(jsonRequest("POST", { type: "blockedBy", otherId: b.id }), ctx({ id: a.id })));
    expect(dup.body.duplicate).toBe(true);
    expect(await prisma.dependency.count({ where: { OR: [{ blockerId: a.id }, { blockedId: a.id }] } })).toBe(1);
  });

  it("requires a valid type and otherId", async () => {
    const a = await itemByKey("SWISH-4");
    const bad = await readJson(await addDep(jsonRequest("POST", { type: "nope", otherId: "x" }), ctx({ id: a.id })));
    expect(bad.status).toBe(400);
  });

  it("removes a dependency by id", async () => {
    const a = await itemByKey("SWISH-4");
    const b = await itemByKey("SWISH-5");
    await addDep(jsonRequest("POST", { type: "blocks", otherId: b.id }), ctx({ id: a.id }));
    const dep = await prisma.dependency.findFirstOrThrow({ where: { blockerId: a.id, blockedId: b.id } });
    await removeDep(jsonRequest("DELETE"), ctx({ id: dep.id }));
    expect(await prisma.dependency.findUnique({ where: { id: dep.id } })).toBeNull();
  });
});

describe("custom fields API", () => {
  it("creates a field, sets a value on an item, and filters by it", async () => {
    const project = await seededProject();
    const created = await readJson(
      await createField(jsonRequest("POST", { name: "Squad", type: "SELECT", options: ["Alpha", "Bravo"] }), ctx({ id: project.id }))
    );
    expect(created.status).toBe(200);
    const fieldId = created.body.id;

    const item = await itemByKey("SWISH-4");
    await putFieldValue(jsonRequest("PUT", { fieldId, value: "Alpha" }), ctx({ id: item.id }));

    // Filter items by field_<id>=Alpha via the list endpoint.
    const url = new Request(`http://test.local/api/items?projectId=${project.id}&field_${fieldId}=Alpha`);
    const { body } = await readJson(await listItems(url));
    expect(body.length).toBe(1);
    expect(body[0].key).toBe("SWISH-4");
  });

  it("clears a field value when given an empty value", async () => {
    const project = await seededProject();
    const created = await readJson(await createField(jsonRequest("POST", { name: "Note", type: "TEXT" }), ctx({ id: project.id })));
    const fieldId = created.body.id;
    const item = await itemByKey("SWISH-4");

    await putFieldValue(jsonRequest("PUT", { fieldId, value: "hello" }), ctx({ id: item.id }));
    expect(await prisma.customFieldValue.count({ where: { fieldId, itemId: item.id } })).toBe(1);

    const cleared = await readJson(await putFieldValue(jsonRequest("PUT", { fieldId, value: "" }), ctx({ id: item.id })));
    expect(cleared.body.cleared).toBe(true);
    expect(await prisma.customFieldValue.count({ where: { fieldId, itemId: item.id } })).toBe(0);
  });

  it("patches and deletes a field", async () => {
    const project = await seededProject();
    const created = await readJson(await createField(jsonRequest("POST", { name: "Temp", type: "TEXT" }), ctx({ id: project.id })));
    const fieldId = created.body.id;

    const patched = await readJson(await patchField(jsonRequest("PATCH", { name: "Renamed" }), ctx({ id: fieldId })));
    expect(patched.body.name).toBe("Renamed");

    await deleteField(jsonRequest("DELETE"), ctx({ id: fieldId }));
    const { body } = await readJson(await listFields(jsonRequest("GET"), ctx({ id: project.id })));
    expect(body.find((f: { id: string }) => f.id === fieldId)).toBeUndefined();
  });

  it("rejects an invalid field type", async () => {
    const project = await seededProject();
    const { status } = await readJson(await createField(jsonRequest("POST", { name: "X", type: "COLOR" }), ctx({ id: project.id })));
    expect(status).toBe(400);
  });
});

describe("bulk API", () => {
  it("bulk-updates priority across items", async () => {
    const a = await itemByKey("SWISH-4");
    const b = await itemByKey("SWISH-5");
    const res = await readJson(await bulk(jsonRequest("POST", { ids: [a.id, b.id], patch: { priority: "URGENT" } })));
    expect(res.body.count).toBe(2);
    const updated = await prisma.workItem.findMany({ where: { id: { in: [a.id, b.id] } } });
    expect(updated.every((i) => i.priority === "URGENT")).toBe(true);
  });

  it("bulk-deletes items", async () => {
    const a = await itemByKey("SWISH-4");
    const b = await itemByKey("SWISH-5");
    const res = await readJson(await bulk(jsonRequest("POST", { ids: [a.id, b.id], delete: true })));
    expect(res.body.count).toBe(2);
    expect(await prisma.workItem.count({ where: { id: { in: [a.id, b.id] } } })).toBe(0);
  });

  it("requires ids and a supported patch", async () => {
    expect((await readJson(await bulk(jsonRequest("POST", { ids: [] })))).status).toBe(400);
    const a = await itemByKey("SWISH-4");
    expect((await readJson(await bulk(jsonRequest("POST", { ids: [a.id], patch: {} })))).status).toBe(400);
    expect((await readJson(await bulk(jsonRequest("POST", { ids: [a.id], patch: { priority: "SOON" } })))).status).toBe(400);
  });
});
