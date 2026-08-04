import React, { useEffect, useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { CarbonTabs, Tab, TabList } from "@ally-ui-mono/ui-shared";
import { useCreateRoleplaySpecMutation, useGetRoleplaySpecByIdQuery } from "@api";
import { ArrowDown } from "@assets";
import { CopilotChatPanel, ImproveDrawer, SpecWorkbench } from "@components";
import { en, ROUTES } from "@constants";
import { useSpecAutosave } from "@hooks";
import {
  hydrateSpec,
  queueCopilotPrompt,
  resetRoleplayStudio,
  selectRoleplaySpecState,
  setSpecTitle,
} from "@reducer";
import { RoleplayTestReportListItem } from "@src/types/roleplayStudio";
import { normalizeRoleplaySpec } from "@utils/roleplaySpec";

import { RoleplayStudioActions } from "./RoleplayStudioActions";

// The studio is chat-first: building happens by talking to the copilot (Chat).
// The spec document lives in its own Spec tab so the trainer isn't staring at
// it the whole time — they open it to review what the copilot produced. Preview
// and Publish are actions in the tab row (see RoleplayStudioActions), not a tab.
// Legacy `?step=` values (interview/rehearse/improve/publish) fall back to chat
// via the VALID_STEPS guard.
export const ROLEPLAY_STEP_IDS = {
  CHAT: "chat",
  SPEC: "spec",
} as const;

// Built lazily (not at module-eval time) so partial `@constants` mocks in
// unrelated tests never trip on `en.roleplayStudio` (mirrors navigation.ts).
const buildStepTabs = () => [
  { id: ROLEPLAY_STEP_IDS.CHAT, label: en.roleplayStudio.steps.chat },
  { id: ROLEPLAY_STEP_IDS.SPEC, label: en.roleplayStudio.steps.spec },
];

const VALID_STEPS = new Set<string>(Object.values(ROLEPLAY_STEP_IDS));

/** Subtle inline save-state chip, mirroring CreateSimulation's autosave chip. */
const AutosaveChip: React.FC = () => {
  const strings = en.roleplayStudio;
  const { saveStatus, revision, savedRevision } = useSelector(selectRoleplaySpecState);
  const dirty = revision > savedRevision;

  if (saveStatus === "idle" && !dirty) return null;

  let label: string = strings.autosave.saving;
  let dotClass = "";
  let textClass = "text-typography-500";

  if (saveStatus === "saving" || (saveStatus === "idle" && dirty)) {
    label = strings.autosave.saving;
  } else if (saveStatus === "saved") {
    label = strings.autosave.saved;
    dotClass = "bg-success-400";
  } else if (saveStatus === "error") {
    label = strings.autosave.failed;
    dotClass = "bg-destructive-500";
    textClass = "text-destructive-500";
  } else if (saveStatus === "conflict") {
    label = strings.autosave.conflict;
    dotClass = "bg-destructive-500";
    textClass = "text-destructive-500";
  }

  return (
    <span
      className={`flex items-center gap-1.5 text-xs transition-opacity ${textClass}`}
      aria-live="polite"
    >
      {dotClass && <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />}
      {label}
    </span>
  );
};

const WorkspaceSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4 animate-pulse mt-6" data-testid="roleplay-workspace-skeleton">
    <div className="h-8 w-1/3 bg-neutral-100 rounded" />
    <div className="h-10 w-full bg-neutral-100 rounded" />
    <div className="h-[420px] w-full bg-neutral-100 rounded flex-1" />
  </div>
);

/**
 * Roleplay Studio workspace shell: header (breadcrumb + inline title +
 * autosave chip), the chat | spec steps driven by the `?step=` search param,
 * and the Preview / Publish actions in the tab row.
 * `/roleplay-studio/new` creates the spec first and replaces the URL with the
 * canonical `/:specId` route.
 */
