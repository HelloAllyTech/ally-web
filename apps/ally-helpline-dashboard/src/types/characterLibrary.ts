/**
 * Character Library types, ported from ally-admin-dashboard's
 * `src/types/simulation.ts` (CharacterData/CharacterKnowledgeSource) and
 * `src/types/characterInterview.ts` (interview-agent SSE contract). Kept in
 * this app's own `src/types` rather than a shared lib — see the workspace
 * memory on this port: neither type lives in `libs/ui-shared` today.
 *
 * Mirrors the backend SSE contract in
 * ally-be src/scenario-character/type/character-interview-sse.type.ts. The
 * question widget types are deliberately identical to the Roleplay Studio
 * copilot's so the same QuestionCard shape renders both.
 */

export interface CharacterKnowledgeSource {
  id: string;
  title: string;
  text?: string;
}

export interface CharacterData {
  id?: string;
  name: string;
  age: number | string;
  gender: string;
  profession: string | null;
  currentLocation: string;
  genderIdentity: string;
  sexualOrientation: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  characterProfileText?: string;
  voiceId?: string;
  languageCharacteristics?: string;
  linguisticStyleSamples?: string[];
  knowledgeSources?: CharacterKnowledgeSource[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface GetCharactersResponse {
  characters: CharacterData[];
  count: number;
}

export type CharacterInterviewQuestionKind =
  | "freeText"
  | "singleSelect"
  | "multiSelect"
  | "dropdown";

export interface CharacterInterviewQuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface CharacterInterviewQuestionEvent {
  id: string;
  prompt: string;
  kind: CharacterInterviewQuestionKind;
  options?: CharacterInterviewQuestionOption[];
  /** Show an "add your own" free-text entry alongside the options. */
  allowCustom?: boolean;
  /** Render a synthetic "None of these" choice. */
  allowNone?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

/** Structured answer the FE posts for select / dropdown cards. */
export interface CharacterInterviewStructuredAnswer {
  selectedOptionIds?: string[];
  customValues?: string[];
  none?: boolean;
}

export interface CharacterInterviewTokenEvent {
  delta: string;
}

export interface CharacterInterviewToolCallEvent {
  name: string;
  input: Record<string, unknown>;
}

export interface CharacterInterviewToolResultEvent {
  name: string;
  summary: string;
}

/**
 * save_character_draft payload. The draft is NOT saved to the library — it
 * prefills the character form, and the admin's Save there creates the entry.
 */
export interface CharacterDraftEvent {
  draft: CharacterData;
}

export interface CharacterInterviewErrorEvent {
  code: string;
  message: string;
}

export interface CharacterInterviewDoneEvent {
  messageSeq: number;
  sessionStatus: string;
}

export type CharacterInterviewStreamEvent =
  | { type: "token"; data: CharacterInterviewTokenEvent }
  | { type: "tool_call"; data: CharacterInterviewToolCallEvent }
  | { type: "tool_result"; data: CharacterInterviewToolResultEvent }
  | { type: "question"; data: CharacterInterviewQuestionEvent }
  | { type: "character_draft"; data: CharacterDraftEvent }
  | { type: "error"; data: CharacterInterviewErrorEvent }
  // Server heartbeat during long generations — carries no payload.
  | { type: "ping"; data: Record<string, unknown> }
  | { type: "done"; data: CharacterInterviewDoneEvent };

/** Chat feed entry rendered by the interview page. */
export interface CharacterInterviewChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Present when the agent asked a structured question. */
  question?: CharacterInterviewQuestionEvent;
  /** On resumed freeText/singleSelect questions: the answer already given. */
  answeredWith?: string;
  /** On resumed multi-select / dropdown cards: the structured answer. */
  answeredAnswer?: CharacterInterviewStructuredAnswer;
  /** Tool activity annotations shown inline. */
  toolNotes?: string[];
  /** True when a stream was aborted mid-message. */
  interrupted?: boolean;
  /** True while tokens are still streaming into this message. */
  streaming?: boolean;
  error?: string;
}

/** A persisted character_interview_messages row (resume path). */
export interface CharacterInterviewServerMessage {
  id?: string;
  seq?: number;
  role: "user" | "assistant";
  content?: string | null;
  toolCalls?: { id?: string; name?: string; input?: unknown }[] | null;
  toolResults?: { name?: string; result?: unknown }[] | null;
  metadata?: {
    questionId?: string;
    answer?: CharacterInterviewStructuredAnswer;
    questions?: CharacterInterviewQuestionEvent[];
    characterDraft?: CharacterData;
    [key: string]: unknown;
  } | null;
}

export interface CharacterInterviewSession {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  lastMessageSeq: number;
  draftCharacter?: CharacterData | null;
  createdAt: string;
  updatedAt: string;
  messages?: CharacterInterviewServerMessage[];
}
