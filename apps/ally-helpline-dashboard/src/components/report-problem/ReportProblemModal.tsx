import { FC } from "react";

import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { BugReportForm, BugReportSubmitError } from "@ally-ui-mono/ui-shared";
import { useCreateBugReportMutation } from "@api";

import { detectDeviceOs } from "./detectDeviceOs";

export interface ReportProblemModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Thin per-app wrapper around the shared BugReportForm: captures context silently (route,
 * device/OS, timestamp — never shown to the user), wires the mutation, and owns what a
 * submitted report looks like here (a toast, matching every other simple POST-and-confirm
 * form in this app, e.g. CustomFieldModal). No "my reports" list — see the backend contract.
 */
export const ReportProblemModal: FC<ReportProblemModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [createBugReport] = useCreateBugReportMutation();

  const handleSubmit = async (description: string) => {
    try {
      await createBugReport({
        description,
        context: {
          screen: location.pathname,
          ...detectDeviceOs(),
          clientTimestamp: new Date().toISOString(),
        },
      }).unwrap();
    } catch (error) {
      const fetchError = error as FetchBaseQueryError & { data?: { statusCode?: number } };
      const rateLimited = fetchError?.status === 429 || fetchError?.data?.statusCode === 429;
      const submitError: BugReportSubmitError = { rateLimited };
      throw submitError;
    }
  };

  const handleSuccess = () => {
    toast.success(t("bugReport.success"));
    onClose();
  };

  return (
    <BugReportForm
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      labels={{
        title: t("user.reportProblem"),
        rateLimitedError: t("bugReport.rateLimited"),
        genericError: t("bugReport.genericError"),
      }}
    />
  );
};
