import React, { useCallback } from "react";

import {
  useCreateLlmConfigMutation,
  useDeleteLlmConfigMutation,
  useGetLlmConfigsQuery,
  useUpdateLlmConfigMutation,
} from "@api";
import { ProviderConfigRegistry } from "@components";
import { ProviderConfigPayload } from "@components/provider-config-side-panel";
import { LLM_PROVIDER_OPTIONS, LLM_PROVIDER_SCHEMA, PROVIDER_CONFIG_COLUMNS } from "@constants";

/** The Language Model registry — the LLM twin of Speech Recognition. */
export const LlmConfigs: React.FC = () => {
  const { data: llmConfigs = [], isFetching } = useGetLlmConfigsQuery();
  const [createLlmConfig] = useCreateLlmConfigMutation();
  const [updateLlmConfig] = useUpdateLlmConfigMutation();
  const [deleteLlmConfig] = useDeleteLlmConfigMutation();

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
    />
  );
};
