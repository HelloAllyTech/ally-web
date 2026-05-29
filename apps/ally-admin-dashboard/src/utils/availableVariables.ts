import { AvailableVariable, AvailableVariableEntry } from "@types";

/** Read just the name from an entry, regardless of legacy / rich shape. */
export const getAvailableVariableName = (entry: AvailableVariableEntry): string =>
  typeof entry === "string" ? entry : (entry?.name ?? "");

/**
 * Normalize a mixed legacy/rich list into canonical
 * `{ name, label?, required? }` objects. Drops empty entries. Order preserved.
 */
export const normalizeAvailableVariables = (
  entries: AvailableVariableEntry[] | undefined | null,
): AvailableVariable[] => {
  if (!Array.isArray(entries)) return [];
  const byName = new Map<string, AvailableVariable>();
  for (const entry of entries) {
    if (typeof entry === "string") {
      const name = entry.trim();
      if (name && !byName.has(name)) {
        byName.set(name, { name });
      }
    } else if (entry && typeof entry === "object") {
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      if (!name) continue;
      const existing = byName.get(name);
      byName.set(name, {
        name,
        label: existing?.label ?? entry.label,
        required: existing?.required ?? entry.required,
      });
    }
  }
  return Array.from(byName.values());
};
