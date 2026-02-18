export interface ConversationalGuardrail {
  id: string;
  name: string;
  helperDialogue: string;
  actorDialogue: string;
  active: boolean;
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

export type GetGuardrailsResponse = ConversationalGuardrail[];

export interface GetGuardrailsQueryParams {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
}



