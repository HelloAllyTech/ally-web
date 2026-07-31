/**
 * Wire types for the Analytics → Suggestions review queue.
 * Mirrors ally-be src/analytics-suggestions DTOs.
 */

import { RoadmapOpportunity, RoadmapOpportunityType } from "./productRoadmap";

export enum AnalyticsSuggestionStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

/** Queue filter. "all" is not a status a row can hold — only a view of the queue. */
export type AnalyticsSuggestionStatusFilter = AnalyticsSuggestionStatus | "all";

/**
 * The window a suggestion was derived from, carried on every row.
 *
 * Stored per suggestion rather than per batch so a card read weeks later still
 * states the evidence it rests on — a suggestion without its window is a claim
 * nobody can check.
 */
export interface AnalyticsSuggestionWindow {
  /** The preset used, or null for an explicit from/to window. */
  range: string | null;
  /** yyyy-mm-dd, inclusive. */
  from: string;
  /** yyyy-mm-dd, inclusive. */
  to: string;
  label: string;
}

export interface AnalyticsSuggestion {
  id: string;
  /** The Generate run this came from; the surface groups cards by it. */
  batchId: string;
  title: string;
  body: string;
  rationale: string;
  evidence: string[];
  /** Null when the model's classification was not a live product goal. */
  suggestedGoal: string | null;
  suggestedType: RoadmapOpportunityType;
  status: AnalyticsSuggestionStatus;
  rejectedReason: string | null;
  /** Set on accept. Also null if the filed opportunity was later deleted. */
  opportunityId: string | null;
  window: AnalyticsSuggestionWindow;
  /** The model that drafted it — two runs weeks apart are not the same evidence. */
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSuggestionsResponse {
  items: AnalyticsSuggestion[];
  count: number;
}

/**
 * A preset window, or a custom pair. The backend enforces that `from`/`to` travel
 * together and that a custom window is at most 400 days.
 */
export interface GenerateAnalyticsSuggestionsRequest {
  range?: "30d" | "90d" | "12m" | "all";
  from?: string;
  to?: string;
}

/** Which analytics sections the model was shown, and which it was not. */
export interface AnalyticsSuggestionSections {
  included: string[];
  /** `"<section>: <reason>"`. Surfaced, never swallowed. */
  failed: string[];
}

export interface GenerateAnalyticsSuggestionsResponse {
  batchId: string;
  window: AnalyticsSuggestionWindow;
  model: string;
  /**
   * Up to ten, most important first. An EMPTY ARRAY IS A SUCCESSFUL RESULT: the
   * data supported nothing worth proposing, and the list is never padded.
   */
  suggestions: AnalyticsSuggestion[];
  sections: AnalyticsSuggestionSections;
}

/**
 * What the reviewer agreed to file — not what the model drafted. Accept opens an
 * editable form, so these are the edited values.
 */
export interface AcceptAnalyticsSuggestionRequest {
  description: string;
  productGoal: string;
  type?: RoadmapOpportunityType;
}

export interface AcceptAnalyticsSuggestionResponse {
  suggestion: AnalyticsSuggestion;
  opportunity: RoadmapOpportunity;
}

export interface RejectAnalyticsSuggestionRequest {
  /** Optional, and fed into later generations so the idea is not re-proposed. */
  reason?: string;
}
