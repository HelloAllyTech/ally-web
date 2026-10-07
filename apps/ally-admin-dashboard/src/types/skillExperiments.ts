/**
 * Skill experiments (auto-improve) — mirrors ally-be `src/skill-experiment/`.
 * See ally-be docs/skill-experiments.md for how the loop behaves.
 */

export type SkillExperimentStatus = "off" | "baseline" | "testing" | "paused";

export type SkillExperimentPauseReason =
  | "target_reached"
  | "baseline_meets_target"
  | "max_variants"
  | "no_progress"
  | "designer_failed";

export type SkillVariantStatus = "champion" | "challenger" | "retired" | "rejected";

export type SkillExperimentEventType =
  | "configured"
  | "started"
  | "stopped"
  | "baseline_ready"
  | "variant_launched"
  | "variant_rejected"
  | "variant_retired"
  | "champion_changed"
  | "paused"
  | "resumed"
  | "reset"
  | "applied"
  | "error";

export interface RubricCriterion {
  key: string;
  name: string;
  description: string;
  /** 1–5 */
  weight: number;
}

export interface SkillExperimentSettings {
  targetScore: number;
  minSamplesPerVariant: number;
  challengerTrafficPercent: number;
  maxVariants: number;
  maxConsecutiveLosses: number;
  minImprovement: number;
}

export interface SkillExperiment extends SkillExperimentSettings {
  id: string;
  promptId: string;
  promptCode: string;
  status: SkillExperimentStatus;
  pausedReason: SkillExperimentPauseReason | null;
  run: number;
  rubric: RubricCriterion[];
  judgeModel: string | null;
  designerModel: string | null;
  championVariantId: string | null;
  challengerVariantId: string | null;
  variantsDrafted: number;
  consecutiveLosses: number;
  designFailures: number;
  startedAt: string | null;
  pausedAt: string | null;
  lastTickAt: string | null;
  lastError: string | null;
  pendingCount: number;
  updatedAt: string;
}

export interface SkillExperimentVariant {
  id: string;
  run: number;
  ordinal: number;
  label: string;
  isOriginal: boolean;
  content: string;
  status: SkillVariantStatus;
  changeSummary: string | null;
  hypothesis: string | null;
  designerModel: string | null;
  statusReason: string | null;
  launchedAt: string | null;
  retiredAt: string | null;
  judgedCount: number;
  meanScore: number | null;
  scoreStdDev: number | null;
  criterionMeans: Record<string, number> | null;
  formatFailures: number;
  createdAt: string;
}

export interface SkillExperimentEvent {
  id: string;
  type: SkillExperimentEventType;
  message: string;
  variantId: string | null;
  actorId: number | null;
  createdAt: string;
}

export interface SkillExperimentObservation {
  id: string;
  variantId: string;
  input: Record<string, unknown>;
  output: string | null;
  skillError: string | null;
  status: "pending" | "judged" | "failed";
  formatOk: boolean | null;
  score: number | null;
  criterionScores: Record<string, { score: number; reason: string }> | null;
  judgeSummary: string | null;
  judgeModel: string | null;
  judgeError: string | null;
  judgedAt: string | null;
}

export interface ConnectedSkillInfo {
  runtime: "ally-be" | "ally-ai";
  outputDescription: string;
  suggestedRubric: RubricCriterion[];
}

export interface SkillExperimentSummary {
  id: string;
  status: SkillExperimentStatus;
  pausedReason: SkillExperimentPauseReason | null;
  run: number;
  targetScore: number;
  championLabel: string | null;
  championScore: number | null;
  originalScore: number | null;
  championJudged: number;
  challengerLabel: string | null;
  variantsDrafted: number;
  lastTickAt: string | null;
  updatedAt: string;
}

export interface ConnectedSkillRow {
  promptId: string | null;
  promptCode: string;
  name: string;
  description: string;
  runtime: ConnectedSkillInfo["runtime"];
  outputDescription: string;
  experiment: SkillExperimentSummary | null;
}

export interface SkillExperimentDetail {
  prompt: { id: string; promptCode: string; name: string; description: string };
  connected: ConnectedSkillInfo | null;
  /** Runtime placeholders the designer may never change. */
  lockedPlaceholders: string[];
  experiment: SkillExperiment | null;
  defaults: SkillExperimentSettings & { rubric: RubricCriterion[] };
  variants: SkillExperimentVariant[];
  events: SkillExperimentEvent[];
  spend: { calls: number; costUsd: number; unpriced: boolean } | null;
}

export type ConfigureSkillExperimentRequest = Partial<SkillExperimentSettings> & {
  rubric?: RubricCriterion[];
  /** Empty string clears it. */
  judgeModel?: string;
  designerModel?: string;
};

export interface SkillExperimentObservationsResponse {
  items: SkillExperimentObservation[];
  count: number;
}
