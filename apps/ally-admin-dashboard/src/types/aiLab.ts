// AI Lab — skills (system-prompt templates), variables (template placeholders),
// and values (candidate substitutions bound to a variable).

export interface LabSkill {
  id: string;
  name: string;
  description?: string | null;
  content: string;
  /** LLM model id this skill runs on (from the LLM model registry). */
  model?: string | null;
  /** Optional generation params; null → the AI Lab default for that param. */
  temperature?: number | null;
  maxTokens?: number | null;
  systemPrompt?: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabVariable {
  id: string;
  name: string;
  description?: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabValue {
  id: string;
  variableId: string;
  variable?: LabVariable;
  label?: string | null;
  value: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

/** Shape of the list endpoints' response envelope. */
export interface LabListResponse<T> {
  items: T[];
  count: number;
}

export interface LabListQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LabValueListQuery extends LabListQuery {
  variableId?: string;
}

export interface CreateLabSkillRequest {
  name: string;
  description?: string;
  content: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
export type UpdateLabSkillRequest = Partial<CreateLabSkillRequest>;

export interface CreateLabVariableRequest {
  name: string;
  description?: string;
}
export type UpdateLabVariableRequest = Partial<CreateLabVariableRequest>;

export interface CreateLabValueRequest {
  variableId: string;
  label?: string;
  value: string;
}
export type UpdateLabValueRequest = Partial<CreateLabValueRequest>;

export type LabRunStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface LabRunVariableValue {
  name: string;
  value: string;
}

export interface LabRun {
  id: string;
  batchId?: string | null;
  skillId?: string | null;
  skillName: string;
  resolvedPrompt: string;
  variableValues: LabRunVariableValue[];
  model: string;
  status: LabRunStatus;
  output?: string | null;
  error?: string | null;
  /** Token usage + estimated USD cost (present on COMPLETED runs when the
   *  provider reported usage and the model has a known price). */
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  costUsd?: string | number | null;
  /** Set when the run is published for human evaluation. */
  publishedAt?: string | null;
  /** Present on list items: human-eval assignment counters. */
  evalStats?: { assigned: number; submitted: number };
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

/** Runs a single skill. A multi-skill run submits one of these per skill. */
export interface CreateLabRunRequest {
  skillId: string;
  batchId?: string;
  variableValues?: LabRunVariableValue[];
}

// ---- Human evaluation ----

export type LabEvalQuestionType = "RATING" | "YES_NO" | "TEXT";

export interface LabEvalQuestion {
  id: string;
  question: string;
  type: LabEvalQuestionType;
  scaleMin: number;
  scaleMax: number;
  position: number;
}

export interface PublishRunQuestionInput {
  question: string;
  type: LabEvalQuestionType;
  scaleMax?: number;
}

export interface PublishRunRequest {
  runId: string;
  questions: PublishRunQuestionInput[];
}

export interface LabEvaluator {
  id: string;
  email: string;
  lastLoginAt?: string | null;
  createdAt: string;
  assignedCount?: number;
  submittedCount?: number;
}

export interface CreateEvaluatorResponse {
  evaluator: LabEvaluator;
  /** Plaintext password — shown once for offline sharing, never retrievable again. */
  password: string;
}

export interface LabRunAssignmentItem {
  id: string;
  evaluator: { id: string; email: string } | null;
  submittedAt: string | null;
  createdAt?: string;
}

export interface LabRunResultsQuestion extends LabEvalQuestion {
  responseCount: number;
  // RATING
  average?: number | null;
  distribution?: Record<number, number>;
  // YES_NO
  yesCount?: number;
  noCount?: number;
  // TEXT
  answers?: { text: string; evaluatorEmail: string }[];
}

export interface LabRunResults {
  /** Backend returns a trimmed run projection (portal fields + status). */
  run: EvaluatorPortalRun & { status: LabRunStatus };
  totals: { assigned: number; submitted: number };
  /** normalizedScore is a scale-agnostic 0-100 average of all rating answers. */
  recordLevel: { normalizedScore: number | null; ratingResponseCount: number };
  questions: LabRunResultsQuestion[];
  assignments: LabRunAssignmentItem[];
}

// ---- Evaluator portal (the /evaluate micro-app) ----

export interface EvaluatorPortalRun {
  id: string;
  skillName: string;
  model: string;
  variableValues: LabRunVariableValue[];
  resolvedPrompt: string;
  output?: string | null;
  createdAt: string;
  publishedAt?: string | null;
}

export interface EvaluatorAssignmentListItem {
  id: string;
  submittedAt: string | null;
  assignedAt: string;
  questionCount: number;
  run: EvaluatorPortalRun;
}

export interface EvaluatorAssignmentAnswer {
  questionId: string;
  rating: number | null;
  yesNo: boolean | null;
  text: string | null;
}

export interface EvaluatorAssignmentDetail {
  id: string;
  submittedAt: string | null;
  assignedAt: string;
  run: EvaluatorPortalRun;
  questions: LabEvalQuestion[];
  answers: EvaluatorAssignmentAnswer[];
}

export interface EvaluatorLoginResponse {
  accessToken: string;
  evaluator: LabEvaluator;
}

export interface SubmitEvaluationAnswerInput {
  questionId: string;
  rating?: number;
  yesNo?: boolean;
  text?: string;
}
