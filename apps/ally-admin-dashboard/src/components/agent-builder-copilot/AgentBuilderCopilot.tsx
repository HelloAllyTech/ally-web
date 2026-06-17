import { FC, useState } from "react";

import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { useGenerateAgentPromptMutation, useGetAutofillModelsQuery } from "@api";
import { InfoIcon } from "@assets";
import { DEFAULT_AUTOFILL_MODEL, FALLBACK_AUTOFILL_MODEL_OPTIONS, en } from "@constants";
import { applyAgentBuilderOutputToForm, parseAgentBuilderOutput } from "@utils";

import { AgentBuilderSystemSkillPanel } from "./AgentBuilderSystemSkillPanel";
import { AutofillModelSelect } from "../autofill-model-select";
import { Button } from "../button";
import { InputField } from "../input-field";
import { ButtonVariant } from "../types";

const AGENT_DESCRIPTION_FIELD = "agentBuilderDescription";
const AGENT_PROMPT_FIELD = "agentBuilderPrompt";
const MAX_DESCRIPTION_LENGTH = 10000;

interface AgentBuilderCopilotProps {
  formMethods: UseFormReturn<any>;
  simulationId?: string;
  /**
   * Called after a successful generation that auto-filled the form, so the
   * parent can switch to the Basic Settings tab to show the applied values.
   */
  onApplied?: () => void;
}

/**
 * Agent Builder Copilot tab (Create Simulation). Lets an author describe a
 * roleplay actor in free text and generate a structured scenario config via an
 * LLM. The structured output is parsed and applied to the shared form so the
 * Basic Settings tab is auto-filled; the raw generated JSON is kept in form
 * state (`agentBuilderPrompt`) so it persists with the scenario on Save/Publish.
 */
export const AgentBuilderCopilot: FC<AgentBuilderCopilotProps> = ({ formMethods, onApplied }) => {
  const [generateAgentPrompt] = useGenerateAgentPromptMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const [isSkillPanelOpen, setIsSkillPanelOpen] = useState(false);
  // Field labels applied to Basic Settings on the last successful generation.
  // null = no successful apply this mount (e.g. parse fallback or fresh tab).
  const [appliedFields, setAppliedFields] = useState<string[] | null>(null);

  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";

  const description = (formMethods.watch(AGENT_DESCRIPTION_FIELD) as string) ?? "";
  const generatedRaw = (formMethods.watch(AGENT_PROMPT_FIELD) as string) ?? "";

  const handleGenerate = async () => {
    if (isGenerating) return;

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      toast.error(en.simulation.agentBuilder.emptyDescription);
      return;
    }

    setIsGenerating(true);
    setAppliedFields(null);
    try {
      const response = await generateAgentPrompt({
        description: trimmedDescription,
        model: selectedModel,
        provider: selectedProvider as "openai" | "anthropic",
      }).unwrap();

      const raw = response.systemPrompt ?? "";
      // Keep the raw generated output in form state so it persists with the
      // scenario and stays visible for transparency / manual copy.
      formMethods.setValue(AGENT_PROMPT_FIELD, raw, { shouldDirty: true });

      const parsed = parseAgentBuilderOutput(raw);
      if (parsed) {
        const applied = applyAgentBuilderOutputToForm(parsed, formMethods);
        setAppliedFields(applied);
        if (applied.length > 0) {
          toast.success(en.simulation.agentBuilder.appliedSummary(applied.length));
          onApplied?.();
        } else {
          toast.warning(en.simulation.agentBuilder.noFieldsApplied);
        }
      } else {
        // Couldn't parse structured JSON — fall back to seeding the role
        // instruction (if empty) so the generation isn't lost, and surface the
        // raw output for manual use. No navigation in this path.
        const currentPrompt = (formMethods.getValues("prompt") as string) ?? "";
        if (!currentPrompt.trim()) {
          formMethods.setValue("prompt", raw, { shouldDirty: true });
        }
        toast.warning(en.simulation.agentBuilder.parseFallback);
      }
    } catch {
      toast.error(en.simulation.agentBuilder.failedToGenerate);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLabel = generatedRaw.trim()
    ? en.simulation.agentBuilder.regenerate
    : en.simulation.agentBuilder.generate;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl text-typography-900 font-secondary">
          {en.simulation.agentBuilder.heading}
        </h2>
      </div>

      <InputField
        label=""
        id={AGENT_DESCRIPTION_FIELD}
        formMethods={formMethods}
        multiline
        maxLength={MAX_DESCRIPTION_LENGTH}
        minHeight="200"
        placeholder={en.simulation.agentBuilder.descriptionPlaceholder}
        disabled={isGenerating}
      />

      <div className="flex items-center gap-3">
        <AutofillModelSelect
          value={selectedModel}
          onChange={setSelectedModel}
          disabled={isGenerating}
        />
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={handleGenerate}
          disabled={isGenerating || !description.trim()}
          className="px-4 h-[40px]"
        >
          {isGenerating ? en.simulation.agentBuilder.generating : generateLabel}
        </Button>
        <button
          type="button"
          onClick={() => setIsSkillPanelOpen(true)}
          title={en.simulation.agentBuilder.viewSystemSkill}
          aria-label={en.simulation.agentBuilder.viewSystemSkill}
          className="flex items-center justify-center w-9 h-9 rounded-md text-typography-500 hover:bg-neutral-100 transition-colors"
        >
          <InfoIcon width={18} height={18} />
        </button>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-primary-500 text-sm animate-fadeInOut">
          <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
          {en.simulation.agentBuilder.generating}
        </div>
      )}

      {!isGenerating && appliedFields && appliedFields.length > 0 && (
        <div className="flex flex-col gap-3 rounded-md border border-success-200 bg-success-50 p-4">
          <span className="text-sm font-medium text-typography-900">
            {en.simulation.agentBuilder.appliedFieldsLabel}
          </span>
          <div className="flex flex-wrap gap-2">
            {appliedFields.map(field => (
              <span
                key={field}
                className="rounded-full bg-white border border-success-200 px-3 py-1 text-xs text-typography-800"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isGenerating && generatedRaw.trim().length > 0 && (
        <details className="rounded-md border border-border-light bg-neutral-50 p-4">
          <summary className="cursor-pointer text-sm text-typography-700 select-none">
            {en.simulation.agentBuilder.viewRawOutput}
          </summary>
          <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs text-typography-800">
            {generatedRaw}
          </pre>
        </details>
      )}

      <AgentBuilderSystemSkillPanel
        isOpen={isSkillPanelOpen}
        onClose={() => setIsSkillPanelOpen(false)}
      />
    </div>
  );
};
