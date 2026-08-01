import React, { useCallback } from "react";

import {
  useCreateLlmConfigMutation,
  useDeleteLlmConfigMutation,
  useGetLlmConfigsQuery,
  usePreviewLlmConfigMutation,
  useUpdateLlmConfigMutation,
} from "@api";
import { ProviderConfigRegistry } from "@components";
import {
  ProviderConfigPayload,
  ProviderConfigTestResult,
} from "@components/provider-config-side-panel";
import { LLM_PROVIDER_OPTIONS, LLM_PROVIDER_SCHEMA, PROVIDER_CONFIG_COLUMNS } from "@constants";

/** The Language Model registry — the LLM twin of Speech Recognition. */
export const LlmConfigs: React.FC = () => {
  const { data: llmConfigs = [], isFetching } = useGetLlmConfigsQuery();
  const [createLlmConfig] = useCreateLlmConfigMutation();
  const [updateLlmConfig] = useUpdateLlmConfigMutation();
  const [deleteLlmConfig] = useDeleteLlmConfigMutation();
  const [previewLlmConfig] = usePreviewLlmConfigMutation();

  const handleSave = useCallback(
    async (payload: ProviderConfigPayload, id?: string) => {
      if (id) await updateLlmConfig({ id, llmConfig: payload }).unwrap();
      else await createLlmConfig(payload).unwrap();
    },
    [createLlmConfig, updateLlmConfig],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteLlmConfig(id).unwrap();
    },
    [deleteLlmConfig],
  );

  /**
   * Ask the provider whether this model still answers.
   *
   * A refusal comes back as a 200 with `ok: false` — a retired model is the
   * answer, not an error — so only a genuinely failed request rejects here and
   * is caught by the panel.
   */
  const handleTest = useCallback(
    async (id: string): Promise<ProviderConfigTestResult> => {
      const result = await previewLlmConfig(id).unwrap();

      if (!result.ok) {
        return {
          ok: false,
          summary: `${result.provider} · ${result.model}`,
          detail: result.error ?? "The provider returned no response.",
        };
      }

      const tokens =
        result.promptTokens != null && result.completionTokens != null
          ? ` · ${result.promptTokens}→${result.completionTokens} tokens`
          : "";

      return {
        ok: true,
        summary: `${result.model} · ${result.latencyMs} ms${tokens}`,
        detail: result.text ? `Reply: ${result.text}` : undefined,
      };
    },
    [previewLlmConfig],
  );

  return (
    <ProviderConfigRegistry
      title="Language Model"
      subject="LLM config"
      configs={llmConfigs}
      isFetching={isFetching}
      schema={LLM_PROVIDER_SCHEMA}
      providerOptions={LLM_PROVIDER_OPTIONS}
      columns={PROVIDER_CONFIG_COLUMNS}
      buildRow={config => ({ model: config.config?.model ?? "Server default" })}
      onSave={handleSave}
      onDelete={handleDelete}
      onTest={handleTest}
    />
  );
};
