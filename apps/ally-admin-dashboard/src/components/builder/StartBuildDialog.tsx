import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  Button,
  ComposedModal,
  FilterableMultiSelect,
  InlineNotification,
  ModalBody,
  NumberInput,
  TextInput,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import {
  useGetBuilderRepoCommandsQuery,
  useStartBuilderBuildMutation,
  useUpdateBuilderSessionMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";
import { BuilderPrdReadiness, BuilderRepoCommand } from "@types";

interface StartBuildDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  /** `session.repos` — what the multi-select starts pre-checked with. */
  currentRepos: string[];
  /** `session.budgetUsd`, falling back to the platform default once settings load. */
  initialBudgetUsd?: string | null;
  defaultBudgetUsd?: string | null;
  readiness: BuilderPrdReadiness;
  /**
   * Set when opened as a retry from a FAILED build — swaps the copy and shows
   * what is being retried past. The request itself is identical: the backend
   * accepts start-build from either PRD_READY or FAILED.
   */
  retryError?: string | null;
  onStarted: () => void;
}

/**
 * Collects what a build needs before it can dispatch: which repos it may
 * touch, a spend ceiling, and optional per-tier model overrides.
 *
 * Repos are saved onto the session (`updateBuilderSession`) before start-build
 * is called, not alongside it — the backend refuses to start a build with an
 * empty `session.repos`, and a PATCH-then-POST makes that ordering explicit
 * rather than relying on the mutation invalidation to race ahead of the read.
 *
 * When the PRD isn't fully ready, the dialog says so and offers "Start
 * anyway" rather than refusing outright — Builder can start and ask about a
 * genuinely open question mid-build, but a guess made at review time (after
 * code exists) costs a whole build to unwind. Naming what is still open here
 * is cheaper than finding out later.
 */
