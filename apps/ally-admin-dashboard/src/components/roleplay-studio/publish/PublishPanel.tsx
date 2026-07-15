import React, { useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import {
  useCreateRoleplaySpecVersionMutation,
  useGetRoleplaySpecVersionsQuery,
  useLazyGetRoleplaySpecByIdQuery,
  usePublishRoleplayVersionMutation,
} from "@api";
import { CheckCircle, FailIcon, Play } from "@assets";
import { ActionConfirmationPopup, Button, EmptyState, StatusBadge } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { useTryRoleplayLive } from "@hooks";
import { hydrateSpec, selectRoleplaySpecState } from "@reducer";
import { formatDate } from "@utils";
import {
  deriveRoleplayReadiness,
  normalizeRoleplaySpec,
  RoleplayReadinessCheck,
} from "@utils/roleplaySpec";

interface PublishPanelProps {
  /** Persists any dirty draft state before publish / try-live. */
  onSaveDraft: () => Promise<boolean>;
}

/**
 * The publish step: readiness checklist derived from the spec, the version
 * list, publish (with the 409 no-completed-rehearsal -> force confirm flow),
 * and "Try live" which mints a session, mirrors the simulation preview's
 * room-data handoff into localStorage, and opens the live preview.
 */
export const PublishPanel: React.FC<PublishPanelProps> = ({ onSaveDraft }) => {
  const strings = en.roleplayStudio.publish;
  const checkLabels: Record<RoleplayReadinessCheck["id"], string> = {
    states: strings.checkStates,
    secret: strings.checkSecret,
    rubric: strings.checkRubric,
    voice: strings.checkVoice,
  };
  const dispatch = useDispatch();
  const { specId, versionId, spec } = useSelector(selectRoleplaySpecState);

  const { data: versions = [], isLoading: isLoadingVersions } = useGetRoleplaySpecVersionsQuery(
    specId as string,
    { skip: !specId },
  );
  const [publishVersion, { isLoading: isPublishing }] = usePublishRoleplayVersionMutation();
  const [createVersion] = useCreateRoleplaySpecVersionMutation();
  const { tryLive, isStartingSession } = useTryRoleplayLive({ onSaveDraft });
  const [fetchSpec] = useLazyGetRoleplaySpecByIdQuery();

  const [forceConfirmVersionId, setForceConfirmVersionId] = useState<string | null>(null);

  const readiness = deriveRoleplayReadiness(spec);
  const allReady = readiness.every(check => check.passed);

  const doPublish = async (targetVersionId: string, force: boolean) => {
    if (!specId) return;
    try {
      if (targetVersionId === versionId) await onSaveDraft();
      await publishVersion({ specId, versionId: targetVersionId, force }).unwrap();
      toast.success(strings.published);
    } catch (error) {
      const status = (error as { status?: number | string })?.status;
      if (status === 409 && !force) {
        // 409 = no completed rehearsal for this version; offer force publish.
        setForceConfirmVersionId(targetVersionId);
        return;
      }
      toast.error(strings.publishFailed);
    }
  };

  const handleNewVersion = async () => {
    if (!specId) return;
    try {
      await createVersion(specId).unwrap();
      // The new draft becomes the active version — reload + rehydrate it.
      const detail = await fetchSpec(specId).unwrap();
      dispatch(
        hydrateSpec({
          spec: normalizeRoleplaySpec(
            detail.activeVersion?.spec,
            detail.title || en.roleplayStudio.untitledRoleplay,
          ),
          specId: detail.id,
          versionId: detail.activeVersion?.id ?? "",
          updatedAt: detail.activeVersion?.updatedAt ?? null,
        }),
      );
    } catch {
      toast.error(strings.publishFailed);
    }
  };

  const handleTryLive = (targetVersionId: string) => void tryLive(targetVersionId);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto custom-scrollbar pb-6 max-w-[880px]">
      {/* Readiness checklist */}
      <div className="rounded-lg border border-border-light bg-white p-4">
        <h3 className="text-base font-medium text-typography-900">{strings.readiness}</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {readiness.map(check => (
            <li key={check.id} className="flex items-center gap-2 text-sm">
              {check.passed ? (
                <CheckCircle size={16} className="shrink-0 text-[#43A047]" />
              ) : (
                <FailIcon size={16} className="shrink-0 text-[#FE6F64]" />
              )}
              <span className={check.passed ? "text-typography-900" : "text-typography-700"}>
                {checkLabels[check.id]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Versions */}
      <div className="rounded-lg border border-border-light bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-typography-900">{strings.versions}</h3>
          <Button
            variant={ButtonVariant.SECONDARY}
            className="h-[34px] px-3 text-sm"
            onClick={handleNewVersion}
          >
            {strings.newVersion}
          </Button>
        </div>

        {isLoadingVersions ? (
          <div className="mt-3 flex flex-col gap-2 animate-pulse">
            <div className="h-12 rounded-md bg-neutral-100" />
            <div className="h-12 rounded-md bg-neutral-100" />
          </div>
        ) : versions.length === 0 ? (
          <div className="mt-3">
            <EmptyState title={strings.noVersions} hideActionButton />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {versions.map(version => {
              const isDraft = String(version.status).toUpperCase() === "DRAFT";
              const isActiveDraft = version.id === versionId;
              return (
                <div
                  key={version.id}
                  className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                    isActiveDraft ? "border-primary-300" : "border-border-light"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={String(version.status)} />
                    <span className="truncate font-mono text-xs text-typography-700">
                      {version.id}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-typography-600">
                      {formatDate(version.publishedAt ?? version.updatedAt)}
                    </span>
                    <Button
                      variant={ButtonVariant.SECONDARY}
                      className="h-[32px] px-3 text-sm"
                      onClick={() => handleTryLive(version.id)}
                      disabled={isStartingSession}
                    >
                      <Play className="w-4 h-4" />
                      {isStartingSession ? strings.startingSession : strings.tryLive}
                    </Button>
                    {isDraft && (
                      <span title={allReady ? "" : strings.readiness}>
                        <Button
                          variant={ButtonVariant.PRIMARY}
                          className="h-[32px] px-3 text-sm"
                          onClick={() => doPublish(version.id, false)}
                          disabled={isPublishing || !allReady}
                        >
                          {isPublishing ? strings.publishing : strings.publish}
                        </Button>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ActionConfirmationPopup
        isOpen={Boolean(forceConfirmVersionId)}
        onClose={() => setForceConfirmVersionId(null)}
        title={strings.forceTitle}
        titleItalic={strings.forceTitleItalic}
        description={strings.forceDescription}
        primaryButton={{
          label: strings.forcePublish,
          onClick: () => {
            const target = forceConfirmVersionId;
            setForceConfirmVersionId(null);
            if (target) void doPublish(target, true);
          },
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setForceConfirmVersionId(null),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
