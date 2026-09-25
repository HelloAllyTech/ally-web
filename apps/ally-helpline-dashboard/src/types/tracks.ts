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
  SNAKE = "SNAKE",
  SPROUT = "SPROUT",
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
  simulationsCount: number;
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
  /** The author enabled a discussion thread beneath this item. */
  hasDiscussion?: boolean;
  /**
   * Non-null when this component reads in English despite the course being
   * read in another language — the card tells the learner why up front.
   */
  languageFallbackReason?: TrackLanguageFallbackReason | null;
}

/** Why a component reads in English inside a translated course. */
export enum TrackLanguageFallbackReason {
  VIDEO_NOT_LOCALISED = "VIDEO_NOT_LOCALISED",
  SCENARIO_NOT_TRANSLATED = "SCENARIO_NOT_TRANSLATED",
  CASE_NOT_TRANSLATED = "CASE_NOT_TRANSLATED",
}

/** A language a course is published in — English first, then translations. */
export interface TrackLanguageOption {
  languageId: number;
  /** e.g. `hi` — what the learner sends back and what is persisted. */
  languageCode: string;
  /** Endonym where the backend has one, e.g. `हिन्दी`. */
  label: string;
  isSource: boolean;
}

export interface GetTrackLanguagesResponse {
  languages: TrackLanguageOption[];
  selectedLanguageCode: string | null;
}

export interface SetTrackLanguageResponse {
  languageCode: string;
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
  simulationsCount: number;
  estimatedDurationMinutes: number | null;
  enrolled: boolean;
  trackEnrollmentId: string | null;
  completedItems: number;
  completedAt: string | null;
  /** What the learner is reading the course in right now. */
  languageCode?: string | null;
  /** Every language the course is published in, English included. */
  availableLanguages?: TrackLanguageOption[];
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
// Progress + consolidated feedback dashboard
// ---------------------------------------------------------------------------

export type SkillFeedbackClassification = "demonstrated" | "needs_practice" | "insufficient_data";

export interface TrackProgressSectionSummary {
  id: string;
  title: string;
  order: number;
  completedItems: number;
  totalItems: number;
}

/**
 * One skillCoverage category, averaged across every evaluated roleplay
 * session in this course. `category` is a raw pass-through string — both
 * label generations seen across the platform's history can appear.
 */
export interface TrackSkillCategoryFeedback {
  category: string;
  averagePercentage: number | null;
  sampleSize: number;
  classification: SkillFeedbackClassification;
}

export interface TrackRoleplaySessionFeedback {
  trackItemId: string;
  trackItemTitle: string | null;
  scenarioSessionId: string;
  compositeScore: number | null;
  occurredAt: string | null;
  evaluationMarkdown: string | null;
}

export interface TrackProgressDashboard {
  trackId: string;
  title: string;
  trackEnrollmentId: string;
  totalItems: number;
  completedItems: number;
  completionPct: number;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  sections: TrackProgressSectionSummary[];
  evaluatedRoleplaySessionCount: number;
  averageCompositeScore: number | null;
  skillCategories: TrackSkillCategoryFeedback[];
  roleplaySessions: TrackRoleplaySessionFeedback[];
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

/**
 * A picture or clip shown with a question, part of the stem rather than
 * decoration. Mirrors ally-be's `QuestionMedia`. Present on any sanitized
 * question — quiz, video interjection or inline article question.
 */
export interface QuestionMedia {
  kind: "image" | "video";
  /** `s3` = a file the trainer uploaded; the rest are third-party embeds. */
  source: "s3" | "youtube" | "vimeo" | "loom";
  url: string;
  /** Images only — what the picture shows, for screen readers. */
  alt?: string;
  /**
   * Uploaded video only: a still frame captured at author time, so the
   * learner sees the clip's content before pressing play instead of
   * whatever their player paints for a paused-at-zero video.
   */
  posterUrl?: string;
}

export interface SanitizedQuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  points: number;
  /** Optional picture or clip shown above the answer controls. */
  media?: QuestionMedia;
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

/**
 * A quiz question that hard-pauses a Track video at `timestampSeconds` until
 * answered. `source: "s3"` videos only — an embed player can't reliably
 * pause and overlay content, so the server sends an empty list otherwise.
 * `question` is sanitized the same way as a regular quiz question (no
 * answer key), and never `open_ended` (LLM-graded, doesn't fit a
 * synchronous hard-pause).
 */
export interface VideoInterjection {
  id: string;
  timestampSeconds: number;
  question: SanitizedQuizQuestion;
  /** Present once the learner has answered — skips re-triggering the overlay. */
  answered?: { passed: boolean; pointsAwarded?: number };
}

export interface InterjectionGrading {
  questionId: string;
  correct: boolean | null;
  pointsAwarded: number;
  pointsPossible: number;
  llm?: { feedback?: string };
}

/** Response to `POST .../interjections/:interjectionId/answer`. */
export interface SubmitInterjectionAnswerResponse {
  correct: boolean | null;
  grading: InterjectionGrading;
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

/**
 * How the learner has already answered one inline article question. Present
 * on a resumed article so the reader redraws the resolved state rather than
 * offering a second go at a question that is already spent.
 */
export interface AnsweredArticleQuestion {
  selectedOptionId: string;
  correct: boolean;
  /** ISO timestamp. */
  answeredAt: string;
}

/**
 * A single-select MCQ embedded in an article's prose. Where it sits is marked
 * in `html` by an empty `<div data-ally-question="<id>">` placeholder, which
 * the player splits the body on. Sanitized like any other learner-bound
 * question: `correctOptionId` and `explanation` arrive only once the question
 * has been answered and can never be answered again.
 */
export interface ArticleQuestion extends SanitizedQuizQuestion {
  answered: AnsweredArticleQuestion | null;
  correctOptionId: string | null;
  explanation: string | null;
}

export interface StartArticleItemPayload extends StartTrackItemBase {
  type: TrackItemType.ARTICLE;
  html: string;
  minReadSeconds: number;
  /** Empty for an article authored without questions. */
  questions?: ArticleQuestion[];
  answeredQuestionCount?: number;
}

/** Response to `POST .../article-questions/:questionId/answer`. */
export interface SubmitArticleQuestionAnswerResponse {
  correct: boolean;
  selectedOptionId: string;
  correctOptionId: string;
  explanation: string | null;
  answeredQuestionCount: number;
  totalQuestionCount: number;
  /** Non-null only when this answer completed the article. */
  completion: TrackItemCompletionResult | null;
}

export interface StartVideoItemPayload extends StartTrackItemBase {
  type: TrackItemType.VIDEO;
  source: TrackVideoSource;
  url: string;
  durationSeconds: number;
  requiredWatchPct: number;
  maxWatchedPct: number;
  /** Empty/absent unless `source === "s3"`. */
  interjections?: VideoInterjection[];
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
