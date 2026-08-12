import {
  DEFAULT_COMPLETION_CRITERIA,
  DEFAULT_QUIZ_SETTINGS,
  DEFAULT_VIDEO_WATCH_PCT,
  itemNodeKey,
  MAX_JOURNAL_PROMPTS,
  MAX_MCQ_OPTIONS,
  MIN_MCQ_OPTIONS,
  sectionNodeKey,
  TRACK_ITEM_TYPE_LABELS,
  TRACK_SETTINGS_NODE_KEY,
} from "@constants";
import {
  ArticleContent,
  CompletionCriteria,
  FillBlankQuestion,
  JournalContent,
  MatchingQuestion,
  McqMultiQuestion,
  McqSingleQuestion,
  OpenEndedQuestion,
  OrderingQuestion,
  PublishError,
  QuizContent,
  QuizQuestion,
  QuizQuestionType,
  TrackDetail,
  TrackFormValues,
  TrackItemFormValue,
  TrackItemType,
  TrackMetadataInput,
  TrackSectionFormValue,
  TrackStructureInput,
  TrackStructureItemInput,
  TrueFalseQuestion,
  VideoContent,
  VideoSource,
} from "@types";

const newId = () => crypto.randomUUID();

/* -------------------------------------------------------------------------- */
/* Factories                                                                  */
/* -------------------------------------------------------------------------- */

export const createEmptySection = (index: number): TrackSectionFormValue => ({
  localId: newId(),
  title: `Section ${index + 1}`,
  description: "",
  items: [],
});

export const createItemOfType = (type: TrackItemType): TrackItemFormValue => {
  const base: TrackItemFormValue = {
    localId: newId(),
    type,
    title: "",
    description: "",
    completionCriteria: { ...DEFAULT_COMPLETION_CRITERIA[type] },
  };

  switch (type) {
    case TrackItemType.ARTICLE:
      return { ...base, article: { html: "" } };
    case TrackItemType.VIDEO:
      return { ...base, video: { source: "s3", url: "" } };
    case TrackItemType.JOURNAL:
      return {
        ...base,
        journal: { prompts: [{ id: newId(), prompt: "", required: true, placeholder: "" }] },
      };
    case TrackItemType.QUIZ:
      return { ...base, quiz: { settings: { ...DEFAULT_QUIZ_SETTINGS }, questions: [] } };
    case TrackItemType.ROLEPLAY:
      return { ...base, scenarioId: null };
    case TrackItemType.CASE:
      return { ...base, caseId: null };
    default:
      return base;
  }
};

export const createQuestionOfType = (type: QuizQuestionType): QuizQuestion => {
  const base = { id: newId(), prompt: "", explanation: "", points: 1 };
  switch (type) {
    case "mcq_single": {
      const options = [
        { id: newId(), text: "" },
        { id: newId(), text: "" },
      ];
      return { ...base, type, options, correctOptionIds: [options[0].id] };
    }
    case "mcq_multi": {
      const options = [
        { id: newId(), text: "" },
        { id: newId(), text: "" },
      ];
      return { ...base, type, options, correctOptionIds: [] };
    }
    case "true_false":
      return { ...base, type, correctAnswer: true };
    case "ordering":
      return {
        ...base,
        type,
        items: [
          { id: newId(), text: "" },
          { id: newId(), text: "" },
        ],
        correctOrder: [],
      };
    case "matching":
      return {
        ...base,
        type,
        left: [
          { id: newId(), text: "" },
          { id: newId(), text: "" },
        ],
        right: [
          { id: newId(), text: "" },
          { id: newId(), text: "" },
        ],
        correctPairs: [],
      };
    case "fill_blank":
      return { ...base, type, template: "", blanks: [] };
    case "open_ended":
      return { ...base, type, rubric: { guidance: "", criteria: [], maxScore: 10 } };
  }
};

/* -------------------------------------------------------------------------- */
/* Small parsing helpers                                                      */
/* -------------------------------------------------------------------------- */

const BLANK_TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;

/** Extract `{{b1}}`-style token ids from a fill-blank template, in order, deduped. */
export const parseBlankTokens = (template: string): string[] => {
  if (!template) return [];
  const tokens: string[] = [];
  for (const match of template.matchAll(BLANK_TOKEN_REGEX)) {
    if (!tokens.includes(match[1])) tokens.push(match[1]);
  }
  return tokens;
};

/** Next unused `b{n}` token id for a fill-blank template. */
export const nextBlankTokenId = (template: string): string => {
  const tokens = parseBlankTokens(template);
  let n = tokens.length + 1;
  while (tokens.includes(`b${n}`)) n += 1;
  return `b${n}`;
};

export interface ParsedVideoEmbed {
  source: Exclude<VideoSource, "s3">;
  url: string;
  embedUrl: string;
}

