import React from "react";

import { useGetTermsQuery } from "@api";
import { LegalPage } from "@components";

export const Terms: React.FC = () => {
  const { data, isFetching } = useGetTermsQuery();
  return <LegalPage title="Terms of Service" html={data?.html} isLoading={isFetching} />;
};
