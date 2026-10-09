import React, { useMemo, useState } from "react";

import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import {
  BugReportForm,
  BugReportSubmitError,
  Button,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
  TextArea,
  TextInput,
  detectDeviceOs,
} from "@ally-ui-mono/ui-shared";
import { useCreateRoadmapBugReportMutation, useGetBugFindingsQuery } from "@api";
import { RoadmapBugReportContext } from "@types";

import {
  BUG_REPORT_FREQUENCIES,
  BUG_REPORT_IMPACTS,
  BUG_REPORT_MIN_DESCRIPTION,
  BUG_REPORT_SURFACES,
  BugReportFrequency,
  BugReportImpact,
  BugReportSurface,
  localDateTimeValue,
  similarFindings,
  toIsoOrUndefined,
} from "./bugReportFields";
import { BUG_HUNTER_REPOS } from "../BugHunter/repos";

/** The advanced picker's "I don't know" value: the surface, then Bug Hunter, pick the repo. */
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
 * Built around the same shared BugReportForm helpline uses, on the same endpoint. Since
 * 2026-10-09 the staff form asks three things, because they are the three the pipeline
 * reads most: what went wrong (a sentence, not a word), what you expected instead, and
 * where you saw it in product words — the surface picks the repo, so staff never have to
 * know repo names. Everything else sits behind "Add details": steps, when it happened (the
 * log windows are read around that, not around filing time), how often, how bad, and any
 * ids to hand. The engineer-level codebase picker lives there too, for the few who know.
 *
 * While the reporter types, the three open findings that read most like their words are
 * offered as "Already reported?" — a duplicate report costs a Verifier run. They can always
 * still send. The screen/device context is captured silently, as before, and `source` is
 * stamped server-side from the reporter's roles.
 */
