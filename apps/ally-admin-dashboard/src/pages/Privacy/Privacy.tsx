import React from "react";

import { useGetPrivacyQuery } from "@api";
import { LegalPage } from "@components";

export const Privacy: React.FC = () => {
  const { data, isFetching } = useGetPrivacyQuery();
  return <LegalPage title="Privacy Policy" html={data?.html} isLoading={isFetching} />;
};
