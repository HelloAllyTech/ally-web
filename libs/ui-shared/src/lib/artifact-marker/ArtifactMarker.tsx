import { FC, Fragment, ReactNode } from "react";

import { ARTIFACT_SWATCHES, ARTIFACT_VERDICT_TOKENS, ArtifactSwatch } from "./artifactSwatches";

export interface ArtifactUnit {
  id: string;
  /** Transcript turns only; omitted for document paragraphs. */
  speaker?: string;
  text: string;
}

export interface ArtifactLabel {
  id: string;
  text: string;
  description?: string;
  color: ArtifactSwatch;
}

export interface ArtifactMark {
  unitId: string;
  labelId: string;
}

export type ArtifactVerdict = "found" | "missed" | "notHere";

export interface ArtifactMarkerProps {
  units: ArtifactUnit[];
  labels: ArtifactLabel[];
  marks: ArtifactMark[];
  /** The armed label — tapping a unit applies or removes it. */
  armedLabelId?: string | null;
  onToggleMark?: (unitId: string, labelId: string) => void;
  /**
   * Verdicts keyed by `markKey(unitId, labelId)`. Supplying this switches the
   * widget into read-only reveal mode: rows are scored, not editable.
   */
  verdicts?: Record<string, ArtifactVerdict>;
  /** Author notes, same key shape as `verdicts`. Only shown when revealed. */
  notes?: Record<string, string>;
  readOnly?: boolean;
  /** Slot under any unit carrying a mark — the admin's per-target note editor. */
  renderUnitFooter?: (unitId: string) => ReactNode;
  /** Shown when a unit has no marks and nothing is armed. */
  className?: string;
}

/** Stable key for a (unit, label) pair. Mirrors `markKey` in ally-be. */
export const markKey = (unitId: string, labelId: string): string => `${unitId} ${labelId}`;

const VERDICT_WORD: Record<ArtifactVerdict, string> = {
  found: "Found",
  missed: "Missed",
  notHere: "Not here",
};

/**
 * Renders a segmented artifact — a call transcript or a note — and lets the
 * caller mark units with labels. One component, two modes: the admin uses it to
 * lay down the answer key, the learner uses it to answer, and the reveal reuses
 * it read-only with verdicts. Keeping them the same widget is what stops the
 * author's view drifting from what learners actually see.
 *
 * Units are tap targets rather than free text selections, which is what makes
 * grading exact and the whole thing usable on a phone.
 */
