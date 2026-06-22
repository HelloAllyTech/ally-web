import { FC, KeyboardEvent, useState } from "react";

import { UseFormReturn } from "react-hook-form";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { Settings, Terminal } from "@icons";

import { Button } from "../../button";
import { DropdownField } from "../../dropdown-field";
import { FormLabel } from "../../form-label";
import { MainAgentPromptPicker } from "../../main-agent-prompt-picker";
import { ButtonVariant } from "../../types";

const copy = en.simulation.agentBuilder;
const MAX_DESCRIPTION_LENGTH = 10000;

interface CopilotComposerProps {
  mode: "brief" | "revise";
  disabled: boolean;
  isRunning: boolean;
  formMethods: UseFormReturn<any>;
  model: string;
  onModelChange: (model: string) => void;
  modelOptions: { label: string; value: string }[];
  onSubmit: (text: string) => Promise<boolean>;
  onCancel: () => void;
  onOpenSkillPanel: () => void;
}

/**
 * Bottom-docked chat composer. Greys out while a build is running, and switches
 * its placeholder from "describe the agent" to "ask for changes" once a run has
 * finished. The skill + model pickers live in a collapsible settings popover so
 * they don't dominate the surface.
 */
export const CopilotComposer: FC<CopilotComposerProps> = ({
  mode,
  disabled,
  isRunning,
  formMethods,
  model,
  onModelChange,
  modelOptions,
  onSubmit,
  onCancel,
  onOpenSkillPanel,
}) => {
  const [text, setText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const submit = async () => {
    if (disabled || !text.trim()) return;
    const ok = await onSubmit(text);
    if (ok) setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  const placeholder = mode === "revise" ? copy.revisePlaceholder : copy.descriptionPlaceholder;

  return (
    <div className="shrink-0 border-t border-border-light bg-white">
      {settingsOpen && mode === "brief" && (
        <div className="mx-auto flex max-w-3xl flex-col gap-4 border-b border-border-light px-4 py-4">
          <MainAgentPromptPicker
            id="selectedMainPromptCode"
            label={copy.skillVersionLabel}
            formMethods={formMethods}
            className="w-72 max-w-full"
          />
          <div className="flex w-72 max-w-full flex-col gap-2">
            <FormLabel>{copy.modelLabel}</FormLabel>
            <DropdownField
              id="agentBuilderModel"
              label={copy.modelLabel}
              options={modelOptions}
              value={model}
              onChange={onModelChange}
            />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-3">
        <div
          className={`flex items-end gap-2 rounded-2xl border px-3 py-2 ${
            disabled ? "border-border-light bg-neutral-100" : "border-border-dark bg-white"
          }`}
        >
          {mode === "brief" && (
            <button
              type="button"
              onClick={() => setSettingsOpen(o => !o)}
              title={copy.buildSettings}
              aria-label={copy.buildSettings}
              className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-typography-500 hover:bg-neutral-100"
            >
              <Settings size={18} />
            </button>
          )}
          <div className="flex-1">
            <AutoExpandableTextarea
              value={text}
              onChange={setText}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              maxLines={8}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
          </div>
          <button
            type="button"
            onClick={onOpenSkillPanel}
            title={copy.viewSystemSkill}
            aria-label={copy.viewSystemSkill}
            className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-typography-500 hover:bg-neutral-100"
          >
            <Terminal size={18} />
          </button>
          {isRunning ? (
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={onCancel}
              className="mb-1 h-9 shrink-0 px-3"
            >
              {copy.cancel}
            </Button>
          ) : (
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => void submit()}
              disabled={disabled || !text.trim()}
              className="mb-1 h-9 shrink-0 px-4"
            >
              {copy.send}
            </Button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-typography-500">{copy.composerHint}</p>
      </div>
    </div>
  );
};
