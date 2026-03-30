import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchReferenceDocuments, fetchCategories, INITIAL_FETCH_LIMIT } from "../api";

describe("app/api.ts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchReferenceDocuments posts with expected payload", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValue({ json: () => Promise.resolve({ documents: [], total: 0 }) } as any);

    const res = await fetchReferenceDocuments("q", "Cat", INITIAL_FETCH_LIMIT, ["1"]);
    expect(res).toEqual({ documents: [], total: 0 });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/reference-document/search/public"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("fetchCategories gets categories", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValue({ json: () => Promise.resolve({ categories: [] }) } as any);
    const res = await fetchCategories();
    expect(res).toEqual({ categories: [] });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/reference-document/categories"),
      expect.objectContaining({ method: "GET" }),
    );
  });
});
