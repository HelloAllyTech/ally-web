import { ApiEndpoints, HttpMethod } from "@constants";
import {
  CreateRoomInput,
  CreateRoomResponse,
  DeleteRoomInput,
  GetScenariosInput,
  GetScenariosResponse,
  ListRoomsResponse,
  SendLearnOTPInput,
  SendLearnOTPResponse,
  VerifyLearnOTPInput,
  VerifyLearnOTPResponse,
} from "@types";

import { baseAPI } from "./baseAPI";

const learnAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    sendLearnOTP: builder.mutation<SendLearnOTPResponse, SendLearnOTPInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.SEND_OTP,
        method: HttpMethod.POST,
        body: params,
      }),
    }),
    verifyLearnOTP: builder.mutation<VerifyLearnOTPResponse, VerifyLearnOTPInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.VERIFY_OTP,
        method: HttpMethod.POST,
        body: params,
      }),
    }),
    getScenarios: builder.query<GetScenariosResponse, GetScenariosInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.SCENARIOS,
        method: HttpMethod.GET,
        params,
      }),
    }),
    listRooms: builder.query<ListRoomsResponse, void>({
      query: () => ({
        url: ApiEndpoints.LEARN.ROOM,
        method: HttpMethod.GET,
      }),
    }),
    createRoom: builder.mutation<CreateRoomResponse, CreateRoomInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.ROOM,
        method: HttpMethod.POST,
        body: params,
      }),
    }),
    deleteRoom: builder.mutation<void, DeleteRoomInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.DELETE_ROOM(params.roomId),
        method: HttpMethod.DELETE,
        body: params,
      }),
    }),
  }),
});

export const { useSendLearnOTPMutation } = learnAPI;
