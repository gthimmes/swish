"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher, api } from "@/lib/client";
import { useWorkspace } from "./workspace";
import type { CustomField, WorkItemDetail } from "@/lib/types";

export function CustomFieldsSection({ item, onChanged }: { item: WorkItemDetail; onChanged: () => void }) {
  const { project } = useWorkspace();
  const { data: fields } = useSWR<CustomField[]>(project ? `/api/projects/${project.id}/fields` : null, fetcher);

  const values = useMemo(() => {
    const m = new Map<string, string>();
    item.fieldValues.forEach((v) => m.set(v.fieldId, v.value));
    return m;
  }, [item.fieldValues]);

  async function save(fieldId: string, value: string) {
    await api(`/api/items/${item.id}/fields`, "PUT", { fieldId, value });
    onChanged();
  }

  if (!fields || fields.length === 0) return null;

  return (
    <section className="px-5 pb-4" data-testid="custom-fields">
      <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-dim)" }}>
        Custom fields
      </label>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {fields.map((f) => (
          <FieldInput key={f.id} field={f} value={values.get(f.id) ?? ""} onSave={(v) => save(f.id, v)} />
        ))}
      </div>
    </section>
  );
}

function FieldInput({ field, value, onSave }: { field: CustomField; value: string; onSave: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const options: string[] = useMemo(() => {
    try {
      return JSON.parse(field.options);
    } catch {
      return [];
    }
  }, [field.options]);

  const testid = `field-${field.name.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div>
      <label className="mb-1 block text-[11px]" style={{ color: "var(--text-faint)" }}>
        {field.name}
      </label>
      {field.type === "SELECT" ? (
        <select className="input" data-testid={testid} value={value} onChange={(e) => onSave(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="input"
          data-testid={testid}
          type={field.type === "NUMBER" ? "number" : field.type === "URL" ? "url" : "text"}
          value={local}
          placeholder="—"
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => local !== value && onSave(local)}
        />
      )}
    </div>
  );
}
