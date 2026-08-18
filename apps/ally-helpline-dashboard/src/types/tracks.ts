/**
 * Track 2.0 learner types — multi-component learning tracks (sections of
 * roleplay/case/quiz/article/video/journal/annotation items).
 * Mirrors the ally-be `v1/learn/tracks` learner API contract.
 */
import type { ArtifactSwatch } from "@ally-ui-mono/ui-shared";

export enum TrackItemType {
  ROLEPLAY = "ROLEPLAY",
  CASE = "CASE",
  QUIZ = "QUIZ",
  ARTICLE = "ARTICLE",
  VIDEO = "VIDEO",
  JOURNAL = "JOURNAL",
  ANNOTATED_ARTIFACT = "ANNOTATED_ARTIFACT",
  GAME = "GAME",
}

/** Games the app can serve; each maps to `public/games/<key>/index.html`. */
export enum TrackGameKey {
  TREX_RUNNER = "TREX_RUNNER",
  TIC_TAC_TOE = "TIC_TAC_TOE",
  MEMORY_MATCH = "MEMORY_MATCH",
  CUB_N_PUP = "CUB_N_PUP",
}

/**
 * NOTE: there is no IN_PROGRESS status server-side — "in progress" is
 * derived as `status === UNLOCKED && startedAt != null`.
 */
export enum TrackItemStatus {
  LOCKED = "LOCKED",
  UNLOCKED = "UNLOCKED",
  COMPLETED = "COMPLETED",
}

export type TrackVideoSource = "s3" | "youtube" | "vimeo" | "loom";

export interface TrackListItem {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  totalItems: number;
  estimatedDurationMinutes: number | null;
  enrolled: boolean;
  completedItems: number;
  completedAt: string | null;
  lastActivityAt: string | null;
  trackEnrollmentId: string | null;
}

export interface GetLearnTracksResponse {
  data: TrackListItem[];
  count: number;
}

export interface TrackCompletionCriteria {
  minScore?: number;
  minDurationSeconds?: number;
  passScore?: number;
  watchPct?: number;
  minReadSeconds?: number;
}

/** Type-specific display metadata for the overview meta line. */
export interface TrackItemContentMeta {
  // QUIZ
  questionCount?: number;
  passScore?: number;
  // VIDEO
  durationSeconds?: number;
  source?: TrackVideoSource;
  // JOURNAL
  promptCount?: number;
  // ANNOTATED_ARTIFACT — deliberately no target count, that would give the
  // answer away before the learner has looked.
  kind?: AnnotationArtifactKind;
  unitCount?: number;
  labelCount?: number;
  // GAME
  gameKey?: TrackGameKey;
}

export interface TrackDetailItem {
  id: string;
  type: TrackItemType;
  order: number;
  title: string;
  description: string | null;
  scenarioId: number | null;
  caseId: string | null;
  completionCriteria: TrackCompletionCriteria | null;
  contentMeta: TrackItemContentMeta | null;
  status: TrackItemStatus;
  startedAt: string | null;
  completedAt: string | null;
  score: number | null;
  attemptCount: number | null;
  maxWatchedPct: number | null;
}

export interface TrackSection {
  id: string;
  title: string;
  description: string | null;
  order: number;
  items: TrackDetailItem[];
}

export interface TrackDetail {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  status: string;
  totalItems: number;
  estimatedDurationMinutes: number | null;
  enrolled: boolean;
  trackEnrollmentId: string | null;
  completedItems: number;
  completedAt: string | null;
  sections: TrackSection[];
}

export interface EnrollTrackResponse {
  trackEnrollmentId: string;
  alreadyEnrolled: boolean;
}

export interface NextTrackItem extends TrackDetailItem {
  sectionId: string;
  sectionTitle: string;
}

export interface GetNextTrackItemResponse {
  trackCompleted: boolean;
  nextItem: NextTrackItem | null;
}

// ---------------------------------------------------------------------------
// Quiz (sanitized — answer keys stripped server-side)
// ---------------------------------------------------------------------------

export type QuizQuestionType =
  | "mcq_single"
  | "mcq_multi"
  | "true_false"
  | "ordering"
  | "matching"
  | "fill_blank"
  | "open_ended";

export interface QuizOption {
  id: string;
  text: string;
}

export interface SanitizedQuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  points: number;
  /** mcq_single / mcq_multi */
  options?: QuizOption[];
  /** ordering (pre-shuffled server-side) */
  items?: QuizOption[];
  /** matching */
  left?: QuizOption[];
  /** matching (pre-shuffled server-side, may include distractors) */
  right?: QuizOption[];
  /** fill_blank — template with `{{blankId}}` tokens */
  template?: string;
  blankIds?: string[];
  /** open_ended */
  minWords?: number;
}

export interface SanitizedQuiz {
  settings: {
    passScore: number;
    maxAttempts: number | null;
    showExplanations: string;
  };
  questions: SanitizedQuizQuestion[];
  totalPoints: number;
}

export interface QuizAnswerInput {
  questionId: string;
  selectedOptionIds?: string[];
  booleanAnswer?: boolean;
  orderedItemIds?: string[];
  pairs?: { leftId: string; rightId: string }[];
  blanks?: { blankId: string; answer: string }[];
  text?: string;
}

export type QuizAttemptStatus = "GRADED" | "PENDING_GRADING";

export interface QuizQuestionResult {
  questionId: string;
  /** null = pending LLM grading */
  correct: boolean | null;
  pointsAwarded: number;
  pointsPossible: number;
  explanation?: string;
  llmFeedback?: string;
}

