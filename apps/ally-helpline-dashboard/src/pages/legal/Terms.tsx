import { FC } from "react";

import { useGetTermsQuery } from "@api";

import { LegalPage } from "./LegalPage";

export const Terms: FC = () => {
  const { data, isFetching } = useGetTermsQuery();
  return <LegalPage title="Terms of Service" html={data?.html} isLoading={isFetching} />;
};
