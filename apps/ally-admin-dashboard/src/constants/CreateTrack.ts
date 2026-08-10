import {
  CompletionCriteria,
  QuizQuestionType,
  QuizSettings,
  TrackFormValues,
  TrackItemType,
} from "@types";

/** User-facing name for Track 2.0 entities in the admin ("Courses" studio tab). */
export const TRACK_ENTITY_LABEL = "Course";

export const DEFAULT_VIDEO_WATCH_PCT = 90;
export const MIN_VIDEO_WATCH_PCT = 50;
export const MAX_VIDEO_WATCH_PCT = 100;

export const DEFAULT_QUIZ_PASS_SCORE = 70;

/** Mirrors the backend's SCENARIO_PATH_ITEM_MIN_DURATION_FOR_COMPLETION fallback. */
export const DEFAULT_ROLEPLAY_MIN_DURATION_SECONDS = 180;

export const MIN_JOURNAL_PROMPTS = 1;
export const MAX_JOURNAL_PROMPTS = 5;

export const MIN_MCQ_OPTIONS = 2;
export const MAX_MCQ_OPTIONS = 8;

export const TRACK_ITEM_TYPE_LABELS: Record<TrackItemType, string> = {
  [TrackItemType.ROLEPLAY]: "Roleplay",
  [TrackItemType.CASE]: "Case",
  [TrackItemType.QUIZ]: "Quiz",
  [TrackItemType.ARTICLE]: "Article",
  [TrackItemType.VIDEO]: "Video",
  [TrackItemType.JOURNAL]: "Journal",
};

export const TRACK_ITEM_TYPE_DESCRIPTIONS: Record<TrackItemType, string> = {
  [TrackItemType.ROLEPLAY]: "Practice with an existing simulation",
  [TrackItemType.CASE]: "A multi-session case from the library",
  [TrackItemType.QUIZ]: "Check knowledge with graded questions",
  [TrackItemType.ARTICLE]: "Written content authored inline",
  [TrackItemType.VIDEO]: "Upload a video or embed a link",
  [TrackItemType.JOURNAL]: "Reflection prompts for the learner",
};

export const QUIZ_QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  mcq_single: "Multiple choice (single)",
  mcq_multi: "Multiple choice (multi)",
  true_false: "True / False",
  ordering: "Ordering",
  matching: "Matching",
  fill_blank: "Fill in the blank",
  open_ended: "Open ended",
};

export const QUIZ_SHOW_EXPLANATIONS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "after_each", label: "After each question" },
  { value: "after_submit", label: "After submitting" },
  { value: "never", label: "Never" },
];

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  passScore: DEFAULT_QUIZ_PASS_SCORE,
  maxAttempts: null,
  shuffleQuestions: false,
  shuffleOptions: false,
  showExplanations: "after_submit",
};

export const DEFAULT_COMPLETION_CRITERIA: Record<TrackItemType, CompletionCriteria> = {
  [TrackItemType.ROLEPLAY]: {
    minScore: 0,
    minDurationSeconds: DEFAULT_ROLEPLAY_MIN_DURATION_SECONDS,
  },
  [TrackItemType.CASE]: {},
  [TrackItemType.QUIZ]: {},
  [TrackItemType.ARTICLE]: {},
  [TrackItemType.VIDEO]: { watchPct: DEFAULT_VIDEO_WATCH_PCT },
  [TrackItemType.JOURNAL]: {},
};

export const DEFAULT_TRACK_FORM_VALUES: TrackFormValues = {
  title: "",
  description: "",
  coverImageUrl: "",
  isGlobal: false,
  estimatedDurationMinutes: null,
  sections: [],
};

/** Node keys for the outline rail / publish-error mapping. */
export const TRACK_SETTINGS_NODE_KEY = "settings";
export const sectionNodeKey = (sectionIndex: number) => `section:${sectionIndex}`;
export const itemNodeKey = (sectionIndex: number, itemIndex: number) =>
  `item:${sectionIndex}:${itemIndex}`;
