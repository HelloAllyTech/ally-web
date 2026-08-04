import React, { useCallback } from "react";

import {
  useCreateSttConfigMutation,
  useDeleteSttConfigMutation,
  useGetSttConfigsQuery,
  useUpdateSttConfigMutation,
} from "@api";
import { ProviderConfigRegistry } from "@components";
import { ProviderConfigPayload } from "@components/provider-config-side-panel";
import { PROVIDER_CONFIG_COLUMNS, STT_PROVIDER_OPTIONS, STT_PROVIDER_SCHEMA } from "@constants";

/**
 * The Speech Recognition registry — languages pick their default from here, and
 * a simulation can override it per language in its Language-Voice table.
 * Editing a row changes behaviour everywhere it's referenced, which is the
 * point: a model bump is one edit rather than one per language.
 */
export const SttConfigs: React.FC = () => {
  const { data: sttConfigs = [], isFetching } = useGetSttConfigsQuery();
  const [createSttConfig] = useCreateSttConfigMutation();
  const [updateSttConfig] = useUpdateSttConfigMutation();
  const [deleteSttConfig] = useDeleteSttConfigMutation();

  const handleSave = useCallback(
    async (payload: ProviderConfigPayload, id?: string) => {
      if (id) await updateSttConfig({ id, sttConfig: payload }).unwrap();
      else await createSttConfig(payload).unwrap();
    },
    [createSttConfig, updateSttConfig],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteSttConfig(id).unwrap();
    },
    [deleteSttConfig],
  );

  return (
    <ProviderConfigRegistry
      title="Speech Recognition"
      subject="STT config"
      configs={sttConfigs}
      isFetching={isFetching}
      schema={STT_PROVIDER_SCHEMA}
      providerOptions={STT_PROVIDER_OPTIONS}
      columns={PROVIDER_CONFIG_COLUMNS}
      buildRow={config => ({ model: config.config?.model ?? "—" })}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  );
};
