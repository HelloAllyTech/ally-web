import React from "react";

import { useDispatch, useSelector } from "react-redux";

import { CarbonToggle, Slider } from "@ally-ui-mono/ui-shared";
import { ComfortAudioDropdown } from "@components";
import { en } from "@constants";
import {
  selectRoleplaySpec,
  setComfortAudioUrl,
  setComfortAudioVolume,
  setNaturalnessFlag,
} from "@reducer";
import { RoleplayNaturalnessFlag } from "@src/types/roleplayStudio";

import { SpecSectionCard } from "./SpecSectionCard";

const COMFORT_AUDIO_VOLUME_FALLBACK = 0.3;

interface NaturalnessSettingsSectionProps {
  readOnly?: boolean;
}

/**
 * Voice-naturalness / latency-masking runtime toggles (Comfort Audio,
 * Continuous Back-channeling, Interim Reply). These mirror the Roleplay
 * Studio 1 metadata flags; they live as top-level spec keys and are honored by
 * the v2 voice worker. Trainer-editable even in the otherwise read-only Spec
 * tab, rendered with Carbon Toggle + Slider.
 */
export const NaturalnessSettingsSection: React.FC<NaturalnessSettingsSectionProps> = ({
  readOnly = false,
}) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();
  const spec = useSelector(selectRoleplaySpec);

  if (!spec) return null;

  const rows: Array<{ key: RoleplayNaturalnessFlag; label: string; help: string }> = [
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
      sections={["comfortAudioEnabled", "continuousBackchanneling", "interimReplyEnabled"]}
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
              <div className="shrink-0">
                <CarbonToggle
                  id={`naturalness-${row.key}`}
                  size="sm"
                  hideLabel
                  labelText={row.label}
                  labelA={en.common.disabled}
                  labelB={en.common.enabled}
                  toggled={enabled}
                  disabled={readOnly}
                  onToggle={value => dispatch(setNaturalnessFlag({ key: row.key, value }))}
                />
              </div>
            </div>
          );
        })}

        {spec.comfortAudioEnabled && (
          <div className="flex flex-col gap-3 border-t border-border-light pt-4">
            <ComfortAudioDropdown
              value={spec.comfortAudioUrl ?? ""}
              onChange={url => {
                if (!readOnly) dispatch(setComfortAudioUrl(url));
              }}
            />
            <Slider
              id="comfort-audio-volume"
              labelText={en.comfortAudio.volumeLabel}
              min={0}
              max={1}
              step={0.1}
              value={spec.comfortAudioVolume ?? COMFORT_AUDIO_VOLUME_FALLBACK}
              disabled={readOnly}
              hideTextInput
              onChange={({ value }) => dispatch(setComfortAudioVolume(value))}
            />
            <span className="text-xs text-typography-600">{en.comfortAudio.volumeHelp}</span>
          </div>
        )}
      </div>
    </SpecSectionCard>
  );
};