export const ArtifactMarker: FC<ArtifactMarkerProps> = ({
  units,
  labels,
  marks,
  armedLabelId = null,
  onToggleMark,
  verdicts,
  notes,
  readOnly = false,
  renderUnitFooter,
  className = "",
}) => {
  const labelById = new Map(labels.map(label => [label.id, label]));
  const revealing = !!verdicts;
  const interactive = !readOnly && !revealing && !!onToggleMark;

  const marksByUnit = new Map<string, string[]>();
  for (const mark of marks) {
    const list = marksByUnit.get(mark.unitId) ?? [];
    list.push(mark.labelId);
    marksByUnit.set(mark.unitId, list);
  }

  // In reveal mode a unit can also carry entries the learner never marked
  // (misses), so the row list is driven by verdicts as well as marks.
  const verdictsByUnit = new Map<string, { labelId: string; verdict: ArtifactVerdict }[]>();
  if (verdicts) {
    for (const unit of units) {
      for (const label of labels) {
        const verdict = verdicts[markKey(unit.id, label.id)];
        if (!verdict) continue;
        const list = verdictsByUnit.get(unit.id) ?? [];
        list.push({ labelId: label.id, verdict });
        verdictsByUnit.set(unit.id, list);
      }
    }
  }

  const rowTone = (unitId: string): { background: string; borderColor: string } => {
    if (revealing) {
      const entries = verdictsByUnit.get(unitId) ?? [];
      // Worst-first so a row with any error reads as an error at a glance.
      const worst =
        entries.find(e => e.verdict === "notHere") ??
        entries.find(e => e.verdict === "missed") ??
        entries.find(e => e.verdict === "found");
      if (!worst) return { background: "transparent", borderColor: "transparent" };
      const tokens = ARTIFACT_VERDICT_TOKENS[worst.verdict];
      return { background: tokens.tint, borderColor: tokens.border };
    }
    const applied = marksByUnit.get(unitId) ?? [];
    if (!applied.length) return { background: "transparent", borderColor: "transparent" };
    const swatch = labelById.get(applied[0])?.color;
    const tokens = swatch ? ARTIFACT_SWATCHES[swatch] : null;
    return tokens
      ? { background: tokens.tint, borderColor: tokens.border }
      : { background: "transparent", borderColor: "transparent" };
  };

  return (
    <ol className={`flex flex-col gap-1 list-none p-0 m-0 ${className}`}>
      {units.map((unit, index) => {
        const applied = marksByUnit.get(unit.id) ?? [];
        const revealEntries = verdictsByUnit.get(unit.id) ?? [];
        const tone = rowTone(unit.id);
        const armedApplied = !!armedLabelId && applied.includes(armedLabelId);

        const body = (
          <div className="flex gap-3 w-full text-left">
            {unit.speaker ? (
              <span className="flex-none w-16 pt-0.5 font-mono text-xs text-typography-500 break-words">
                {unit.speaker}
              </span>
            ) : (
              <span className="flex-none w-6 pt-0.5 font-mono text-xs text-typography-400 tabular-nums">
                {index + 1}
              </span>
            )}
            <span className="flex-1 text-sm leading-relaxed text-typography-800 whitespace-pre-wrap">
              {unit.text}
            </span>
          </div>
        );

        return (
          <li key={unit.id}>
            <div
              className="rounded-md border transition-colors"
              style={{ background: tone.background, borderColor: tone.borderColor }}
            >
              {interactive ? (
                <button
                  type="button"
                  onClick={() => armedLabelId && onToggleMark?.(unit.id, armedLabelId)}
                  disabled={!armedLabelId}
                  aria-pressed={armedApplied}
                  className="w-full min-h-[44px] px-3 py-2 text-left rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-500 enabled:hover:bg-black/[0.03] disabled:cursor-default"
                >
                  {body}
                </button>
              ) : (
                <div className="px-3 py-2">{body}</div>
              )}

              {(applied.length > 0 || revealEntries.length > 0) && (
                <div className="flex flex-wrap gap-1.5 px-3 pb-2 pl-[76px]">
                  {revealing
                    ? revealEntries.map(entry => {
                        const label = labelById.get(entry.labelId);
                        const tokens = ARTIFACT_VERDICT_TOKENS[entry.verdict];
                        return (
                          <Fragment key={entry.labelId}>
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
                              style={{
                                background: tokens.tint,
                                borderColor: tokens.border,
                                color: tokens.text,
                              }}
                            >
                              {label?.text ?? entry.labelId}
                              <span className="opacity-70">· {VERDICT_WORD[entry.verdict]}</span>
                            </span>
                          </Fragment>
                        );
                      })
                    : applied.map(labelId => {
                        const label = labelById.get(labelId);
                        const tokens = label ? ARTIFACT_SWATCHES[label.color] : null;
                        const chip = (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
                            style={
                              tokens
                                ? {
                                    background: "#fff",
                                    borderColor: tokens.border,
                                    color: tokens.text,
                                  }
                                : undefined
                            }
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{ background: tokens?.solid }}
                            />
                            {label?.text ?? labelId}
                            {interactive && <span aria-hidden="true">×</span>}
                          </span>
                        );
                        return interactive ? (
                          <button
                            key={labelId}
                            type="button"
                            onClick={() => onToggleMark?.(unit.id, labelId)}
                            aria-label={`Remove ${label?.text ?? "label"} from this line`}
                            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          >
                            {chip}
                          </button>
                        ) : (
                          <Fragment key={labelId}>{chip}</Fragment>
                        );
                      })}
                </div>
              )}

              {revealing &&
                revealEntries.map(entry => {
                  const note = notes?.[markKey(unit.id, entry.labelId)];
                  if (!note) return null;
                  return (
                    <p
                      key={`note-${entry.labelId}`}
                      className="px-3 pb-2 pl-[76px] text-xs leading-relaxed text-typography-600 m-0"
                    >
                      {note}
                    </p>
                  );
                })}

              {renderUnitFooter && applied.length > 0 && (
                <div className="px-3 pb-2 pl-[76px]">{renderUnitFooter(unit.id)}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