/** Parse a pasted YouTube / Vimeo / Loom URL into provider + embeddable URL. */
export const parseVideoEmbedUrl = (rawUrl: string): ParsedVideoEmbed | null => {
  const url = (rawUrl || "").trim();
  if (!url) return null;

  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  if (youtube) {
    return {
      source: "youtube",
      url,
      embedUrl: `https://www.youtube.com/embed/${youtube[1]}`,
    };
  }

  const vimeo = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { source: "vimeo", url, embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  }

  const loom = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loom) {
    return { source: "loom", url, embedUrl: `https://www.loom.com/embed/${loom[1]}` };
  }

  return null;
};

/** Embeddable player URL for a stored (non-s3) video content value. */
export const getEmbedPlayerUrl = (video: VideoContent): string | null => {
  if (video.source === "s3") return null;
  return parseVideoEmbedUrl(video.url)?.embedUrl ?? null;
};

/** Pull img src values out of article HTML (kept in `content.imageUrls`). */
export const extractImageUrls = (html: string): string[] => {
  if (!html) return [];
  const urls: string[] = [];
  for (const match of html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)) {
    if (!urls.includes(match[1])) urls.push(match[1]);
  }
  return urls;
};

const stripHtml = (html: string): string => (html || "").replace(/<[^>]*>/g, "").trim();

const isBlank = (value?: string | null): boolean => !value || !value.trim();

/* -------------------------------------------------------------------------- */
/* Publish validation                                                         */
/* -------------------------------------------------------------------------- */

const validateQuestion = (question: QuizQuestion, label: string): string[] => {
  const errors: string[] = [];
  const needsPrompt = question.type !== "fill_blank";
  if (needsPrompt && isBlank(question.prompt)) errors.push(`${label}: question text is required`);

  switch (question.type) {
    case "mcq_single":
    case "mcq_multi": {
      const q = question as McqSingleQuestion | McqMultiQuestion;
      if (q.options.length < MIN_MCQ_OPTIONS || q.options.length > MAX_MCQ_OPTIONS) {
        errors.push(`${label}: needs ${MIN_MCQ_OPTIONS}-${MAX_MCQ_OPTIONS} options`);
      }
      if (q.options.some(option => isBlank(option.text))) {
        errors.push(`${label}: every option needs text`);
      }
      const optionIds = new Set(q.options.map(option => option.id));
      const validCorrect = q.correctOptionIds.filter(id => optionIds.has(id));
      if (question.type === "mcq_single" && validCorrect.length !== 1) {
        errors.push(`${label}: mark exactly one correct option`);
      }
      if (question.type === "mcq_multi" && validCorrect.length < 1) {
        errors.push(`${label}: mark at least one correct option`);
      }
      break;
    }
    case "true_false": {
      const q = question as TrueFalseQuestion;
      if (typeof q.correctAnswer !== "boolean") {
        errors.push(`${label}: pick the correct answer`);
      }
      break;
    }
    case "ordering": {
      const q = question as OrderingQuestion;
      if (q.items.length < 2) errors.push(`${label}: needs at least 2 items to order`);
      if (q.items.some(item => isBlank(item.text))) errors.push(`${label}: every item needs text`);
      break;
    }
    case "matching": {
      const q = question as MatchingQuestion;
      if (q.left.length < 2) errors.push(`${label}: needs at least 2 pairs`);
      if (q.left.some(entry => isBlank(entry.text)) || q.right.some(entry => isBlank(entry.text))) {
        errors.push(`${label}: every entry needs text`);
      }
      const rightIds = new Set(q.right.map(entry => entry.id));
      const pairedLeftIds = new Set(
        q.correctPairs.filter(pair => rightIds.has(pair.rightId)).map(pair => pair.leftId),
      );
      if (q.left.some(entry => !pairedLeftIds.has(entry.id))) {
        errors.push(`${label}: every left entry needs a matching right answer`);
      }
      break;
    }
    case "fill_blank": {
      const q = question as FillBlankQuestion;
      const tokens = parseBlankTokens(q.template);
      if (tokens.length === 0) {
        errors.push(`${label}: template needs at least one {{blank}} token`);
      }
      for (const token of tokens) {
        const blank = q.blanks.find(entry => entry.id === token);
        const answers = (blank?.acceptedAnswers ?? []).filter(answer => !isBlank(answer));
        if (answers.length === 0) {
          errors.push(`${label}: blank "${token}" needs at least one accepted answer`);
        }
      }
      break;
    }
    case "open_ended": {
      const q = question as OpenEndedQuestion;
      if (isBlank(q.rubric?.guidance)) errors.push(`${label}: grading guidance is required`);
      if (!q.rubric || !(q.rubric.maxScore >= 1)) {
        errors.push(`${label}: rubric max score must be at least 1`);
      }
      break;
    }
  }
  return errors;
};

