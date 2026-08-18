import type { ArtifactSwatch } from "@ally-ui-mono/ui-shared";

import { SimulationStatus } from "./createSimulation";
import { AssignmentStatus } from "./organizationAccess";

/**
 * Track 2.0 (admin "Courses") — types for the multi-component learning track
 * builder. Mirrors the ally-be contract under `v1/learn/admin/tracks`.
 */

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

/**
 * Games available to drop into a course. Each key maps to a self-contained
 * bundle the learner app serves from `public/games/<key>/`; adding one here
 * without adding that folder gives the learner an empty frame.
 */
export enum TrackGameKey {
  TREX_RUNNER = "TREX_RUNNER",
  TIC_TAC_TOE = "TIC_TAC_TOE",
  MEMORY_MATCH = "MEMORY_MATCH",
  CUB_N_PUP = "CUB_N_PUP",
}

/* -------------------------------------------------------------------------- */
/* Inline content payloads (track_items.content JSONB)                        */
/* -------------------------------------------------------------------------- */

export interface ArticleContent {
  html: string;
  imageUrls?: string[];
}

export type VideoSource = "s3" | "youtube" | "vimeo" | "loom";

export interface VideoContent {
  source: VideoSource;
  url: string;
  durationSeconds?: number;
}

export interface JournalPromptDef {
  id: string; // uuid
  prompt: string;
  required?: boolean;
  placeholder?: string;
}

export interface JournalContent {
  prompts: JournalPromptDef[];
}

export type QuizShowExplanations = "after_each" | "after_submit" | "never";

export interface QuizSettings {
  passScore: number; // 0-100, default 70
  maxAttempts: number | null; // null = unlimited
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showExplanations?: QuizShowExplanations;
}

export interface QuizOption {
  id: string; // uuid
  text: string;
}

interface QuizQuestionBase {
  id: string; // uuid
  prompt: string;
  explanation?: string;
  points?: number; // default 1
}

export interface McqSingleQuestion extends QuizQuestionBase {
  type: "mcq_single";
  options: QuizOption[];
  correctOptionIds: string[]; // exactly one
}

export interface McqMultiQuestion extends QuizQuestionBase {
  type: "mcq_multi";
  options: QuizOption[];
  correctOptionIds: string[];
  partialCredit?: boolean; // left undefined/false in v1
}

export interface TrueFalseQuestion extends QuizQuestionBase {
  type: "true_false";
  correctAnswer: boolean;
}

export interface OrderingQuestion extends QuizQuestionBase {
  type: "ordering";
  items: QuizOption[];
  /** Derived from authored row order on save. */
  correctOrder: string[];
}

export interface MatchingPair {
  leftId: string;
  rightId: string;
}

export interface MatchingQuestion extends QuizQuestionBase {
  type: "matching";
  left: QuizOption[];
  right: QuizOption[]; // can include distractors
  correctPairs: MatchingPair[];
}

export interface FillBlankDef {
  id: string; // token id, e.g. "b1"
  acceptedAnswers: string[];
  caseSensitive?: boolean;
}

export interface FillBlankQuestion extends QuizQuestionBase {
  type: "fill_blank";
  /** Text with `{{b1}}` tokens. `prompt` can be "". */
  template: string;
  blanks: FillBlankDef[];
}

export interface OpenEndedRubricCriterion {
  name: string;
  description?: string;
  weight?: number;
}

export interface OpenEndedRubric {
  guidance: string;
  criteria?: OpenEndedRubricCriterion[];
  maxScore: number;
}

export interface OpenEndedQuestion extends QuizQuestionBase {
  type: "open_ended";
  minWords?: number;
  rubric: OpenEndedRubric;
}

export type QuizQuestion =
  | McqSingleQuestion
  | McqMultiQuestion
  | TrueFalseQuestion
  | OrderingQuestion
  | MatchingQuestion
  | FillBlankQuestion
  | OpenEndedQuestion;

export type QuizQuestionType = QuizQuestion["type"];

export interface QuizContent {
  settings: QuizSettings;
  questions: QuizQuestion[];
}

/* ---- Annotation (ANNOTATED_ARTIFACT) ---- */

export type AnnotationArtifactKind = "TRANSCRIPT" | "DOCUMENT";

export type AnnotationRevealKey = "after_each_attempt" | "after_pass_or_last_attempt";

export interface AnnotationUnit {
  id: string; // uuid
  /** TRANSCRIPT only. */
  speaker?: string;
  text: string;
}

export interface AnnotationLabelDef {
  id: string; // uuid
  text: string;
  description?: string;
  color: ArtifactSwatch;
}

/** One (unit, label) pair the author expects the learner to find. */
export interface AnnotationTarget {
  unitId: string;
  labelId: string;
  points?: number; // default 1
  /** The teaching moment, shown to the learner on reveal. */
  note?: string;
}

