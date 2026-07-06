import { JsonPatchOperation } from "@src/types/roleplayStudio";

/**
 * Minimal, pure RFC-6902 implementation covering the subset the roleplay
 * copilot emits: `add`, `replace`, `remove`. The input document is never
 * mutated — every object/array along an op's path is shallow-cloned, so the
 * result can be handed straight to Redux.
 *
 * Supported paths follow RFC-6901 JSON Pointers, including the `~0`/`~1`
 * escapes and the `-` array-append token (for `add`).
 */

export class JsonPatchError extends Error {
  constructor(
    message: string,
    public readonly op?: JsonPatchOperation,
  ) {
    super(message);
    this.name = "JsonPatchError";
  }
}

/** RFC-6901 pointer -> path segments (with ~1 -> "/" and ~0 -> "~" unescaped). */
export const parseJsonPointer = (pointer: string): string[] => {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) {
    throw new JsonPatchError(`Invalid JSON pointer: "${pointer}"`);
  }
  return pointer
    .slice(1)
    .split("/")
    .map(segment => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneContainer = (value: unknown): Record<string, unknown> | unknown[] => {
  if (Array.isArray(value)) return [...value];
  if (isPlainObject(value)) return { ...value };
  throw new JsonPatchError(`Cannot traverse into non-container value`);
};

const toArrayIndex = (segment: string, length: number, allowAppend: boolean): number => {
  if (allowAppend && segment === "-") return length;
  if (!/^\d+$/.test(segment)) {
    throw new JsonPatchError(`Invalid array index "${segment}"`);
  }
  const index = Number(segment);
  const max = allowAppend ? length : length - 1;
  if (index > max) {
    throw new JsonPatchError(`Array index ${index} out of bounds (length ${length})`);
  }
  return index;
};

/**
 * Applies one op immutably. `doc` is treated as read-only; the returned value
 * shares all untouched branches with the input.
 */
const applyOperation = <T>(doc: T, operation: JsonPatchOperation): T => {
  const { op, path } = operation;
  if (op !== "add" && op !== "replace" && op !== "remove") {
    throw new JsonPatchError(`Unsupported op "${String(op)}"`, operation);
  }
  if ((op === "add" || op === "replace") && !("value" in operation)) {
    throw new JsonPatchError(`Missing value for "${op}" at "${path}"`, operation);
  }

  const segments = parseJsonPointer(path);

  // Whole-document replacement.
  if (segments.length === 0) {
    if (op === "remove") {
      throw new JsonPatchError(`Cannot remove the whole document`, operation);
    }
    return operation.value as T;
  }

  const rootClone = cloneContainer(doc);
  let parent: Record<string, unknown> | unknown[] = rootClone;

  // Walk (and clone) down to the parent of the target.
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const key = Array.isArray(parent) ? toArrayIndex(segment, parent.length, false) : segment;
    const child = Array.isArray(parent)
      ? parent[key as number]
      : (parent as Record<string, unknown>)[key as string];
    if (child === undefined || child === null) {
      throw new JsonPatchError(`Path "${path}" does not exist (missing "${segment}")`, operation);
    }
    const childClone = cloneContainer(child);
    if (Array.isArray(parent)) parent[key as number] = childClone;
    else (parent as Record<string, unknown>)[key as string] = childClone;
    parent = childClone;
  }

  const last = segments[segments.length - 1];

  if (Array.isArray(parent)) {
    if (op === "add") {
      const index = toArrayIndex(last, parent.length, true);
      parent.splice(index, 0, operation.value);
    } else {
      const index = toArrayIndex(last, parent.length, false);
      if (index >= parent.length) {
        throw new JsonPatchError(`Array index ${index} out of bounds`, operation);
      }
      if (op === "replace") parent[index] = operation.value;
      else parent.splice(index, 1);
    }
  } else {
    if (op === "replace" && !(last in parent)) {
      throw new JsonPatchError(`Cannot replace missing member "${last}" at "${path}"`, operation);
    }
    if (op === "remove") {
      if (!(last in parent)) {
        throw new JsonPatchError(`Cannot remove missing member "${last}" at "${path}"`, operation);
      }
      delete parent[last];
    } else {
      parent[last] = operation.value;
    }
  }

  return rootClone as T;
};

/**
 * Applies a sequence of RFC-6902 ops (add/replace/remove subset) to `doc`,
 * returning a new document. Throws JsonPatchError on the first invalid op —
 * nothing is partially applied to the caller's document (pure function).
 */
export const applyJsonPatch = <T>(doc: T, ops: JsonPatchOperation[]): T => {
  let result = doc;
  for (const op of ops) {
    result = applyOperation(result, op);
  }
  return result;
};

/**
 * Reads the value at an RFC-6901 pointer, or `undefined` when the path does
 * not resolve. Used to show "before" values for proposed edits.
 */
export const getValueAtPointer = (doc: unknown, pointer: string): unknown => {
  let segments: string[];
  try {
    segments = parseJsonPointer(pointer);
  } catch {
    return undefined;
  }
  let current: unknown = doc;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(segment)) return undefined;
      current = current[Number(segment)];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
};

/** First path segment of each op — used to attribute patches to spec sections. */
export const patchTouchedSections = (ops: JsonPatchOperation[]): string[] => {
  const sections = new Set<string>();
  for (const op of ops) {
    try {
      const [first] = parseJsonPointer(op.path);
      if (first) sections.add(first);
    } catch {
      // Ignore malformed paths here; applyJsonPatch surfaces the real error.
    }
  }
  return [...sections];
};
