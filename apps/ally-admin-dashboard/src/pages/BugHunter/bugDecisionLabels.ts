import { en } from "@constants";
import { BugHuntDecision, BugHuntDecisionOwner, BugHuntDecisionPoint } from "@types";

/** What each point decides, in the words the drawer and the run log use. */
export const DECISION_POINT_LABELS: Record<BugHuntDecisionPoint, string> = {
  D1: en.bugHunter.decisions.pointD1,
  D2: en.bugHunter.decisions.pointD2,
  D3: en.bugHunter.decisions.pointD3,
  D4: en.bugHunter.decisions.pointD4,
  D5: en.bugHunter.decisions.pointD5,
  D6: en.bugHunter.decisions.pointD6,
  D7: en.bugHunter.decisions.pointD7,
  D8: en.bugHunter.decisions.pointD8,
};

export const DECISION_OWNER_LABELS: Record<BugHuntDecisionOwner, string> = {
  rule: en.bugHunter.decisions.ownerRule,
  model: en.bugHunter.decisions.ownerModel,
};

/**
 * A pick as one short string. A D1 pick is a list of senses, a D2 or D6 pick
 * an engine/model pair (D6 also carries an approach, which is prose and is
 * shown on its own line, not here), and the rest a single word.
 */
export const formatDecisionPick = (pick: unknown): string => {
  if (pick === null || pick === undefined) return "—";
  if (Array.isArray(pick)) return pick.length ? pick.map(String).join(", ") : "—";
  if (typeof pick === "object") {
    const p = pick as Record<string, unknown>;
    if (typeof p.model === "string") {
      return typeof p.engine === "string" ? `${p.engine} · ${p.model}` : p.model;
    }
    return JSON.stringify(pick);
  }
  return String(pick);
};

/** The D6 approach, when the model gave one. */
export const decisionApproach = (decision: BugHuntDecision): string | null => {
  if (decision.point !== "D6") return null;
  const p = decision.pick as Record<string, unknown> | null;
  return p && typeof p.approach === "string" && p.approach.trim() ? p.approach : null;
};

/** A veto's one-line label, or null when none acted. */
export const decisionVetoLabel = (decision: BugHuntDecision): string | null => {
  const veto = decision.inputs?.veto;
  if (!veto) return null;
  return en.bugHunter.decisions.veto.replace("{by}", veto.by).replace("{reason}", veto.reason);
};

/** Points in the order they happen on a case. */
export const DECISION_POINT_ORDER: BugHuntDecisionPoint[] = [
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
];

/** Decisions oldest first, so a case reads top to bottom. */
export const sortDecisions = (decisions: BugHuntDecision[]): BugHuntDecision[] =>
  [...decisions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
