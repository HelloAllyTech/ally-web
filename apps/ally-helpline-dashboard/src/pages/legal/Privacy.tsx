import { FC } from "react";

import { useGetPrivacyQuery } from "@api";

import { LegalPage } from "./LegalPage";

export const Privacy: FC = () => {
  const { data, isFetching } = useGetPrivacyQuery();
  return <LegalPage title="Privacy Policy" html={data?.html} isLoading={isFetching} />;
};
