export enum ScenarioStatus {
  AVAILABLE = "AVAILABLE",
  COMING_SOON = "COMING_SOON",
}

export interface Scenario {
  id?: number;
  title?: string;
  scenario?: string;
  description?: string;
  coverImageUrl?: string | null;
  status?: ScenarioStatus;
}

export interface GetScenariosInput {
  _t: string;
}

export interface GetScenariosResponse {
  data?: {
    scenarios: Scenario[];
  };
  // error?: ErrorResponse;
}

export interface GetScenarioInput {
  scenarioId: number;
}

export interface GetScenarioResponse {
  data?: {
    scenario: Scenario;
  };
  // error?: ErrorResponse;
}
export interface ListRoomsResponse {
  data?: {
    sid: string;
    name: string;
    created_at: string;
  };
  // error?: ErrorResponse;
}

export interface CreateRoomInput {
  script_type: string;
}

export interface CreateRoomResponse {
  data?: {
    room_id: string;
    participant_id: string;
    access_token: string;
    created_at: string;
  };
  // error?: ErrorResponse;
}

export interface DeleteRoomInput {
  roomId: string;
}

export interface DeleteRoomResponse {
  data?: {
    message?: string;
  };
  //   error?: ErrorResponse;
}
