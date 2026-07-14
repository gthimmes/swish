import { describe, it, expect } from "vitest";
import { ok, badRequest, notFound, handle, pick } from "./api";

async function bodyOf(res: Response) {
  return JSON.parse(await res.text());
}

describe("api helpers", () => {
  it("ok() returns 200 with the JSON payload", async () => {
    const res = ok({ hello: "world" });
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ hello: "world" });
  });

  it("badRequest() returns 400 with an error message", async () => {
    const res = badRequest("nope");
    expect(res.status).toBe(400);
    expect(await bodyOf(res)).toEqual({ error: "nope" });
  });

  it("notFound() returns 404 with a default message", async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    expect((await bodyOf(res)).error).toBeTruthy();
  });

  it("handle() wraps a successful result in a 200", async () => {
    const res = await handle(async () => ({ n: 1 }));
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ n: 1 });
  });

  it("handle() catches thrown errors as a 500 with the message", async () => {
    const res = await handle(async () => {
      throw new Error("boom");
    });
    expect(res.status).toBe(500);
    expect((await bodyOf(res)).error).toBe("boom");
  });

  it("pick() keeps only defined keys", () => {
    const out = pick({ a: 1, b: undefined, c: 3 } as { a?: number; b?: number; c?: number }, ["a", "b", "c"]);
    expect(out).toEqual({ a: 1, c: 3 });
    expect("b" in out).toBe(false);
  });
});
