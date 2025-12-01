import { baseAPI } from "./baseApi";

const TermsAndAgreementAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    checkTermsAndAgreement: builder.query({}),
  }),
});
