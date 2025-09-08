export interface SendLearnOTPInput {
  email: string;
}

export interface SendLearnOTPResponse {
  data?: {
    message: string;
  };
  // error?: ErrorResponse;
}

export interface VerifyLearnOTPInput {
  code: string;
  email: string;
}

export interface VerifyLearnOTPResponse {
  data?: {
    name?: string;
    tokens: { access_token: string; refresh_token: string };
  };
  //   error?: ErrorResponse;
}

export interface GetScenariosInput {
  _t: string;
}

export interface Scenario {
  unique_id: string;
  title?: string;
  short_description?: string;
  long_description?: string;
  cover_image?: string | null;
  is_coming_soon?: boolean;
}

export interface GetScenariosResponse {
  data?: {
    scenarios: Scenario[];
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
