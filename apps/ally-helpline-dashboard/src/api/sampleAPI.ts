import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const sampleAPI = createApi({
    reducerPath: 'sampleAPI',
    baseQuery: fetchBaseQuery({ baseUrl: 'example' }),
    endpoints: (build) => ({
      getPokemonByName: build.query({
        query: (name) => `sample/${name}`,
      }),
    }),
  })