import React, { useState } from "react";

import { toast } from "sonner";

import { useCreateRoleplayRehearsalMutation } from "@api";
import { Button, ToggleSwitch } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { RoleplayTraineeProfile } from "@src/types/roleplayStudio";

const strings = en.roleplayStudio.rehearsal;

const ALL_PROFILES: RoleplayTraineeProfile[] = ["SKILLED", "POOR", "ADVERSARIAL"];
const DEFAULT_TURNS = 8;
const MAX_TURNS = 40;

interface RehearsalLaunchCardProps {
  specId: string;
  versionId: string;
}

/** Profile toggles + turns-per-profile input; POSTs a new rehearsal run. */
export const RehearsalLaunchCard: React.FC<RehearsalLaunchCardProps> = ({ specId, versionId }) => {
  const [createRehearsal, { isLoading }] = useCreateRoleplayRehearsalMutation();
  const [profiles, setProfiles] = useState<Record<RoleplayTraineeProfile, boolean>>({
    SKILLED: true,
    POOR: true,
    ADVERSARIAL: true,
  });
  const [turnsPerProfile, setTurnsPerProfile] = useState(DEFAULT_TURNS);

  const selectedProfiles = ALL_PROFILES.filter(profile => profiles[profile]);

  const handleStart = async () => {
    if (selectedProfiles.length === 0) {
      toast.error(strings.selectProfile);
      return;
    }
    try {
      await createRehearsal({
        specId,
        versionId,
        traineeProfiles: selectedProfiles,
        turnsPerProfile,
      }).unwrap();
    } catch {
      toast.error(strings.launchFailed);
    }
  };

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <h3 className="text-base font-medium text-typography-900">{strings.launchTitle}</h3>
      <p className="mt-0.5 text-sm text-typography-700">{strings.launchSubtitle}</p>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-typography-900">{strings.traineeProfiles}</span>
          <div className="flex items-center gap-5">
            {ALL_PROFILES.map(profile => (
              <label key={profile} className="flex items-center gap-2 text-sm text-typography-800">
                <ToggleSwitch
                  enabled={profiles[profile]}
                  onChange={enabled => setProfiles(prev => ({ ...prev, [profile]: enabled }))}
                  label={strings.profiles[profile]}
                  disabled={isLoading}
                />
                {strings.profiles[profile]}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm text-typography-900">
          {strings.turnsPerProfile}
          <input
            type="number"
            min={1}
            max={MAX_TURNS}
            value={turnsPerProfile}
            disabled={isLoading}
            onChange={event =>
              setTurnsPerProfile(Math.max(1, Math.min(MAX_TURNS, Number(event.target.value) || 1)))
            }
            className="w-24 rounded-md border border-border-light px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <Button
          variant={ButtonVariant.PRIMARY}
          className="h-[40px] px-5"
          onClick={handleStart}
          disabled={isLoading || selectedProfiles.length === 0}
        >
          {isLoading ? strings.starting : strings.start}
        </Button>
      </div>
    </div>
  );
};
