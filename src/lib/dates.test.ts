import { describe, it, expect } from "vitest";
import { fmtDate, toDateInput, isOverdue, dayDiff } from "./dates";

describe("fmtDate", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(fmtDate(null)).toBe("");
    expect(fmtDate(undefined)).toBe("");
    expect(fmtDate("")).toBe("");
  });

  it("formats a date as a short month/day", () => {
    // Locale/timezone-dependent value; assert the shape "Mon D" rather than an
    // exact day (a bare yyyy-mm-dd parses as UTC and can shift a day locally).
    const s = fmtDate("2026-07-04T12:00:00.000Z");
    expect(s).toMatch(/^[A-Za-z]{3,}\s?\.?\s?\d{1,2}$/);
    expect(s).toMatch(/Jul/);
  });
});

describe("toDateInput", () => {
  it("returns an ISO yyyy-mm-dd slice", () => {
    expect(toDateInput("2026-07-04T15:30:00.000Z")).toBe("2026-07-04");
  });
  it("returns empty for missing input", () => {
    expect(toDateInput(null)).toBe("");
    expect(toDateInput(undefined)).toBe("");
  });
});

describe("isOverdue", () => {
  it("is false when there is no due date or the item is done", () => {
    expect(isOverdue(null, false)).toBe(false);
    expect(isOverdue("2000-01-01", true)).toBe(false); // past but done
  });
  it("is true only for a past due date on an unfinished item", () => {
    expect(isOverdue("2000-01-01", false)).toBe(true);
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
    expect(isOverdue(future, false)).toBe(false);
  });
});

describe("dayDiff", () => {
  it("returns whole days between two ISO dates (b - a)", () => {
    expect(dayDiff("2026-07-01", "2026-07-10")).toBe(9);
    expect(dayDiff("2026-07-10", "2026-07-01")).toBe(-9);
    expect(dayDiff("2026-07-01", "2026-07-01")).toBe(0);
  });
});
