import { describe, it, expect } from "vitest";

import { GET } from "../route";

describe("app/health/route.ts", () => {
  it("GET returns 200 OK with status JSON", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "OK" });
  });
});
