import { describe, expect, it } from "vitest";

import { JsonPatchOperation } from "@src/types/roleplayStudio";
import {
  applyJsonPatch,
  getValueAtPointer,
  JsonPatchError,
  parseJsonPointer,
  patchTouchedSections,
} from "@utils/applyJsonPatch";

const doc = () => ({
  title: "Original",
  persona: {
    identityCore: "core",
    chunks: [
      { id: "c1", content: "one" },
      { id: "c2", content: "two" },
    ],
  },
  "odd/key": { "~tilde": 1 },
});

describe("parseJsonPointer", () => {
  it("splits and unescapes RFC-6901 pointers", () => {
    expect(parseJsonPointer("")).toEqual([]);
    expect(parseJsonPointer("/persona/chunks/0")).toEqual(["persona", "chunks", "0"]);
    expect(parseJsonPointer("/odd~1key/~0tilde")).toEqual(["odd/key", "~tilde"]);
  });

  it("rejects pointers that do not start with /", () => {
    expect(() => parseJsonPointer("persona")).toThrow(JsonPatchError);
  });
});

describe("applyJsonPatch", () => {
  it("replaces object members", () => {
    const result = applyJsonPatch(doc(), [{ op: "replace", path: "/title", value: "New" }]);
    expect(result.title).toBe("New");
  });

  it("adds new object members", () => {
    const result = applyJsonPatch(doc(), [{ op: "add", path: "/difficulty", value: "HARD" }]);
    expect((result as any).difficulty).toBe("HARD");
  });

  it("removes object members", () => {
    const result = applyJsonPatch(doc(), [{ op: "remove", path: "/title" }]);
    expect("title" in result).toBe(false);
  });

  it("appends to arrays with the - token", () => {
    const result = applyJsonPatch(doc(), [
      { op: "add", path: "/persona/chunks/-", value: { id: "c3", content: "three" } },
    ]);
    expect(result.persona.chunks).toHaveLength(3);
    expect(result.persona.chunks[2].id).toBe("c3");
  });

  it("inserts into arrays at a numeric index", () => {
    const result = applyJsonPatch(doc(), [
      { op: "add", path: "/persona/chunks/1", value: { id: "cX", content: "x" } },
    ]);
    expect(result.persona.chunks.map(chunk => chunk.id)).toEqual(["c1", "cX", "c2"]);
  });

  it("replaces and removes array elements", () => {
    const replaced = applyJsonPatch(doc(), [
      { op: "replace", path: "/persona/chunks/0", value: { id: "c1", content: "updated" } },
    ]);
    expect(replaced.persona.chunks[0].content).toBe("updated");

    const removed = applyJsonPatch(doc(), [{ op: "remove", path: "/persona/chunks/0" }]);
    expect(removed.persona.chunks.map(chunk => chunk.id)).toEqual(["c2"]);
  });

  it("handles escaped pointer segments", () => {
    const result = applyJsonPatch(doc(), [{ op: "replace", path: "/odd~1key/~0tilde", value: 2 }]);
    expect((result as any)["odd/key"]["~tilde"]).toBe(2);
  });

  it("replaces the whole document for an empty path", () => {
    const result = applyJsonPatch(doc(), [{ op: "replace", path: "", value: { fresh: true } }]);
    expect(result).toEqual({ fresh: true });
  });

  it("applies ops sequentially", () => {
    const result = applyJsonPatch(doc(), [
      { op: "add", path: "/persona/chunks/-", value: { id: "c3", content: "three" } },
      { op: "remove", path: "/persona/chunks/0" },
    ]);
    expect(result.persona.chunks.map(chunk => chunk.id)).toEqual(["c2", "c3"]);
  });

  it("never mutates the input document and shares untouched branches", () => {
    const original = doc();
    const result = applyJsonPatch(original, [
      { op: "replace", path: "/persona/identityCore", value: "changed" },
    ]);
    expect(original.persona.identityCore).toBe("core");
    expect(result.persona.identityCore).toBe("changed");
    // Untouched branch keeps referential identity (structural sharing).
    expect(result.persona.chunks).toBe(original.persona.chunks);
  });

  it("throws on unsupported ops, bad paths, and out-of-bounds indices", () => {
    expect(() =>
      applyJsonPatch(doc(), [{ op: "move" as never, path: "/title", value: 1 }]),
    ).toThrow(JsonPatchError);
    expect(() =>
      applyJsonPatch(doc(), [{ op: "replace", path: "/missing/deep", value: 1 }]),
    ).toThrow(JsonPatchError);
    expect(() =>
      applyJsonPatch(doc(), [{ op: "replace", path: "/persona/chunks/9", value: 1 }]),
    ).toThrow(JsonPatchError);
    expect(() => applyJsonPatch(doc(), [{ op: "remove", path: "" }])).toThrow(JsonPatchError);
    expect(() => applyJsonPatch(doc(), [{ op: "remove", path: "/nope" }])).toThrow(JsonPatchError);
    expect(() =>
      applyJsonPatch(doc(), [{ op: "add", path: "/title" } as JsonPatchOperation]),
    ).toThrow(JsonPatchError);
  });
});

describe("getValueAtPointer", () => {
  it("reads nested values and returns undefined for unresolved paths", () => {
    expect(getValueAtPointer(doc(), "/persona/chunks/1/content")).toBe("two");
    expect(getValueAtPointer(doc(), "/persona/missing")).toBeUndefined();
    expect(getValueAtPointer(doc(), "/persona/chunks/9")).toBeUndefined();
    expect(getValueAtPointer(doc(), "bad-pointer")).toBeUndefined();
    expect(getValueAtPointer(doc(), "")).toEqual(doc());
  });
});

describe("patchTouchedSections", () => {
  it("collects unique first segments", () => {
    const ops: JsonPatchOperation[] = [
      { op: "replace", path: "/persona/identityCore", value: "x" },
      { op: "add", path: "/persona/chunks/-", value: {} },
      { op: "replace", path: "/title", value: "y" },
    ];
    expect(patchTouchedSections(ops).sort()).toEqual(["persona", "title"]);
  });
});
