import { QuizAnswerInput, SanitizedQuizQuestion } from "@types";

import { MatchingPair } from "./quizHelpers";

/**
 * Local, editable answer state for a single quiz question, before it is
 * serialized into the QuizAnswerInput payload on submit.
 */
export interface QuizAnswerState {
  /** mcq_single / mcq_multi */
  selectedOptionIds?: string[];
  /** true_false */
  booleanAnswer?: boolean;
  /** ordering */
  orderedItemIds?: string[];
  /** matching */
  pairs?: MatchingPair[];
  /** fill_blank — blankId → answer */
  blanks?: Record<string, string>;
  /** open_ended */
  text?: string;
}

/** Default empty state for a question (ordering seeds the shuffled order). */
export const initialAnswerState = (question: SanitizedQuizQuestion): QuizAnswerState => {
  switch (question.type) {
    case "ordering":
      return { orderedItemIds: (question.items ?? []).map(i => i.id) };
    case "matching":
      return { pairs: [] };
    case "fill_blank":
      return { blanks: {} };
    default:
      return {};
  }
};

/** Serializes local answer state into the wire QuizAnswerInput. */
export const toAnswerInput = (
  question: SanitizedQuizQuestion,
  state: QuizAnswerState,
): QuizAnswerInput => {
  const base: QuizAnswerInput = { questionId: question.id };
  switch (question.type) {
    case "mcq_single":
    case "mcq_multi":
      return { ...base, selectedOptionIds: state.selectedOptionIds ?? [] };
    case "true_false":
      return { ...base, booleanAnswer: state.booleanAnswer };
    case "ordering":
      return { ...base, orderedItemIds: state.orderedItemIds ?? [] };
    case "matching":
      return { ...base, pairs: state.pairs ?? [] };
    case "fill_blank":
      return {
        ...base,
        blanks: Object.entries(state.blanks ?? {}).map(([blankId, answer]) => ({
          blankId,
          answer,
        })),
      };
    case "open_ended":
      return { ...base, text: state.text ?? "" };
    default:
      return base;
  }
};

/** Whether a question has enough of an answer to be submittable. */
export const isAnswered = (question: SanitizedQuizQuestion, state: QuizAnswerState): boolean => {
  switch (question.type) {
    case "mcq_single":
    case "mcq_multi":
      return (state.selectedOptionIds?.length ?? 0) > 0;
    case "true_false":
      return state.booleanAnswer !== undefined;
    case "ordering":
      return (state.orderedItemIds?.length ?? 0) > 0;
    case "matching":
      return (state.pairs?.length ?? 0) > 0;
    case "fill_blank":
      return (question.blankIds ?? []).every(id => (state.blanks?.[id] ?? "").trim().length > 0);
    case "open_ended":
      return (state.text ?? "").trim().length > 0;
    default:
      return false;
  }
};

/** Word count for open-ended answers (whitespace-delimited). */
export const wordCount = (text: string): number =>
  text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