const validateItem = (item: TrackItemFormValue): string[] => {
  const errors: string[] = [];
  const typeLabel = TRACK_ITEM_TYPE_LABELS[item.type];
  if (isBlank(item.title)) errors.push(`${typeLabel}: title is required`);

  switch (item.type) {
    case TrackItemType.ROLEPLAY: {
      if (item.scenarioId == null) errors.push("Roleplay: pick a simulation");
      const minScore = item.completionCriteria?.minScore;
      if (minScore != null && minScore < 0) {
        errors.push("Roleplay: minimum score must be 0 or above");
      }
      break;
    }
    case TrackItemType.CASE:
      if (item.caseId == null || isBlank(String(item.caseId))) errors.push("Case: pick a case");
      break;
    case TrackItemType.ARTICLE:
      if (isBlank(stripHtml(item.article?.html ?? ""))) {
        errors.push("Article: content is required");
      }
      break;
    case TrackItemType.VIDEO: {
      if (isBlank(item.video?.url)) {
        errors.push("Video: upload a video or paste an embed URL");
      } else if (item.video?.source !== "s3" && !parseVideoEmbedUrl(item.video?.url ?? "")) {
        errors.push("Video: embed URL must be a YouTube, Vimeo or Loom link");
      }
      const watchPct = item.completionCriteria?.watchPct;
      if (watchPct != null && (watchPct < 1 || watchPct > 100)) {
        errors.push("Video: watch percentage must be between 1 and 100");
      }
      break;
    }
    case TrackItemType.JOURNAL: {
      const prompts = item.journal?.prompts ?? [];
      if (prompts.length < 1 || prompts.length > MAX_JOURNAL_PROMPTS) {
        errors.push(`Journal: needs 1-${MAX_JOURNAL_PROMPTS} prompts`);
      }
      if (prompts.some(prompt => isBlank(prompt.prompt))) {
        errors.push("Journal: every prompt needs text");
      }
      break;
    }
    case TrackItemType.QUIZ: {
      const quiz = item.quiz;
      const passScore = quiz?.settings?.passScore;
      if (passScore == null || passScore < 0 || passScore > 100) {
        errors.push("Quiz: pass score must be between 0 and 100");
      }
      const questions = quiz?.questions ?? [];
      if (questions.length === 0) {
        errors.push("Quiz: add at least one question");
      }
      questions.forEach((question, index) => {
        errors.push(...validateQuestion(question, `Question ${index + 1}`));
      });
      break;
    }
  }
  return errors;
};

/**
 * Pure publish validation, mirroring the server's structure checks. The server
 * remains the authority — this only powers the disabled Publish button and the
 * red badges on offending outline-rail nodes.
 */
export const validateTrackForPublish = (values: TrackFormValues): PublishError[] => {
  const errors: PublishError[] = [];
  const settings = (message: string) => errors.push({ nodeKey: TRACK_SETTINGS_NODE_KEY, message });

  if (isBlank(values.title)) settings("Title is required");
  if (isBlank(values.description)) settings("Description is required");
  if (isBlank(values.coverImageUrl)) settings("Cover image is required");

  if (!values.sections || values.sections.length === 0) {
    settings("Add at least one section");
  }

  values.sections?.forEach((section, sectionIndex) => {
    const key = sectionNodeKey(sectionIndex);
    if (isBlank(section.title)) {
      errors.push({ nodeKey: key, message: `Section ${sectionIndex + 1}: title is required` });
    }
    if (!section.items || section.items.length === 0) {
      errors.push({
        nodeKey: key,
        message: `Section ${sectionIndex + 1}: add at least one component`,
      });
    }
    section.items?.forEach((item, itemIndex) => {
      for (const message of validateItem(item)) {
        errors.push({ nodeKey: itemNodeKey(sectionIndex, itemIndex), message });
      }
    });
  });

  return errors;
};

/* -------------------------------------------------------------------------- */
/* Serialization (form <-> API)                                               */
/* -------------------------------------------------------------------------- */

const compactCriteria = (criteria?: CompletionCriteria): CompletionCriteria | undefined => {
  if (!criteria) return undefined;
  const compact: CompletionCriteria = {};
  if (criteria.minScore != null) compact.minScore = criteria.minScore;
  if (criteria.minDurationSeconds != null) {
    compact.minDurationSeconds = criteria.minDurationSeconds;
  }
  if (criteria.watchPct != null) compact.watchPct = criteria.watchPct;
  if (criteria.minReadSeconds != null) compact.minReadSeconds = criteria.minReadSeconds;
  // NOTE: passScore is intentionally never sent — the server mirrors it from
  // the quiz settings.
  return Object.keys(compact).length > 0 ? compact : undefined;
};

