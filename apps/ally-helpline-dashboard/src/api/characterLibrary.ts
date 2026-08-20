/**
 * Character Library (own-tenant, view+create only — see the ADMIN group grant
 * in ally-be migration 1905000000000-AddTenantScopedCharacterLibrary). No
 * update/delete endpoints here: this app never exposes those affordances,
 * since the backend would 403 a tenant ADMIN on either.
 */
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { CharacterData, GetCharactersResponse } from "@types";

import { baseAPI } from "./baseAPI";

interface GetCharactersParams {
  limit?: number;
  offset?: number;
  search?: string;
}

const characterLibraryAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getCharacters: builder.query<GetCharactersResponse, GetCharactersParams>({
      query: params => ({
        url: ApiEndpoints.CHARACTER_LIBRARY.GET_CHARACTERS,
        params,
      }),
      providesTags: [TAG_TYPES.CHARACTER_LIBRARY],
    }),

    createCharacter: builder.mutation<
      CharacterData,
      Omit<CharacterData, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">
    >({
      query: data => ({
        url: ApiEndpoints.CHARACTER_LIBRARY.CREATE_CHARACTER,
        method: HttpMethod.POST,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.CHARACTER_LIBRARY],
    }),

    // Own-tenant org toggle — any authenticated user can read it (see
    // ally-be settings.controller.ts), no permission required.
    getCharacterLibraryEnabled: builder.query<boolean, void>({
      query: () => ApiEndpoints.CHARACTER_LIBRARY.CHARACTER_LIBRARY_ENABLED,
    }),
  }),
});

export const {
  useGetCharactersQuery,
  useCreateCharacterMutation,
  useGetCharacterLibraryEnabledQuery,
} = characterLibraryAPI;
