import { FC, useCallback, useState } from "react";

import { useTranslation } from "react-i18next";

import type { InteractionMode } from "@ally-ui-mono/ui-shared";

import ToggleButtonGroup from "../toggle-button-group";

// Per-browser convenience only: a learner on a text helpline who always types
// should not have to re-pick it before every roleplay. Losing it (private
// window, cleared storage) just means the voice default, which is harmless.
const PREFERENCE_KEY = "ally.roleplay.interactionMode";

const readPreference = (): InteractionMode => {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) === "TEXT" ? "TEXT" : "VOICE";
  } catch {
    return "VOICE";
  }
};

/**
 * The learner's choice of voice call or text chat, remembered in this browser.
 * Only meaningful where text chat is offered: callers must still send VOICE
 * (or nothing) when it is not, whatever was remembered.
 */
export const useInteractionModePreference = (): [
  InteractionMode,
  (mode: InteractionMode) => void,
] => {
  const [mode, setMode] = useState<InteractionMode>(readPreference);
  const update = useCallback((next: InteractionMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(PREFERENCE_KEY, next);
    } catch {
      /* storage unavailable — the choice still holds for this page */
    }
  }, []);
  return [mode, update];
};

interface InteractionModePickerProps {
  value: InteractionMode;
  onChange: (mode: InteractionMode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Voice call or text chat, shown before a roleplay starts — and only when the
 * learner's organisation and the roleplay both offer text chat, so everyone
 * else never sees a choice at all.
 */
export const InteractionModePicker: FC<InteractionModePickerProps> = ({
  value,
  onChange,
  disabled,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div data-testid="interaction-mode-picker" className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="font-tertiary text-sm text-typography-700">
        {t("learn.scenario.mode.label")}
      </span>
      <ToggleButtonGroup
        value={value}
        onValueChange={next => onChange(next === "TEXT" ? "TEXT" : "VOICE")}
        items={[
          { value: "VOICE", label: t("learn.scenario.mode.voice") },
          { value: "TEXT", label: t("learn.scenario.mode.text") },
        ]}
        disabled={disabled}
        equalWidth
      />
      <p data-testid="interaction-mode-hint" className="font-tertiary text-xs text-typography-500">
        {value === "TEXT" ? t("learn.scenario.mode.textHint") : t("learn.scenario.mode.voiceHint")}
      </p>
    </div>
  );
};