export interface AnnotationSettings {
  passScore: number; // 0-100, default 70
  maxAttempts: number | null; // null = unlimited
  /** Points deducted per mark that isn't a target. 0 disables the penalty. */
  falsePositivePenalty: number;
  revealKey: AnnotationRevealKey;
}

export interface AnnotationContent {
  kind: AnnotationArtifactKind;
  intro?: string;
  units: AnnotationUnit[];
  labels: AnnotationLabelDef[];
  targets: AnnotationTarget[];
  settings: AnnotationSettings;
}

/**
 * A game has no settings beyond which game it is: games are a break between
 * the demanding parts of a course and deliberately never gate progression, so
 * there is no score, threshold or attempt limit to configure.
 */
export interface GameContent {
  gameKey: TrackGameKey;
  /** Optional framing shown above the game. */
  intro?: string;
}

export type TrackItemContent =
  | ArticleContent
  | VideoContent
  | JournalContent
  | QuizContent
  | AnnotationContent
  | GameContent;

export interface CompletionCriteria {
  /** Roleplay, 0 or above (score depends on configured behaviours and can exceed 100). */
  minScore?: number;
  minDurationSeconds?: number;
  /** Quiz — server mirrors from settings, never sent by the client. */
  passScore?: number;
  /** Video 1-100, default 90. */
  watchPct?: number;
  /** Article. */
  minReadSeconds?: number;
}

/** Source text an author pastes, kept in form state so re-segmentation is live. */
export interface AnnotationFormValue extends AnnotationContent {
  /** The raw pasted artifact. Not persisted — units are the source of truth. */
  sourceText: string;
}

/* -------------------------------------------------------------------------- */
/* API shapes                                                                 */
/* -------------------------------------------------------------------------- */

export interface TrackListItem {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  status: SimulationStatus;
  isGlobal: boolean;
  totalItems: number;
  estimatedDurationMinutes?: number;
  isAssignedToTenant?: boolean;
  updatedAt: string;
}

export interface GetTracksQueryParams {
  status?: string;
  offset?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
  /** Only applied together with `tenantId`; the API ignores it otherwise. */
  assignmentStatus?: AssignmentStatus;
  sortBy?: string;
  order?: string;
}

export interface GetTracksResponse {
  data: TrackListItem[];
  count?: number;
}

export interface TrackItemDetail {
  id: string;
  type: TrackItemType;
  order: number;
  title: string;
  description?: string;
  scenarioId?: number | null;
  caseId?: string | null;
  content?: TrackItemContent | null;
  completionCriteria?: CompletionCriteria | null;
}

export interface TrackSectionDetail {
  id: string;
  title: string;
  description?: string;
  order: number;
  items: TrackItemDetail[];
}

export interface TrackDetail {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  status: SimulationStatus;
  isGlobal: boolean;
  totalItems: number;
  estimatedDurationMinutes?: number;
  updatedAt?: string;
  sections: TrackSectionDetail[];
}

export interface TrackMetadataInput {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  isGlobal?: boolean;
  estimatedDurationMinutes?: number;
}

export interface UpdateTrackInput extends TrackMetadataInput {
  status?: SimulationStatus;
}

export interface CreateTrackResponse {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  status: SimulationStatus;
}

export interface TrackStructureItemInput {
  id?: string;
  type: TrackItemType;
  order: number; // 1-indexed
  title: string;
  description?: string;
  scenarioId?: number;
  caseId?: string;
  content?: TrackItemContent;
  completionCriteria?: CompletionCriteria;
}

export interface TrackStructureSectionInput {
  id?: string;
  title: string;
  description?: string;
  order: number; // 1-indexed
  items: TrackStructureItemInput[];
}

export interface TrackStructureInput {
  sections: TrackStructureSectionInput[];
}

export interface TrackTenantVisibilityInput {
  tenantId: string;
  trackIds: string[];
}

export interface TrackMediaUploadUrlInput {
  fileName: string;
  fileSize: number;
  contentType: string;
  kind: "image" | "video";
  duration?: number;
}

export interface TrackMediaUploadUrlResponse {
  presignedUrl: string;
  publicUrl: string;
}

/* -------------------------------------------------------------------------- */
/* Builder form state                                                         */
/* -------------------------------------------------------------------------- */

/**
 * One item row in the builder form. Discriminated by `type` with the matching
 * content slot populated (`article` / `video` / `journal` / `quiz` /
 * `annotation`); roleplay and case items carry their picked reference plus
 * display fields.
 * `localId` is a client uuid used as the stable RHF/dnd key; `serverId` is the
 * persisted `track_items.id` when the item already exists on the server.
 */
export interface TrackItemFormValue {
  localId: string;
  serverId?: string;
  type: TrackItemType;
  title: string;
  description: string;
  scenarioId?: number | null;
  caseId?: string | null;
  /** Display-only metadata for the picked roleplay/case card. */
  refTitle?: string;
  refCoverImageUrl?: string;
  article?: ArticleContent;
  video?: VideoContent;
  journal?: JournalContent;
  quiz?: QuizContent;
  annotation?: AnnotationFormValue;
  game?: GameContent;
  completionCriteria: CompletionCriteria;
}