const serializeQuiz = (quiz: QuizContent): QuizContent => ({
  settings: { ...quiz.settings },
  questions: quiz.questions.map(question => {
    if (question.type === "ordering") {
      // Authored row order IS the correct order.
      return { ...question, correctOrder: question.items.map(entry => entry.id) };
    }
    if (question.type === "fill_blank") {
      // Only keep blanks whose token still exists in the template.
      const tokens = parseBlankTokens(question.template);
      return {
        ...question,
        blanks: tokens.map(
          token =>
            question.blanks.find(blank => blank.id === token) ?? {
              id: token,
              acceptedAnswers: [],
            },
        ),
      };
    }
    return question;
  }),
});

const serializeItem = (item: TrackItemFormValue, order: number): TrackStructureItemInput => {
  const payload: TrackStructureItemInput = {
    ...(item.serverId ? { id: item.serverId } : {}),
    type: item.type,
    order,
    title: item.title,
    description: item.description || undefined,
  };

  switch (item.type) {
    case TrackItemType.ROLEPLAY:
      payload.scenarioId = item.scenarioId ?? undefined;
      break;
    case TrackItemType.CASE:
      payload.caseId = item.caseId ?? undefined;
      break;
    case TrackItemType.ARTICLE: {
      const html = item.article?.html ?? "";
      const imageUrls = extractImageUrls(html);
      payload.content = { html, ...(imageUrls.length > 0 ? { imageUrls } : {}) };
      break;
    }
    case TrackItemType.VIDEO:
      payload.content = item.video ? { ...item.video } : undefined;
      break;
    case TrackItemType.JOURNAL:
      payload.content = item.journal ? { prompts: item.journal.prompts } : undefined;
      break;
    case TrackItemType.QUIZ:
      payload.content = item.quiz ? serializeQuiz(item.quiz) : undefined;
      break;
  }

  const criteria = compactCriteria(item.completionCriteria);
  if (criteria) payload.completionCriteria = criteria;

  return payload;
};

/** Whole-tree structure payload for PUT /tracks/:id/structure. */
export const serializeTrackForm = (values: TrackFormValues): TrackStructureInput => ({
  sections: values.sections.map((section, sectionIndex) => ({
    ...(section.serverId ? { id: section.serverId } : {}),
    title: section.title,
    description: section.description || undefined,
    order: sectionIndex + 1,
    items: section.items.map((item, itemIndex) => serializeItem(item, itemIndex + 1)),
  })),
});

export const extractTrackMetadata = (values: TrackFormValues): TrackMetadataInput => ({
  title: values.title,
  description: values.description,
  coverImageUrl: values.coverImageUrl || undefined,
  isGlobal: values.isGlobal,
  estimatedDurationMinutes: values.estimatedDurationMinutes ?? undefined,
});

/** GET /tracks/:id response -> builder form values (fresh client localIds). */
export const deserializeTrack = (detail: TrackDetail): TrackFormValues => ({
  title: detail.title ?? "",
  description: detail.description ?? "",
  coverImageUrl: detail.coverImageUrl ?? "",
  isGlobal: detail.isGlobal ?? false,
  estimatedDurationMinutes: detail.estimatedDurationMinutes ?? null,
  sections: [...(detail.sections ?? [])]
    .sort((a, b) => a.order - b.order)
    .map(section => ({
      localId: newId(),
      serverId: section.id,
      title: section.title ?? "",
      description: section.description ?? "",
      items: [...(section.items ?? [])]
        .sort((a, b) => a.order - b.order)
        .map(item => {
          const formItem: TrackItemFormValue = {
            localId: newId(),
            serverId: item.id,
            type: item.type,
            title: item.title ?? "",
            description: item.description ?? "",
            completionCriteria: {
              ...DEFAULT_COMPLETION_CRITERIA[item.type],
              ...(item.completionCriteria ?? {}),
            },
          };
          switch (item.type) {
            case TrackItemType.ROLEPLAY:
              formItem.scenarioId = item.scenarioId ?? null;
              break;
            case TrackItemType.CASE:
              formItem.caseId = item.caseId ?? null;
              break;
            case TrackItemType.ARTICLE:
              formItem.article = (item.content as ArticleContent) ?? { html: "" };
              break;
            case TrackItemType.VIDEO:
              formItem.video = (item.content as VideoContent) ?? { source: "s3", url: "" };
              if (formItem.completionCriteria.watchPct == null) {
                formItem.completionCriteria.watchPct = DEFAULT_VIDEO_WATCH_PCT;
              }
              break;
            case TrackItemType.JOURNAL:
              formItem.journal = (item.content as JournalContent) ?? { prompts: [] };
              break;
            case TrackItemType.QUIZ: {
              const quiz = item.content as QuizContent | undefined;
              formItem.quiz = quiz ?? { settings: { ...DEFAULT_QUIZ_SETTINGS }, questions: [] };
              break;
            }
          }
          return formItem;
        }),
    })),
});