export const RoleplayStudioWorkspace: React.FC = () => {
  const strings = en.roleplayStudio;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { specId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get("step") ?? "";
  const step = VALID_STEPS.has(stepParam) ? stepParam : ROLEPLAY_STEP_IDS.CHAT;

  const isNew = !specId;
  const [createSpec] = useCreateRoleplaySpecMutation();
  // StrictMode-safe: the create fires once even across mount/unmount/mount.
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!isNew || creatingRef.current) return;
    creatingRef.current = true;
    (async () => {
      try {
        const created = await createSpec({ title: strings.untitledRoleplay }).unwrap();
        navigate(ROUTES.ROLEPLAY_STUDIO_SPEC(created.id), { replace: true });
      } catch {
        toast.error(strings.createFailed);
        navigate(ROUTES.ROLEPLAY_STUDIO, { replace: true });
      }
    })();
  }, [isNew, createSpec, navigate]);

  const { data: specDetail, isLoading } = useGetRoleplaySpecByIdQuery(specId as string, {
    skip: !specId,
  });

  const { specId: loadedSpecId, spec } = useSelector(selectRoleplaySpecState);

  // Hydrate the slice when the fetched spec arrives. Guarded on the loaded id
  // so cache refetches never clobber in-progress local edits.
  useEffect(() => {
    if (!specDetail || !specId || loadedSpecId === specId) return;
    dispatch(
      hydrateSpec({
        spec: normalizeRoleplaySpec(
          specDetail.activeVersion?.spec,
          specDetail.title || strings.untitledRoleplay,
        ),
        specId: specDetail.id,
        versionId: specDetail.activeVersion?.id ?? "",
        updatedAt: specDetail.activeVersion?.updatedAt ?? null,
      }),
    );
  }, [specDetail, specId, loadedSpecId, dispatch]);

  // Leave the studio clean for the next spec.
  useEffect(() => () => void dispatch(resetRoleplayStudio()), [dispatch]);

  // Background draft persistence (10s cadence + step change + beforeunload).
  const { saveNow } = useSpecAutosave({ step });

  const stepTabs = buildStepTabs();

  const handleStepChange = (nextStep: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("step", nextStep);
      return next;
    });
  };

  // Improve drawer (test-case runs + reports).
  const [improveOpen, setImproveOpen] = useState(false);

  /**
   * "Auto improve" on a report: queue the prompt for the copilot (the chat
   * panel sends it once its session is ready), jump to the Chat tab so the
   * trainer watches the copilot patch the spec, and close the drawer.
   */
  const handleAutoImprove = (report: RoleplayTestReportListItem) => {
    dispatch(
      queueCopilotPrompt({
        text: strings.improve.autoImprovePrompt(report.testCaseSnapshot?.title ?? ""),
        autoImprove: { reportId: report.id },
      }),
    );
    handleStepChange(ROLEPLAY_STEP_IDS.CHAT);
    setImproveOpen(false);
    toast.info(strings.improve.autoImproveQueued);
  };

  const renderStep = () => {
    switch (step) {
      case ROLEPLAY_STEP_IDS.SPEC:
        // Editable spec / state-machine workbench on its own tab, locked while
        // the copilot streams.
        return (
          <div className="min-h-0 h-full">
            <SpecWorkbench />
          </div>
        );
      case ROLEPLAY_STEP_IDS.CHAT:
      default:
        // Full-width copilot chat (scrolls its own feed, pinned composer).
        return (
          <div className="min-h-0 h-full overflow-hidden">
            <CopilotChatPanel />
          </div>
        );
    }
  };

  if (isNew || (isLoading && loadedSpecId !== specId)) {
    return <WorkspaceSkeleton />;
  }

  return (
    <div className="h-full font-primary flex flex-col">
      {/* Header — breadcrumb + inline title edit + autosave chip. */}
      <div className="flex justify-between items-center shrink-0 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-typography-800 cursor-pointer shrink-0"
            onClick={() => navigate(ROUTES.ROLEPLAY_STUDIO)}
          >
            {strings.title}
          </span>
          <span className="-rotate-90 shrink-0">
            <ArrowDown />
          </span>
          <input
            value={spec?.title ?? ""}
            onChange={event => dispatch(setSpecTitle(event.target.value))}
            placeholder={strings.titlePlaceholder}
            aria-label={strings.columns.title}
            className="text-2xl text-typography-900 font-secondary bg-transparent outline-none min-w-0 flex-1 border-b border-transparent hover:border-border-light focus:border-primary-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <AutosaveChip />
        </div>
      </div>

      <div className="mb-2 mt-4 shrink-0 flex items-center justify-between gap-4">
        <CarbonTabs
          selectedIndex={Math.max(
            0,
            stepTabs.findIndex(tab => tab.id === step),
          )}
          onChange={({ selectedIndex }) => handleStepChange(stepTabs[selectedIndex].id)}
        >
          <TabList aria-label={strings.title}>
            {stepTabs.map(tab => (
              <Tab key={tab.id}>{tab.label}</Tab>
            ))}
          </TabList>
        </CarbonTabs>
        <RoleplayStudioActions onSaveDraft={saveNow} onOpenImprove={() => setImproveOpen(true)} />
      </div>

      <div className="flex-1 min-h-0 pt-2">{renderStep()}</div>

      <ImproveDrawer
        open={improveOpen}
        onClose={() => setImproveOpen(false)}
        onSaveDraft={saveNow}
        onAutoImprove={handleAutoImprove}
      />
    </div>
  );
};
