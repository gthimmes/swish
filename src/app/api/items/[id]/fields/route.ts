import { prisma } from "@/lib/db";
import { badRequest, handle } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// Upsert (or clear) a custom-field value for this item.
// body: { fieldId, value } — an empty value removes it.
export async function PUT(req: Request, { params }: Ctx) {
  const { id: itemId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.fieldId) return badRequest("fieldId is required");
  const value = body.value == null ? "" : String(body.value);

  return handle(async () => {
    if (value === "") {
      await prisma.customFieldValue.deleteMany({ where: { itemId, fieldId: body.fieldId } });
      return { ok: true, cleared: true };
    }
    return prisma.customFieldValue.upsert({
      where: { fieldId_itemId: { fieldId: body.fieldId, itemId } },
      create: { itemId, fieldId: body.fieldId, value },
      update: { value },
    });
  });
}
