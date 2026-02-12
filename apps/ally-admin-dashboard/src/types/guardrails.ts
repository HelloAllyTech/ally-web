export interface ConversationalGuardrail {
  id: string;
  name: string;
  helperDialogue: string;
  actorDialogue: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationalGuardrailTranslation {
  id: string;
  guardrailId: string;
  languageId: number;
  helperDialogue: string;
  actorDialogue: string;
  createdAt: string;
  updatedAt: string;
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

export interface GetGuardrailsResponse {
  data: ConversationalGuardrail[];
  total: number;
}

export interface GetGuardrailsQueryParams {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface CreateGuardrailTranslationInput {
  guardrailId: string;
  languageId: number;
  helperDialogue: string;
  actorDialogue: string;
}

export interface UpdateGuardrailTranslationInput {
  helperDialogue?: string;
  actorDialogue?: string;
}