export const StartBuildDialog: React.FC<StartBuildDialogProps> = ({
  isOpen,
  onClose,
  sessionId,
  currentRepos,
  initialBudgetUsd,
  defaultBudgetUsd,
  readiness,
  retryError,
  onStarted,
}) => {
  const strings = en.builder.startBuildDialog;
  const isRetry = Boolean(retryError);

  const { data: repoCommandsData } = useGetBuilderRepoCommandsQuery();
  const repos = repoCommandsData?.repos ?? [];

  const [updateSession] = useUpdateBuilderSessionMutation();
  const [startBuild, { isLoading: isStarting }] = useStartBuilderBuildMutation();

  const [selectedRepos, setSelectedRepos] = useState<string[]>(currentRepos);
  const [budgetUsd, setBudgetUsd] = useState("");
  const [plannerModel, setPlannerModel] = useState("");
  const [coderModel, setCoderModel] = useState("");
  const [verifierModel, setVerifierModel] = useState("");
  const [reposError, setReposError] = useState(false);

  // Re-seed every time the dialog opens rather than once on mount — a second
  // open (e.g. retry after an earlier cancel) should reflect the session's
  // current repos, not whatever was left over from the last open.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedRepos(currentRepos);
    const seedBudget = initialBudgetUsd ?? defaultBudgetUsd;
    setBudgetUsd(seedBudget ? String(Number(seedBudget)) : "");
    setPlannerModel("");
    setCoderModel("");
    setVerifierModel("");
    setReposError(false);
  }, [isOpen, currentRepos, initialBudgetUsd, defaultBudgetUsd]);

  const selectedRepoCommands = repos.filter(repo => selectedRepos.includes(repo.repo));
  const unreadySections = readiness.sections.filter(section => !section.ok);

  const handleSubmit = async () => {
    if (selectedRepos.length === 0) {
      setReposError(true);
      return;
    }

    try {
      await updateSession({ id: sessionId, repos: selectedRepos }).unwrap();
    } catch {
      toast.error(strings.saveReposFailed);
      return;
    }

    try {
      await startBuild({
        id: sessionId,
        ...(budgetUsd.trim() ? { budgetUsd: Number(budgetUsd) } : {}),
        ...(plannerModel.trim() ? { plannerModel: plannerModel.trim() } : {}),
        ...(coderModel.trim() ? { model: coderModel.trim() } : {}),
        ...(verifierModel.trim() ? { verifierModel: verifierModel.trim() } : {}),
      }).unwrap();
      onStarted();
      onClose();
    } catch (error) {
      // The backend refusals each name which control stopped the build — the
      // kill switch, the concurrency ceiling, the budget — so surface the
      // server's own message rather than a generic one.
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? en.builder.build.startFailed;
      toast.error(message);
    }
  };

  const submitLabel = isRetry
    ? strings.retrySubmit
    : readiness.ready
      ? en.builder.readiness.startBuild
      : en.builder.readiness.startBuildEarly;

  return (
    <ComposedModal open={isOpen} onClose={onClose} size="lg">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-typography-900">
            {isRetry ? strings.retryTitle : strings.title}
          </h2>

          {isRetry && retryError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title={strings.retryIntro}
              subtitle={retryError}
            />
          )}

          {!readiness.ready && unreadySections.length > 0 && (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title={en.builder.readiness.startBuildBlockedTitle}
              subtitle={en.builder.readiness.startBuildBlockedBody}
            >
              <ul className="mt-1 list-disc pl-4 text-xs text-typography-700">
                {unreadySections.map(section => (
                  <li key={section.key}>{section.hint}</li>
                ))}
              </ul>
            </InlineNotification>
          )}

          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <label
                className="text-sm font-medium text-typography-900"
                htmlFor="builder-start-repos"
              >
                {strings.reposLabel}
              </label>
              <Tooltip label={strings.reposHint} align="top">
                <button type="button" className="inline-flex cursor-pointer items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            <FilterableMultiSelect
              id="builder-start-repos"
              titleText=""
              placeholder={strings.reposPlaceholder}
              items={repos}
              itemToString={(item: BuilderRepoCommand | null) => item?.repo ?? ""}
              selectedItems={selectedRepoCommands}
              invalid={reposError}
              invalidText={strings.reposRequired}
              onChange={({ selectedItems }: { selectedItems: BuilderRepoCommand[] | null }) => {
                setReposError(false);
                setSelectedRepos((selectedItems ?? []).map(item => item.repo));
              }}
            />
            {selectedRepoCommands.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {selectedRepoCommands.map(repo => (
                  <li key={repo.repo} className="text-xs text-typography-500">
                    <span className="font-medium text-typography-700">{repo.repo}</span>
                    {repo.description ? ` — ${repo.description}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-sm font-medium text-typography-900">{strings.budgetLabel}</span>
              <Tooltip label={strings.budgetHint} align="top">
                <button type="button" className="inline-flex cursor-pointer items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            <NumberInput
              id="builder-start-budget"
              label={strings.budgetLabel}
              hideLabel
              hideSteppers
              min={0}
              value={budgetUsd}
              onChange={(_event: unknown, state: { value: number | string } | undefined) =>
                setBudgetUsd(state?.value === undefined ? "" : String(state.value))
              }
            />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-sm font-medium text-typography-900">
                {strings.modelOverridesHeading}
              </span>
              <Tooltip label={strings.modelOverridesHint} align="top">
                <button type="button" className="inline-flex cursor-pointer items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextInput
                id="builder-start-planner-model"
                labelText={strings.plannerModelLabel}
                placeholder={strings.modelPlaceholder}
                value={plannerModel}
                onChange={event => setPlannerModel(event.target.value)}
              />
              <TextInput
                id="builder-start-coder-model"
                labelText={strings.coderModelLabel}
                placeholder={strings.modelPlaceholder}
                value={coderModel}
                onChange={event => setCoderModel(event.target.value)}
              />
              <TextInput
                id="builder-start-verifier-model"
                labelText={strings.verifierModelLabel}
                placeholder={strings.modelPlaceholder}
                value={verifierModel}
                onChange={event => setVerifierModel(event.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button kind="tertiary" onClick={onClose}>
              {en.builder.prd.cancel}
            </Button>
            <Button kind="primary" disabled={isStarting} onClick={() => void handleSubmit()}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
