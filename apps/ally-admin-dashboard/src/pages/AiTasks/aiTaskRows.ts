import { AI_TASK_KIND_LABELS, AI_TASK_PROVIDER_LABELS, AI_TASK_RUNTIME_LABELS } from "@constants";
import { AiTaskRow } from "@types";

/**
 * Filtering and cell derivation for the AI Tasks table, kept out of the
 * component so it can be tested.
 *
 * NotionTable virtualises on measured container height, which is zero in jsdom —
 * so no body row ever renders in a test and asserting on cells is impossible.
 * That is a property of the table, not of this screen, and the logic worth
 * covering (what a search matches, how a model is labelled) is all here.
 */

export interface AiTaskFilters {
  runtime?: string[];
  provider?: string[];
  kind?: string[];
}

/** A row shaped for NotionTable: original fields plus the derived cells. */
export type AiTaskTableRow = AiTaskRow & {
  runtimeLabel: string;
  providerLabel: string;
  modelLabel: string;
  taskLabel: string;
  configuredByLabel: string;
};

/**
 * Fields a search query is matched against.
 *
 * Deliberately wider than the visible description. The question this screen
 * gets asked is "what uses gpt-4o-mini?" or "what reads
 * ANTHROPIC_AUTOFILL_MODEL?" — searching only the trigger would answer neither.
 */
const searchableFields = (row: AiTaskRow): (string | null)[] => [
  row.trigger,
  row.detail,
  row.effectiveModel,
  row.defaultModel,
  row.task,
  row.configuredBy,
  row.provider,
  row.promptOverride,
];

export const filterAiTasks = (
  rows: AiTaskRow[],
  searchQuery: string,
  filters: AiTaskFilters,
): AiTaskRow[] => {
  const needle = searchQuery.trim().toLowerCase();

  return rows.filter(row => {
    if (filters.runtime?.length && !filters.runtime.includes(row.runtime)) return false;
    if (filters.provider?.length && !filters.provider.includes(row.provider)) return false;
    if (filters.kind?.length && !filters.kind.includes(row.kind)) return false;
    if (!needle) return true;

    return searchableFields(row)
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(needle));
  });
};

export const toTableRows = (rows: AiTaskRow[]): AiTaskTableRow[] =>
  rows.map(row => ({
    ...row,
    // The trigger cell carries the detail sentence and the hot-path marker,
    // because both only make sense read against the action they qualify.
    trigger: [row.hotPath ? "⚡" : "", row.trigger, row.detail ? `— ${row.detail}` : ""]
      .filter(Boolean)
      .join(" "),
    runtimeLabel: AI_TASK_RUNTIME_LABELS[row.runtime] ?? row.runtime,
    providerLabel: AI_TASK_PROVIDER_LABELS[row.provider] ?? row.provider,
    // A model whose value came from another service's committed default is
    // marked, so nobody reads a stale figure as this deployment's truth. The
    // call type is appended only when it is not a plain chat completion —
    // labelling every row "(Chat)" would be noise on four rows in five.
    modelLabel: [
      row.effectiveModel,
      row.kind !== "completion" && AI_TASK_KIND_LABELS[row.kind]
        ? `(${AI_TASK_KIND_LABELS[row.kind]})`
        : "",
      row.modelSource === "documented" ? "· as documented" : "",
    ]
      .filter(Boolean)
      .join(" "),
    // An em dash rather than an empty cell: these calls record no usage label,
    // which is a fact about them, not missing data.
    taskLabel: row.task ?? "—",
    // Naming the winning prompt row in the same cell as the env var is the
    // point: several calls read a per-prompt provider/model, so an env var
    // shown alone reads as authoritative when it is only the fallback.
    configuredByLabel: row.promptOverride
      ? `${row.configuredBy} — overridden by prompt ${row.promptOverride}`
      : row.configuredBy,
  }));

/** Filter options built from the rows actually returned, not a hardcoded list. */
export const optionsFrom = (values: string[], labels: Record<string, string>) =>
  Array.from(new Set(values))
    .sort()
    .map(value => ({ value, label: labels[value] ?? value }));