export const ReportBugModal: React.FC<ReportBugModalProps> = ({ onClose }) => {
  const location = useLocation();
  const [createBugReport] = useCreateRoadmapBugReportMutation();

  const [description, setDescription] = useState("");
  const [expected, setExpected] = useState("");
  const [surface, setSurface] = useState<BugReportSurface | "">("");
  const [showDetails, setShowDetails] = useState(false);
  const [steps, setSteps] = useState("");
  const [happenedAt, setHappenedAt] = useState(() => localDateTimeValue());
  const [frequency, setFrequency] = useState<BugReportFrequency | "">("");
  const [impact, setImpact] = useState<BugReportImpact | "">("");
  const [identifiers, setIdentifiers] = useState("");
  const [repo, setRepo] = useState<string>(REPO_AUTO);

  // Only fetched once there is something to compare against, and once.
  const { data: recent } = useGetBugFindingsQuery(
    { limit: 100 },
    { skip: description.trim().length < 20 },
  );
  const similar = useMemo(
    () => similarFindings(`${description} ${expected}`, recent?.items ?? []),
    [description, expected, recent],
  );

  const requiredExtrasFilled = expected.trim().length > 0 && surface !== "";

  const handleSubmit = async (whatHappened: string) => {
    const context: RoadmapBugReportContext = {
      screen: `${location.pathname}${location.search}`,
      ...detectDeviceOs(),
      clientTimestamp: new Date().toISOString(),
      expected: expected.trim(),
      surface: surface || undefined,
      steps: steps.trim() || undefined,
      happenedAt: toIsoOrUndefined(happenedAt),
      frequency: frequency || undefined,
      impact: impact || undefined,
      identifiers: identifiers.trim() || undefined,
    };
    try {
      await createBugReport({
        description: whatHappened,
        ...(repo ? { repo } : {}),
        context,
      }).unwrap();
    } catch (error) {
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
        toast.success("Bug reported. Bug Hunter has it; it will confirm it and get back to you.");
        onClose();
      }}
      minLength={BUG_REPORT_MIN_DESCRIPTION}
      canSubmitExtra={requiredExtrasFilled}
      onDescriptionChange={setDescription}
      labels={{
        title: "Report a bug",
        prompt: "What went wrong?",
        placeholder:
          "Example: I picked Marathi and opened a course; the labels were still in English.",
        submit: "Report bug",
        submitting: "Reporting…",
        rateLimitedError: "You've filed a few reports just now — please try again in a bit.",
        genericError: "Could not file that bug report. Please try again.",
      }}
      extraFields={
        <div className="mt-4 flex flex-col gap-4">
          <TextInput
            id="report-bug-expected"
            labelText="What did you expect to happen instead?"
            placeholder="Example: every label in Marathi."
            value={expected}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpected(e.target.value)}
          />

          <RadioButtonGroup
            name="report-bug-surface"
            legendText="Where did you see it?"
            orientation="vertical"
            valueSelected={surface}
            onChange={(value: unknown) => setSurface(value as BugReportSurface)}
          >
            {BUG_REPORT_SURFACES.map(s => (
              <RadioButton
                key={s.id}
                id={`report-bug-surface-${s.id}`}
                labelText={s.label}
                value={s.id}
              />
            ))}
          </RadioButtonGroup>

          {similar.length > 0 && (
            <div
              data-testid="report-bug-similar"
              className="rounded border border-border-light bg-neutral-50 px-3 py-2 text-xs"
            >
              <p className="font-medium text-typography-900">Already reported?</p>
              <p className="text-typography-600">
                These open bugs read like yours. If it is one of them, there is no need to file
                again.
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {similar.map(({ finding }) => (
                  <li key={finding.id}>
                    <a
                      href={`/bug-hunter?bug=${finding.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 underline"
                    >
                      {finding.title}
                    </a>
                    {finding.repo && <span className="text-typography-500"> · {finding.repo}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => setShowDetails(v => !v)}
              aria-expanded={showDetails}
            >
              {showDetails ? "Hide details" : "Add details (optional)"}
            </Button>
          </div>

          {showDetails && (
            <div data-testid="report-bug-details" className="flex flex-col gap-4">
              <TextArea
                id="report-bug-steps"
                labelText="Steps to reproduce"
                placeholder={"One per line is fine.\n1. Pick Marathi\n2. Open any course"}
                rows={3}
                value={steps}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSteps(e.target.value)}
              />
              <TextInput
                id="report-bug-happened-at"
                type="datetime-local"
                labelText="When did it happen?"
                helperText="Bug Hunter reads the logs around this time, not around when you file."
                value={happenedAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHappenedAt(e.target.value)}
              />
              <RadioButtonGroup
                name="report-bug-frequency"
                legendText="How often?"
                orientation="horizontal"
                valueSelected={frequency}
                onChange={(value: unknown) => setFrequency(value as BugReportFrequency)}
              >
                {BUG_REPORT_FREQUENCIES.map(f => (
                  <RadioButton
                    key={f.id}
                    id={`report-bug-frequency-${f.id}`}
                    labelText={f.label}
                    value={f.id}
                  />
                ))}
              </RadioButtonGroup>
              <RadioButtonGroup
                name="report-bug-impact"
                legendText="How bad is it?"
                orientation="horizontal"
                valueSelected={impact}
                onChange={(value: unknown) => setImpact(value as BugReportImpact)}
              >
                {BUG_REPORT_IMPACTS.map(i => (
                  <RadioButton
                    key={i.id}
                    id={`report-bug-impact-${i.id}`}
                    labelText={i.label}
                    value={i.id}
                  />
                ))}
              </RadioButtonGroup>
              <TextInput
                id="report-bug-identifiers"
                labelText="Session, user, tenant or scenario (if you have one)"
                placeholder="Example: session 8f3c…, user priya@…, scenario Night shift intake"
                value={identifiers}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setIdentifiers(e.target.value)
                }
              />
              <Select
                id="report-bug-repo"
                labelText="Which codebase? (optional)"
                helperText="Only if you know. The place you picked above already points Bug Hunter at the right one."
                value={repo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRepo(e.target.value)}
              >
                <SelectItem value={REPO_AUTO} text="Let Bug Hunter work it out" />
                {BUG_HUNTER_REPOS.map(name => (
                  <SelectItem key={name} value={name} text={name} />
                ))}
              </Select>
            </div>
          )}
        </div>
      }
    />
  );
};
