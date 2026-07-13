import React, { useEffect, useRef } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { useCreateRoleplaySpecMutation, useGetRoleplaySpecByIdQuery } from "@api";
import { ArrowDown } from "@assets";
import {
  CopilotChatPanel,
  ImprovementPanel,
  PublishPanel,
  RehearsalPanel,
  SpecPanel,
  StateMachineEditor,
} from "@components";
import { en, ROUTES } from "@constants";
import { useSpecAutosave } from "@hooks";
import { hydrateSpec, resetRoleplayStudio, selectRoleplaySpecState, setSpecTitle } from "@reducer";
import { normalizeRoleplaySpec } from "@utils/roleplaySpec";

export const ROLEPLAY_STEP_IDS = {
  INTERVIEW: "interview",
  SPEC: "spec",
  REHEARSE: "rehearse",
  IMPROVE: "improve",
  PUBLISH: "publish",
} as const;

// Built lazily (not at module-eval time) so partial `@constants` mocks in
// unrelated tests never trip on `en.roleplayStudio` (mirrors navigation.ts).
const buildStepTabs = () => [
  { id: ROLEPLAY_STEP_IDS.INTERVIEW, label: en.roleplayStudio.steps.interview },
  { id: ROLEPLAY_STEP_IDS.SPEC, label: en.roleplayStudio.steps.spec },
  { id: ROLEPLAY_STEP_IDS.REHEARSE, label: en.roleplayStudio.steps.rehearse },
  { id: ROLEPLAY_STEP_IDS.IMPROVE, label: en.roleplayStudio.steps.improve },
  { id: ROLEPLAY_STEP_IDS.PUBLISH, label: en.roleplayStudio.steps.publish },
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
    <div className="grid grid-cols-2 gap-6 flex-1">
      <div className="h-[420px] bg-neutral-100 rounded" />
      <div className="h-[420px] bg-neutral-100 rounded" />
    </div>
  </div>
);

/**
 * Roleplay Studio workspace shell: header (breadcrumb + inline title +
 * autosave chip) and the interview | spec | rehearse | publish steps driven by
 * the `?step=` search param. `/roleplay-studio/new` creates the spec first and
 * replaces the URL with the canonical `/:specId` route.
 */
export const RoleplayStudioWorkspace: React.FC = () => {
  const strings = en.roleplayStudio;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { specId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get("step") ?? "";
  const step = VALID_STEPS.has(stepParam) ? stepParam : ROLEPLAY_STEP_IDS.INTERVIEW;

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

  const handleStepChange = (nextStep: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("step", nextStep);
      return next;
    });
  };

  const renderStep = () => {
    switch (step) {
      case ROLEPLAY_STEP_IDS.SPEC:
        return (
          <div className="grid grid-cols-2 gap-6 h-full min-h-0">
            {/* Left — editable spec sections. */}
            <div className="min-h-0 h-full overflow-y-auto custom-scrollbar pr-1">
              <SpecPanel />
            </div>
            {/* Right — state machine canvas (lazy-loaded @xyflow/react). */}
            <div className="min-h-0 h-full">
              <StateMachineEditor />
            </div>
          </div>
        );
      case ROLEPLAY_STEP_IDS.REHEARSE:
        return <RehearsalPanel />;
      case ROLEPLAY_STEP_IDS.IMPROVE:
        return <ImprovementPanel />;
      case ROLEPLAY_STEP_IDS.PUBLISH:
        return <PublishPanel onSaveDraft={saveNow} />;
      case ROLEPLAY_STEP_IDS.INTERVIEW:
      default:
        return (
          <div className="grid grid-cols-2 gap-6 h-full min-h-0">
            {/* Left — copilot chat (scrolls its own feed, pinned composer). */}
            <div className="min-h-0 h-full overflow-hidden">
              <CopilotChatPanel />
            </div>
            {/* Right — live spec document, lit up section-by-section as
                streamed patches land. Read-only during the interview. */}
            <div className="min-h-0 h-full overflow-y-auto custom-scrollbar border-l border-border-light pl-6">
              <SpecPanel readOnly />
            </div>
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

      <Tabs
        items={buildStepTabs()}
        className="mb-2 mt-4 border-b border-border-light font-primary shrink-0"
        activeId={step}
        showCount={false}
        onChange={handleStepChange}
      />

      <div className="flex-1 min-h-0 pt-2">{renderStep()}</div>
    </div>
  );
};
