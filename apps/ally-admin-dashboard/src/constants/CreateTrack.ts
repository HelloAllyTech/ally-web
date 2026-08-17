import {
  AnnotationArtifactKind,
  AnnotationRevealKey,
  AnnotationSettings,
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
  [TrackItemType.ANNOTATED_ARTIFACT]: "Annotation",
};

export const TRACK_ITEM_TYPE_DESCRIPTIONS: Record<TrackItemType, string> = {
  [TrackItemType.ROLEPLAY]: "Practice with an existing simulation",
  [TrackItemType.CASE]: "A multi-session case from the library",
  [TrackItemType.QUIZ]: "Check knowledge with graded questions",
  [TrackItemType.ARTICLE]: "Written content authored inline",
  [TrackItemType.VIDEO]: "Upload a video or embed a link",
  [TrackItemType.JOURNAL]: "Reflection prompts for the learner",
  [TrackItemType.ANNOTATED_ARTIFACT]: "Mark up a real transcript or note",
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
  [TrackItemType.ROLEPLAY]: {},
  [TrackItemType.CASE]: {},
  [TrackItemType.QUIZ]: {},
  [TrackItemType.ARTICLE]: {},
  [TrackItemType.VIDEO]: { watchPct: DEFAULT_VIDEO_WATCH_PCT },
  [TrackItemType.JOURNAL]: {},
  [TrackItemType.ANNOTATED_ARTIFACT]: {},
};

/* ---- Annotation (ANNOTATED_ARTIFACT) ---- */

export const MAX_ANNOTATION_UNITS = 300;
export const MAX_ANNOTATION_LABELS = 8;
export const MIN_ANNOTATION_LABELS = 1;
export const DEFAULT_ANNOTATION_PASS_SCORE = 70;
export const DEFAULT_ANNOTATION_FALSE_POSITIVE_PENALTY = 1;

export const ANNOTATION_KIND_OPTIONS: Array<{
  value: AnnotationArtifactKind;
  label: string;
  hint: string;
}> = [
  {
    value: "TRANSCRIPT",
    label: "Transcript",
    hint: "One line per speaker turn. Paste as `Speaker: what they said`.",
  },
  {
    value: "DOCUMENT",
    label: "Document",
    hint: "One line per paragraph. Separate paragraphs with a blank line.",
  },
];

export const ANNOTATION_REVEAL_OPTIONS: Array<{
  value: AnnotationRevealKey;
  label: string;
  hint: string;
}> = [
  {
    value: "after_pass_or_last_attempt",
    label: "After they pass or run out of attempts",
    hint: "Learners see their own marks scored after every attempt, but the lines they missed stay hidden until the end.",
  },
  {
    value: "after_each_attempt",
    label: "After every attempt",
    hint: "The full answer key shows every time. Best with a single attempt — otherwise attempt two is a copying exercise.",
  },
];

export const DEFAULT_ANNOTATION_SETTINGS: AnnotationSettings = {
  passScore: DEFAULT_ANNOTATION_PASS_SCORE,
  maxAttempts: 2,
  falsePositivePenalty: DEFAULT_ANNOTATION_FALSE_POSITIVE_PENALTY,
  revealKey: "after_pass_or_last_attempt",
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
