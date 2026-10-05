import React, { useState } from "react";

import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import {
  BugReportForm,
  BugReportSubmitError,
  Select,
  SelectItem,
  detectDeviceOs,
} from "@ally-ui-mono/ui-shared";
import { useCreateRoadmapBugReportMutation } from "@api";

import { BUG_HUNTER_REPOS } from "../BugHunter/repos";

/** The picker's "I don't know" value: Bug Hunter classifies the report itself. */
const REPO_AUTO = "";

interface ReportBugModalProps {
  onClose: () => void;
}

/**
 * "Report a bug" on the Product Roadmap — the roadmap's counterpart to OpportunityInterviewDrawer,
 * and deliberately nothing like it.
 *
 * Filing an idea and reporting a bug were one modal with a Type dropdown until bugs left the
 * board for Bug Hunter. Keeping them merged would have meant one form whose Type dropdown
 * silently decides which of two screens the thing you just typed shows up on, with half its
 * controls (product goal, voting, the duplicate check) meaningless for one branch. Two
 * buttons say plainly where each one goes.
 *
 * The same shared BugReportForm helpline uses, on the same endpoint, so a staff report and a
 * consumer report reach the triager in identical shape — one guided prompt, no severity or
 * category picker, and the screen/device context captured silently rather than asked for.
 * `source` is stamped server-side from the reporter's roles, so this correctly reads "Staff"
 * in Bug Hunter without the client asserting anything about who it is.
 *
 * One field more than the consumer form: an optional codebase picker. Staff usually know
 * which repo a bug lives in, and the classifier gives up on a report that names files in
 * two folders of the same repo — which left admins at "I couldn't tell which repo this bug
 * belongs to" with no way to answer. A named repo skips the classifier; the default leaves
 * it to Bug Hunter, exactly as before.
 */
export const ReportBugModal: React.FC<ReportBugModalProps> = ({ onClose }) => {
  const location = useLocation();
  const [createBugReport] = useCreateRoadmapBugReportMutation();
  const [repo, setRepo] = useState<string>(REPO_AUTO);

  const handleSubmit = async (description: string) => {
    try {
      await createBugReport({
        description,
        ...(repo ? { repo } : {}),
        context: {
          // The admin route, including its ?tab= and ?opportunity= params — on a screen
          // this deep in query state, the path alone would not locate what broke.
          screen: `${location.pathname}${location.search}`,
          ...detectDeviceOs(),
          clientTimestamp: new Date().toISOString(),
        },
      }).unwrap();
    } catch (error) {
      // Re-thrown as a plain flag rather than passed through: BugReportForm owns the copy
      // and must not learn RTK Query's error shape to tell a throttle from a failure.
      const fetchError = error as FetchBaseQueryError & { data?: { statusCode?: number } };
      const submitError: BugReportSubmitError = {
        rateLimited: fetchError?.status === 429 || fetchError?.data?.statusCode === 429,
      };
      throw submitError;
    }
  };

  return (
    <BugReportForm
      open
      onClose={onClose}
      onSubmit={handleSubmit}
      onSuccess={() => {
        // Names where it went. A reporter who has just been told bugs are not on this board
        // needs to know the report did not vanish — and unlike a consumer, this one can go
        // and look at it.
        toast.success("Bug reported. It's in Bug Hunter's findings table.");
        onClose();
      }}
      labels={{
        title: "Report a bug",
        prompt: "What went wrong?",
        placeholder:
          "What were you doing, what happened, and what did you expect instead? Include the tenant or user if it only affects one.",
        submit: "Report bug",
        submitting: "Reporting…",
        rateLimitedError: "You've filed a few reports just now — please try again in a bit.",
        genericError: "Could not file that bug report. Please try again.",
      }}
      extraFields={
        <div className="mt-4">
          <Select
            id="report-bug-repo"
            labelText="Which codebase? (optional)"
            helperText="Leave it to Bug Hunter if you are not sure."
            value={repo}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRepo(e.target.value)}
          >
            <SelectItem value={REPO_AUTO} text="Let Bug Hunter work it out" />
            {BUG_HUNTER_REPOS.map(name => (
              <SelectItem key={name} value={name} text={name} />
            ))}
          </Select>
        </div>
      }
    />
  );
};