export interface TrackSectionFormValue {
  localId: string;
  serverId?: string;
  title: string;
  description: string;
  items: TrackItemFormValue[];
}

export interface TrackFormValues {
  title: string;
  description: string;
  coverImageUrl: string;
  isGlobal: boolean;
  estimatedDurationMinutes?: number | null;
  sections: TrackSectionFormValue[];
}

/** A publish-blocking validation error, keyed to the rail node it belongs to. */
export interface PublishError {
  /** `settings` | `section:{index}` | `item:{sectionIndex}:{itemIndex}` */
  nodeKey: string;
  message: string;
}

/* -------------------------------------------------------------------------- */
/* Per-language translation (track_translations)                              */
/* -------------------------------------------------------------------------- */

/** Per-language lifecycle. Learners are only ever served PUBLISHED. */
export enum TrackTranslationStatus {
  NOT_STARTED = "NOT_STARTED",
  TRANSLATING = "TRANSLATING",
  READY_FOR_REVIEW = "READY_FOR_REVIEW",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
}

export enum TrackTranslationFallbackReason {
  VIDEO_NOT_LOCALISED = "VIDEO_NOT_LOCALISED",
  SCENARIO_NOT_TRANSLATED = "SCENARIO_NOT_TRANSLATED",
  CASE_NOT_TRANSLATED = "CASE_NOT_TRANSLATED",
}

export interface TrackTranslationFallback {
  trackItemId: string;
  itemTitle: string;
  reason: TrackTranslationFallbackReason;
}

export interface TrackTranslationSummary {
  languageId: number;
  languageCode: string;
  languageLabel: string;
  status: TrackTranslationStatus;
  publishedAt: string | null;
  totalFields: number;
  translatedFields: number;
  /** Scoring fields still awaiting confirmation. Blocks publish. */
  pendingScoringReview: number;
  sourceChanged: number;
  editedFields: number;
  fallbackItems: TrackTranslationFallback[];
  canPublish: boolean;
  blockedReason: string | null;
  error: string | null;
}

export interface TrackAvailableLanguage {
  languageId: number;
  languageCode: string;
  label: string;
}

export interface TrackTranslationsResponse {
  availableLanguages: TrackAvailableLanguage[];
  languages: TrackTranslationSummary[];
}

export type TrackTranslationFieldScope = "track" | "section" | "item";

/** One translatable string, English beside its translation. */
export interface TrackTranslationField {
  /** Stable-id path, e.g. `content.questions[q3].options[o1].text`. */
  path: string;
  kind: string;
  /** Feeds grading — must be reviewed before the language can publish. */
  scoring: boolean;
  english: string;
  translated: string | null;
  edited: boolean;
  reviewed: boolean;
  sourceChanged: boolean;
  needsReview: boolean;
}

export interface TrackTranslationItem {
  id: string;
  type: TrackItemType;
  order: number;
  fields: TrackTranslationField[];
  /** VIDEO only: the per-language cut, if the trainer supplied one. */
  media: { url: string | null } | null;
  /** ROLEPLAY/CASE defer to the linked entity's own translation. */
  deferredTo: { kind: "SCENARIO" | "CASE"; id: string } | null;
}

export interface TrackTranslationSection {
  id: string;
  order: number;
  fields: TrackTranslationField[];
  items: TrackTranslationItem[];
}

export interface TrackTranslationDetail {
  trackId: string;
  languageId: number;
  languageCode: string;
  label: string;
  status: TrackTranslationStatus;
  publishedAt: string | null;
  error: string | null;
  summary: TrackTranslationSummary | null;
  track: { id: string; fields: TrackTranslationField[] };
  sections: TrackTranslationSection[];
}

export interface TrackTranslationFieldEdit {
  scope: TrackTranslationFieldScope;
  entityId?: string;
  path: string;
  value: string;
}

export interface TrackTranslationFieldRef {
  scope: TrackTranslationFieldScope;
  entityId?: string;
  path: string;
}

/** Live progress over the `/tracks/translations` socket. */
export enum TrackTranslationJobStatus {
  STARTED = "STARTED",
  TRANSLATING = "TRANSLATING",
  LANGUAGE_COMPLETED = "LANGUAGE_COMPLETED",
  LANGUAGE_FAILED = "LANGUAGE_FAILED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface TrackTranslationProgress {
  jobId: string;
  trackId: string;
  trackTitle?: string;
  status: TrackTranslationJobStatus;
  language?: string;
  languageId?: number;
  completed: number;
  total: number;
  fieldsCompleted?: number;
  fieldsTotal?: number;
  error?: string;
  emittedAt: string;
}
