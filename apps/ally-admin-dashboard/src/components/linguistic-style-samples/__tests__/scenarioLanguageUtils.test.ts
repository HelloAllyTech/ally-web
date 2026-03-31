import { describe, expect, it } from "vitest";

import { stringsToFillerTags, uniqueFillerNamesPreserveOrder } from "../scenarioLanguageUtils";

describe("scenarioLanguageUtils fillers", () => {
  it("stringsToFillerTags maps names to tag ids", () => {
    expect(stringsToFillerTags(["um", "like"])).toEqual([
      { id: "filler-0-um", name: "um" },
      { id: "filler-1-like", name: "like" },
    ]);
    expect(stringsToFillerTags(undefined)).toEqual([]);
    expect(stringsToFillerTags(["  ", "ok"])).toEqual([{ id: "filler-1-ok", name: "ok" }]);
  });

  it("uniqueFillerNamesPreserveOrder dedupes case-insensitively", () => {
    expect(uniqueFillerNamesPreserveOrder(["Um", "um", "like", "Like"])).toEqual(["Um", "like"]);
    expect(uniqueFillerNamesPreserveOrder(["  a  ", "b", ""])).toEqual(["a", "b"]);
  });
});
