/** Types for the WhatsApp Q&A bot admin tab. Mirrors ally-be's DTOs. */

export enum KbDocumentSourceType {
  PASTE = "paste",
  PDF = "pdf",
  DOCX = "docx",
  EPUB = "epub",
  URL = "url",
}

/**
 * Ingest lifecycle. Finer-grained than a plain pending/done/failed because extraction can fail
 * independently of indexing, and "this PDF is encrypted" and "the index was down" have different
 * fixes — the admin needs to tell them apart.
 */
export enum KbDocumentStatus {
  PENDING = "pending",
  EXTRACTING = "extracting",
  CHUNKING = "chunking",
  INDEXING = "indexing",
  INDEXED = "indexed",
  FAILED = "failed",
}

/** The statuses the corpus table treats as still in flight, which is what drives polling. */
export const KB_IN_FLIGHT_STATUSES: KbDocumentStatus[] = [
  KbDocumentStatus.PENDING,
  KbDocumentStatus.EXTRACTING,
  KbDocumentStatus.CHUNKING,
  KbDocumentStatus.INDEXING,
];

export interface KbDocument {
  id: string;
  title: string;
  sourceType: KbDocumentSourceType;
  sourceUrl: string | null;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  language: string | null;
  tags: string[];
  status: KbDocumentStatus;
  /** The failure reason verbatim — rendered in the table, not swallowed into a generic message. */
  statusMessage: string | null;
  chunkCount: number;
  indexedChunkCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetKbDocumentsParams {
  /** Whitelisted server-side; an unknown key falls back to the default order. */
  sortBy?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
  search?: string;
  status?: KbDocumentStatus;
  sourceType?: KbDocumentSourceType;
  includeArchived?: boolean;
}

export interface GetKbDocumentsResponse {
  documents: KbDocument[];
  count: number;
}

export interface CreateKbUploadUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface CreateKbUploadUrlResponse {
  presignedUrl: string;
  /** Pass back as fileUrl when creating the document. */
  fileUrl: string;
}

export interface CreateKbDocumentRequest {
  title: string;
  sourceType: KbDocumentSourceType;
  text?: string;
  sourceUrl?: string;
  fileUrl?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  language?: string;
  tags?: string[];
}

export interface UpdateKbDocumentRequest {
  id: string;
  title?: string;
  tags?: string[];
  language?: string;
}

export interface ReplaceKbDocumentContentRequest {
  id: string;
  text: string;
}

export interface KbChunk {
  id: string;
  chunkIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
  /** 0 when the source format has no pages. */
  pageFrom: number;
  pageTo: number;
  sectionPath: string | null;
  tokenCount: number;
  uploadStatus: string;
  uploadError: string | null;
}

export interface GetKbChunksResponse {
  chunks: KbChunk[];
  count: number;
}

export interface KbStats {
  byStatus: Record<string, number>;
  totalChunks: number;
  indexedChunks: number;
}

export interface KbSearchRequest {
  query: string;
  limit?: number;
  minSimilarity?: number;
}

export interface KbPassage {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_index: number;
  text: string;
  page_from: number;
  page_to: number;
  section_path: string;
  similarity: number;
}

export interface KbSearchResponse {
  passages: KbPassage[];
}

// ── Keyword templates ────────────────────────────────────────────────────────

export enum WaTemplateKind {
  CRISIS = "crisis",
  COMMAND = "command",
  CONSENT = "consent",
  FAQ = "faq",
}

export enum WaTemplateMatchType {
  EXACT = "exact",
  CONTAINS = "contains",
  ANY_OF = "any_of",
  REGEX = "regex",
}

export interface WaTemplate {
  id: string;
  kind: WaTemplateKind;
  name: string;
  matchType: WaTemplateMatchType;
  patterns: string[];
  languageCode: string | null;
  /** Ascending evaluation order. Bands: crisis 0-99, consent 100-199, command 200-299, faq 300+. */
  priority: number;
  responseText: string;
  bypassRag: boolean;
  terminal: boolean;
  active: boolean;
  /**
   * A seeded safety template. Its wording is editable, but it cannot be deactivated or removed —
   * a bot for this audience with its crisis reply switched off is unsafe, not merely degraded.
   */
  mandatory: boolean;
  archivedAt: string | null;
}

export interface GetWaTemplatesResponse {
  templates: WaTemplate[];
  count: number;
}

export interface CreateWaTemplateRequest {
  kind: WaTemplateKind;
  name: string;
  matchType: WaTemplateMatchType;
  patterns: string[];
  languageCode?: string;
  priority: number;
  responseText: string;
  bypassRag?: boolean;
  terminal?: boolean;
  active?: boolean;
}

export interface UpdateWaTemplateRequest extends Partial<CreateWaTemplateRequest> {
  id: string;
}

export interface TestWaTemplateRequest {
  text: string;
  language?: string;
}

export interface TestWaTemplateResponse {
  matched: boolean;
  normalisedText: string;
  template?: { id: string; name: string; kind: WaTemplateKind; priority: number };
  reply?: string;
  terminal?: boolean;
  wouldReachRetrieval: boolean;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface WaRetrievalSettings {
  topK: number;
  /** Permissive retrieval floor. */
  minSimilarity: number;
  /** The actual decline decision — deliberately higher than the floor. */
  declineSimilarity: number;
  maxPassages: number;
  maxContextTokens: number;
  similarityBand: number;
  translateQuery: boolean;
}

export interface WaBotSettings {
  /** The kill switch. */
  enabled: boolean;
  provider: string;
  consentRequired: boolean;
  disclaimerText: string;
  crisisEscalationText: string;
  fallbackText: string;
  declineText: string;
  unsupportedMediaText: string;
  rateLimitText: string;
  rateLimit: { perMinute: number; perHour: number; perDay: number };
  retrieval: WaRetrievalSettings;
  maxAnswerChars: number;
  maxReplyChars: number;
  maxCitations: number;
  conversationIdleMinutes: number;
  /** Days before message bodies and phone numbers are blanked. 0 disables the sweep. */
  retentionDays: number;
  /** Run the LLM crisis classifier alongside retrieval. Keyword rules are unaffected by this. */
  crisisClassifierEnabled: boolean;
  helplineNumbers: string;
}

/** Booleans only — the endpoint never returns a secret's value. */
export interface WaProviderHealth {
  enabled: boolean;
  provider: string;
  verifyTokenConfigured: boolean;
  appSecretConfigured: boolean;
  phoneNumberIdConfigured: boolean;
  accessTokenConfigured: boolean;
  inboundQueueConfigured: boolean;
}

// ── Preview console ──────────────────────────────────────────────────────────

export interface WaPreviewCitation {
  passage_number: number;
  chunk_id: string;
  document_id: string;
  document_title: string;
  page_from: number;
  page_to: number;
  section_path: string;
  similarity: number;
}

export interface WaPreviewRetrieval {
  top_k: number;
  min_similarity: number;
  decline_similarity: number;
  hit_count: number;
  top_similarity: number;
  passages_used: number;
  query_language: string;
  /** The English text actually embedded; null when searched as written. */
  translated_query: string | null;
  /** True when the model answered but cited nothing. */
  unsupported: boolean;
}

export interface WaPreviewResponse {
  intent: "answer" | "decline" | "clarify";
  declineReason: string;
  /** The exact message a worker would receive, including source lines and truncation. */
  reply: string;
  replyLength: number;
  language: string;
  citations: WaPreviewCitation[];
  retrieval: WaPreviewRetrieval;
  provider: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
}

export interface WaPreviewRequest {
  question: string;
  retrieval?: Partial<WaRetrievalSettings>;
}

// ── Conversation log ─────────────────────────────────────────────────────────

export enum WaHandledBy {
  TEMPLATE = "template",
  CRISIS = "crisis",
  CONSENT = "consent",
  RAG = "rag",
  DECLINED = "declined",
  CLARIFIED = "clarified",
  RATE_LIMITED = "rate_limited",
  UNSUPPORTED_MEDIA = "unsupported_media",
  ERROR = "error",
}

/** A thread summary. Note there is no full phone number — only the last four digits. */
export interface WaConversationSummary {
  id: string;
  contactId: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  lastLanguage: string | null;
  phoneLast4: string;
  consentStatus: string;
  blockedAt: string | null;
}

export interface GetWaConversationsResponse {
  conversations: WaConversationSummary[];
  count: number;
}

export interface WaConversationMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  language: string | null;
  handledBy: WaHandledBy | null;
  citations: WaPreviewCitation[];
  /** Includes the provider and model that ACTUALLY ran, so a behaviour change is explainable. */
  retrievalMeta:
    | (WaPreviewRetrieval & {
        provider?: string;
        model?: string;
        prompt_version?: string;
      })
    | null;
  latencyMs: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface WaConversationDetail {
  conversation: WaConversationSummary;
  contact: {
    id: string;
    phoneLast4: string;
    consentStatus: string;
    locale: string | null;
    blockedAt: string | null;
    messageCount: number;
  } | null;
  messages: WaConversationMessage[];
}

export interface GetWaConversationsParams {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  handledBy?: WaHandledBy;
  language?: string;
  declinedOnly?: boolean;
  search?: string;
  /** Whitelisted server-side; an unknown key falls back to the default order rather than erroring. */
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// ── Unanswered queue ─────────────────────────────────────────────────────────

export enum WaUnansweredReason {
  NO_HITS = "no_hits",
  BELOW_THRESHOLD = "below_threshold",
  MODEL_DECLINED = "model_declined",
  ERROR = "error",
}

export enum WaUnansweredStatus {
  OPEN = "open",
  TRIAGED = "triaged",
  ANSWERED = "answered",
  DISMISSED = "dismissed",
}

export interface WaUnansweredQuestion {
  id: string;
  messageId: string;
  conversationId: string;
  questionText: string;
  language: string | null;
  reason: WaUnansweredReason;
  /** Numeric string from Postgres — how close the corpus came. */
  topSimilarity: string | null;
  hitCount: number;
  status: WaUnansweredStatus;
  assignedTo: number | null;
  resolutionNote: string | null;
  linkedDocumentId: string | null;
  createdAt: string;
}

export interface GetWaUnansweredResponse {
  questions: WaUnansweredQuestion[];
  count: number;
}

// ── Usage dashboard ──────────────────────────────────────────────────────────

export interface WaAnalyticsOverview {
  inbound: number;
  outbound: number;
  uniqueContacts: number;
  answered: number;
  declined: number;
  clarified: number;
  crisis: number;
  template: number;
  errors: number;
  rateLimited: number;
  /** Null when there were too few answered-or-declined messages to form a ratio. */
  declineRate: number | null;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
}

export interface WaAnalyticsBucket {
  bucket: string;
  handledBy: string;
  count: number;
}

export interface WaLanguageRow {
  language: string;
  total: number;
  answered: number;
  declined: number;
  /** Null below the minimum sample — a rate from three messages is noise that reads as signal. */
  declineRate: number | null;
}

export interface WaCorpusCoverageRow {
  documentId: string;
  title: string;
  chunkCount: number;
  citations: number;
  /** Archived documents are shown but excluded from the dead-corpus worklist — see below. */
  isArchived: boolean;
}

export interface WaCorpusCoverageResponse {
  rows: WaCorpusCoverageRow[];
  totalDocuments: number;
  /**
   * Documents beyond the server's fetch bound. Non-zero means this view is a partial picture and
   * must say so — a truncated worklist read as a complete one is worse than no worklist.
   */
  omittedDocuments: number;
}
