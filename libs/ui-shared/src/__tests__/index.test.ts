import { describe, it, expect } from "vitest";

import * as pkg from "../index";

describe("ui-shared index exports", () => {
  it("exports expected components and logger", () => {
    expect(pkg.Badge).toBeDefined();
    expect(pkg.Dropdown).toBeDefined();
    expect(pkg.DropdownField).toBeDefined();
    expect(pkg.GenericTable).toBeDefined();
    expect(pkg.InfiniteScroll).toBeDefined();
    expect(pkg.Pagination).toBeDefined();
    expect(pkg.ResourceCard).toBeDefined();
    expect(pkg.ResourceSearch).toBeDefined();
    expect(pkg.ResourceSearchBar).toBeDefined();
    expect(pkg.SearchHeader).toBeDefined();
    expect(pkg.SkeletonLoader).toBeDefined();
    expect(pkg.SuggestionsContainer).toBeDefined();
    expect(pkg.logger).toBeDefined();
  });
});
