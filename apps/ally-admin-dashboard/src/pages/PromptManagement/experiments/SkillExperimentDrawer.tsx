import React, { useCallback, useState } from "react";

import { toast } from "sonner";

import {
  useApplySkillExperimentMutation,
  useConfigureSkillExperimentMutation,
  useGetSkillExperimentQuery,
  useResumeSkillExperimentMutation,
  useStartSkillExperimentMutation,
  useStopSkillExperimentMutation,
} from "@api";
import { EntitySidePanel } from "@components";
import { en, Permissions } from "@constants";
import { useUser } from "@hooks";
import { ConfigureSkillExperimentRequest, SkillExperimentDetail } from "@types";
import { hasPermissions } from "@utils";

import { ExperimentErrorState } from "./ExperimentErrorState";
import { ExperimentSettingsForm } from "./ExperimentSettingsForm";
import { ExperimentStatusCard } from "./ExperimentStatusCard";
import { ExperimentTimeline } from "./ExperimentTimeline";
import { FieldHelp } from "./FieldHelp";
import { RubricEditor } from "./RubricEditor";
import { VariantList } from "./VariantList";

/** Live experiments move every few minutes; an open drawer keeps up without a reload. */
const LIVE_POLL_MS = 30_000;

const errorMessage = (error: unknown): string => {
  const message = (error as { data?: { message?: string | string[] } })?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? en.skillExperiments.drawer.actionFailed;
};

const DrawerBody: React.FC<{
  promptId: string;
  detail: SkillExperimentDetail;
  onDirtyChange: (section: "rubric" | "settings", dirty: boolean) => void;
}> = ({ promptId, detail, onDirtyChange }) => {
  const copy = en.skillExperiments;
  const { permissions } = useUser();
  const canEdit = hasPermissions(permissions, [Permissions.EDIT_SKILL_EXPERIMENT]);

  const [configure, { isLoading: saving }] = useConfigureSkillExperimentMutation();
  const [start, { isLoading: starting }] = useStartSkillExperimentMutation();
  const [stop, { isLoading: stopping }] = useStopSkillExperimentMutation();
  const [resume, { isLoading: resuming }] = useResumeSkillExperimentMutation();
  const [apply, { isLoading: applying }] = useApplySkillExperimentMutation();
  const busy = starting || stopping || resuming || applying;

  const { experiment, defaults } = detail;
  const live = !!experiment && experiment.status !== "off";
  const rubric = experiment?.rubric ?? defaults.rubric;
  const settings = experiment ?? defaults;
  const champion = detail.variants.find(v => v.id === experiment?.championVariantId);

  const save = async (data: ConfigureSkillExperimentRequest) => {
    try {
      await configure({ promptId, data }).unwrap();
      toast.success(copy.drawer.saved);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const onAction = async (action: "start" | "stop" | "resume" | "apply") => {
    try {
      if (action === "start") {
        // Turning on with only the suggested rubric shown: save it first, so
        // what the admin saw is what the judge uses.
        if (!experiment) await configure({ promptId, data: { rubric } }).unwrap();
        await start(promptId).unwrap();
      } else if (action === "stop") {
        await stop(promptId).unwrap();
      } else if (action === "resume") {
        await resume(promptId).unwrap();
      } else {
        await apply(promptId).unwrap();
        toast.success(copy.drawer.applied(champion?.label ?? ""));
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  // Turning on uses the SAVED rubric, so it waits until edits are saved.
  const [rubricDirty, setRubricDirty] = useState(false);
  const onRubricDirty = useCallback(
    (d: boolean) => {
      setRubricDirty(d);
      onDirtyChange("rubric", d);
    },
    [onDirtyChange],
  );
  const onSettingsDirty = useCallback(
    (d: boolean) => onDirtyChange("settings", d),
    [onDirtyChange],
  );

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ExperimentStatusCard
        detail={detail}
        canEdit={canEdit}
        startBlockedReason={
          rubric.length === 0
            ? copy.drawer.turnOnDisabled
            : rubricDirty
              ? copy.drawer.turnOnUnsaved
              : undefined
        }
        busy={busy}
        onAction={onAction}
      />
      <RubricEditor
        value={rubric}
        lockedReason={live ? copy.rubric.lockedWhileLive : undefined}
        canEdit={canEdit}
        saving={saving}
        onSave={next => save({ rubric: next })}
        onDirtyChange={onRubricDirty}
      />
      <ExperimentSettingsForm
        settings={settings}
        judgeModel={experiment?.judgeModel ?? null}
        designerModel={experiment?.designerModel ?? null}
        live={live}
        canEdit={canEdit}
        saving={saving}
        onSave={save}
        onDirtyChange={onSettingsDirty}
      />
      <section className="flex flex-col gap-2" aria-labelledby="placeholders-heading">
        <div className="flex items-center gap-2">
          <h3 id="placeholders-heading" className="text-base font-medium text-typography-900">
            {copy.placeholders.heading}
          </h3>
          <FieldHelp text={copy.placeholders.help} />
        </div>
        {detail.lockedPlaceholders.length ? (
          <ul className="flex flex-wrap gap-2">
            {detail.lockedPlaceholders.map(token => (
              <li
                key={token}
                className="rounded border border-border-light bg-neutral-50 px-2 py-0.5 font-mono text-xs text-typography-800"
              >
                {token}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-typography-500">{copy.placeholders.none}</p>
        )}
      </section>
      <VariantList
        promptId={promptId}
        variants={detail.variants}
        currentRun={experiment?.run ?? 0}
        rubric={rubric}
        challengerPercent={settings.challengerTrafficPercent}
        live={live}
      />
      <ExperimentTimeline events={detail.events} />
    </div>
  );
};

export const SkillExperimentDrawer: React.FC<{
  promptId: string;
  skillName: string;
  onClose: () => void;
}> = ({ promptId, skillName, onClose }) => {
  const copy = en.skillExperiments;
  const { data, isLoading, isError, refetch } = useGetSkillExperimentQuery(promptId, {
    pollingInterval: LIVE_POLL_MS,
    skipPollingIfUnfocused: true,
  });
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});
  const onDirtyChange = useCallback(
    (section: string, dirty: boolean) =>
      setDirtySections(prev => (prev[section] === dirty ? prev : { ...prev, [section]: dirty })),
    [],
  );

  return (
    <EntitySidePanel
      isOpen
      title={copy.drawer.title(data?.prompt.name ?? skillName)}
      hideSave
      dirty={Object.values(dirtySections).some(Boolean)}
      onClose={onClose}
    >
      {isLoading && <p className="text-sm text-typography-500">{copy.loading}</p>}
      {isError && <ExperimentErrorState message={copy.drawer.loadError} onRetry={refetch} />}
      {data && <DrawerBody promptId={promptId} detail={data} onDirtyChange={onDirtyChange} />}
    </EntitySidePanel>
  );
};