export interface QuizAttemptResult {
  attemptId: string;
  attemptNumber: number;
  status: QuizAttemptStatus;
  scorePct: number;
  passed: boolean;
  passScore: number;
  attemptsUsed: number;
  maxAttempts: number | null;
  questions: QuizQuestionResult[];
  itemCompleted: boolean;
  unlockedItemIds: string[];
  sectionCompleted: boolean;
  trackCompleted: boolean;
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

/* -------------------------------------------------------------------------- */
/* Annotation (ANNOTATED_ARTIFACT)                                            */
/* -------------------------------------------------------------------------- */

export type AnnotationArtifactKind = "TRANSCRIPT" | "DOCUMENT";

export type AnnotationRevealKey = "after_each_attempt" | "after_pass_or_last_attempt";

export type AnnotationVerdict = "FOUND" | "MISSED" | "NOT_HERE";

export interface AnnotationUnit {
  id: string;
  speaker?: string;
  text: string;
}

export interface AnnotationLabel {
  id: string;
  text: string;
  description?: string;
  color: ArtifactSwatch;
}

/** What the server sends the player — the answer key is never in here. */
export interface SanitizedAnnotation {
  kind: AnnotationArtifactKind;
  intro?: string;
  units: AnnotationUnit[];
  labels: AnnotationLabel[];
  settings: {
    passScore: number;
    maxAttempts: number | null;
    /** Points lost per wrong mark. Told to the learner before they start. */
    falsePositivePenalty: number;
    revealKey: AnnotationRevealKey;
  };
}

export interface AnnotationMarkInput {
  unitId: string;
  labelId: string;
}

export interface AnnotationResultEntry {
  unitId: string;
  labelId: string;
  verdict: AnnotationVerdict;
  points: number;
  /** The author's teaching note. Only present once the key is revealed. */
  note?: string;
}

export interface AnnotationAttemptResult extends TrackItemCompletionResult {
  attemptId: string;
  attemptNumber: number;
  scorePct: number;
  passed: boolean;
  passScore: number;
  attemptsUsed: number;
  maxAttempts: number | null;
  /** Whether misses and author notes are included below. */
  revealed: boolean;
  found: number;
  notHere: number;
  /** Present only when `revealed` — otherwise it would leak the target count. */
  missed?: number;
  pointsAwarded?: number;
  pointsPossible?: number;
  entries: AnnotationResultEntry[];
  itemCompleted: boolean;
}

export interface JournalPrompt {
  id: string;
  prompt: string;
  required: boolean;
  placeholder: string | null;
}

export interface JournalSavedResponse {
  promptId: string;
  response: string;
  submittedAt: string | null;
}

// ---------------------------------------------------------------------------
// Start-item payload (type-discriminated)
// ---------------------------------------------------------------------------

interface StartTrackItemBase {
  trackItemProgressId: string;
}

export interface StartRoleplayItemPayload extends StartTrackItemBase {
  type: TrackItemType.ROLEPLAY;
  scenarioId: number;
  completionCriteria: TrackCompletionCriteria | null;
  /** Latest ended scenario session for this item, when already completed. */
  lastScenarioSessionId: string | null;
}

export interface StartCaseItemPayload extends StartTrackItemBase {
  type: TrackItemType.CASE;
  caseId: string;
  caseSessionId: string;
  caseCompleted: boolean;
}

export interface StartQuizItemPayload extends StartTrackItemBase {
  type: TrackItemType.QUIZ;
  quiz: SanitizedQuiz;
  attemptsUsed: number;
  maxAttempts: number | null;
}

export interface StartArticleItemPayload extends StartTrackItemBase {
  type: TrackItemType.ARTICLE;
  html: string;
  minReadSeconds: number;
}

export interface StartVideoItemPayload extends StartTrackItemBase {
  type: TrackItemType.VIDEO;
  source: TrackVideoSource;
  url: string;
  durationSeconds: number;
  requiredWatchPct: number;
  maxWatchedPct: number;
}

export interface StartJournalItemPayload extends StartTrackItemBase {
  type: TrackItemType.JOURNAL;
  prompts: JournalPrompt[];
  savedResponses: JournalSavedResponse[];
}

export interface StartAnnotationItemPayload extends StartTrackItemBase {
  type: TrackItemType.ANNOTATED_ARTIFACT;
  annotation: SanitizedAnnotation;
  attemptsUsed: number;
  maxAttempts: number | null;
  /** The last graded attempt, so reopening a finished item shows the reveal. */
  lastResult: AnnotationAttemptResult | null;
}

/**
 * A game completes the moment it is opened, so the payload carries the
 * completion result the other players get back from a submit — the player
 * reports it on mount and Next is live immediately.
 */
export interface StartGameItemPayload extends StartTrackItemBase {
  type: TrackItemType.GAME;
  gameKey: TrackGameKey;
  intro: string | null;
  /** Personal best across every run so far, or null before the first. */
  bestScore: number | null;
  playCount: number;
  completion: TrackItemCompletionResult;
}

export type StartTrackItemResponse =
  | StartRoleplayItemPayload
  | StartCaseItemPayload
  | StartQuizItemPayload
  | StartArticleItemPayload
  | StartVideoItemPayload
  | StartJournalItemPayload
  | StartAnnotationItemPayload
  | StartGameItemPayload;

// ---------------------------------------------------------------------------
// Completion results
// ---------------------------------------------------------------------------

export interface TrackItemCompletionResult {
  completed: boolean;
  unlockedItemIds: string[];
  sectionCompleted: boolean;
  trackCompleted: boolean;
}

export interface VideoProgressResult extends TrackItemCompletionResult {
  maxWatchedPct: number;
}

/**
 * Roleplay/case return-to-track context persisted in sessionStorage before
 * launching a simulation from the track player.
 */
export interface ActiveTrackContext {
  trackId: string;
  itemId: string;
}

export const ACTIVE_TRACK_CONTEXT_KEY = "activeTrackContext";
