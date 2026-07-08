import React from "react";

import { useDispatch, useSelector } from "react-redux";

import { en } from "@constants";
import { selectRoleplaySpec, setNaturalnessFlag } from "@reducer";
import { ToggleSwitch } from "@src/components/toggle-switch";
import { RoleplayNaturalnessFlag } from "@src/types/roleplayStudio";

import { SpecSectionCard } from "./SpecSectionCard";

interface NaturalnessSettingsSectionProps {
  readOnly?: boolean;
}

/**
 * Voice-naturalness / latency-masking runtime toggles (Thinking Filler, Comfort
 * Audio, Continuous Back-channeling, Interim Reply). These mirror the Roleplay
 * Studio 1 metadata flags; they live as top-level spec keys and are honored by
 * the v2 voice worker. Redux-driven (unlike the react-hook-form ToggleSection),
 * so it uses the raw ToggleSwitch primitive.
 */
export const NaturalnessSettingsSection: React.FC<NaturalnessSettingsSectionProps> = ({
  readOnly = false,
}) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();
  const spec = useSelector(selectRoleplaySpec);

  if (!spec) return null;

  const rows: Array<{ key: RoleplayNaturalnessFlag; label: string; help: string }> = [
    { key: "fillerEnabled", label: strings.thinkingFiller, help: strings.thinkingFillerHelp },
    { key: "comfortAudioEnabled", label: strings.comfortAudio, help: strings.comfortAudioHelp },
    {
      key: "continuousBackchanneling",
      label: strings.continuousBackchanneling,
      help: strings.continuousBackchannelingHelp,
    },
    { key: "interimReplyEnabled", label: strings.interimReply, help: strings.interimReplyHelp },
  ];

  return (
    <SpecSectionCard
      title={strings.voiceNaturalness}
      sections={[
        "fillerEnabled",
        "comfortAudioEnabled",
        "continuousBackchanneling",
        "interimReplyEnabled",
      ]}
    >
      <div className="flex flex-col gap-4">
        {rows.map(row => {
          const enabled = Boolean(spec[row.key]);
          return (
            <div key={row.key} className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-typography-900">{row.label}</span>
                <span className="text-xs text-typography-600">{row.help}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ToggleSwitch
                  enabled={enabled}
                  onChange={value =>
                    dispatch(setNaturalnessFlag({ key: row.key, value }))
                  }
                  label={row.label}
                  disabled={readOnly}
                />
                <span className="w-16 text-sm text-typography-700">
                  {enabled ? en.common.enabled : en.common.disabled}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SpecSectionCard>
  );
};
