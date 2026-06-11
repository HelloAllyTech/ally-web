export type ConversationalGuardrailKind = "USER" | "SYSTEM";

export interface ConversationalGuardrail {
  id: string;
  name: string;
  helperDialogue: string;
  actorDialogue: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // SYSTEM guardrails are platform-provided. Mandatory ones cannot be disabled
  // or deleted (their dialogue text remains editable).
  kind?: ConversationalGuardrailKind;
  mandatory?: boolean;
}

export interface CreateConversationalGuardrailInput {
  name: string;
  helperDialogue: string;
  actorDialogue: string;
  active?: boolean;
}

export interface UpdateConversationalGuardrailInput {
  name?: string;
  helperDialogue?: string;
  actorDialogue?: string;
  active?: boolean;
}

export type GetGuardrailsResponse = ConversationalGuardrail[];

export interface GetGuardrailsQueryParams {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
}
