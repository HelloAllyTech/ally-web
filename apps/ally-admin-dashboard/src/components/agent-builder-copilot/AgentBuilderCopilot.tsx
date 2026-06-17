import { FC, useState } from "react";

import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { useGenerateAgentPromptMutation, useGetAutofillModelsQuery } from "@api";
import { DEFAULT_AUTOFILL_MODEL, FALLBACK_AUTOFILL_MODEL_OPTIONS, en } from "@constants";

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
}

/**
 * Agent Builder Copilot tab (Create Simulation). Lets an author describe a
 * roleplay actor in free text and generate a comprehensive system prompt via an
 * LLM. The description and the generated/edited prompt are kept in form state so
 * they persist with the scenario on Save/Publish (scenario metadata).
 */
export const AgentBuilderCopilot: FC<AgentBuilderCopilotProps> = ({ formMethods }) => {
  const [generateAgentPrompt] = useGenerateAgentPromptMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);

  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";

  const description = (formMethods.watch(AGENT_DESCRIPTION_FIELD) as string) ?? "";
  const generatedPrompt = (formMethods.watch(AGENT_PROMPT_FIELD) as string) ?? "";

  const handleGenerate = async () => {
    if (isGenerating) return;

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      toast.error(en.simulation.agentBuilder.emptyDescription);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await generateAgentPrompt({
        description: trimmedDescription,
        model: selectedModel,
        provider: selectedProvider as "openai" | "anthropic",
      }).unwrap();

      formMethods.setValue(AGENT_PROMPT_FIELD, response.systemPrompt, {
        shouldDirty: true,
      });
      toast.success(en.simulation.agentBuilder.generatedSuccessfully);
    } catch {
      toast.error(en.simulation.agentBuilder.failedToGenerate);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLabel = generatedPrompt.trim()
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
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-primary-500 text-sm animate-fadeInOut">
          <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
          {en.simulation.agentBuilder.generating}
        </div>
      )}

      {(generatedPrompt.length > 0 || isGenerating) && (
        <InputField
          label={en.simulation.agentBuilder.outputLabel}
          id={AGENT_PROMPT_FIELD}
          formMethods={formMethods}
          multiline
          minHeight="320"
          placeholder={en.simulation.agentBuilder.outputPlaceholder}
          disabled={isGenerating}
        />
      )}
    </div>
  );
};
