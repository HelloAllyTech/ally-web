import React, { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useCreateLlmModelMutation,
  useDeleteLlmModelMutation,
  useGetLlmModelCatalogQuery,
  useUpdateLlmModelMutation,
} from "@api";
import { ActionConfirmationPopup, ListToolbar, NotionTable } from "@components";
import { ButtonVariant } from "@components/types";
import { getProviderLabelFrom, LLM_MODEL_CATALOG_COLUMNS, LLM_PROVIDER_OPTIONS } from "@constants";
import { LlmCatalogModel, LlmCatalogModelPayload } from "@types";

import { LlmModelCatalogPanel } from "./LlmModelCatalogPanel";

/**
 * Which runtimes can execute each provider.
 *
 * Mirrors PROVIDER_RUNTIME_MATRIX in ally-be, for display only — the backend is
 * authoritative and joins the real values when serving the pickers. Shown here
 * so an admin can see at a glance that an Anthropic model will not run a voice
 * session, which is otherwise invisible until a roleplay misbehaves.
 */
const PROVIDER_RUNTIMES: Record<string, string> = {
  openai: "Voice, AI, Backend",
  gemini: "Voice, AI, Backend",
  google: "Voice, AI, Backend",
  anthropic: "Backend only",
};

export const LlmModelCatalog: React.FC = () => {
  const { data: models = [], isFetching } = useGetLlmModelCatalogQuery();
  const [createModel] = useCreateLlmModelMutation();
  const [updateModel] = useUpdateLlmModelMutation();
  const [deleteModel] = useDeleteLlmModelMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selected, setSelected] = useState<LlmCatalogModel | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LlmCatalogModel | null>(null);

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return models;
    return models.filter(row =>
      [row.label, row.model, row.provider]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle)),
    );
  }, [models, searchQuery]);

  const tableData = useMemo(
    () =>
      filtered.map(row => ({
        ...row,
        providerLabel: getProviderLabelFrom(LLM_PROVIDER_OPTIONS, row.provider),
        temperature: row.supportsTemperature ? "Adjustable" : "Fixed",
        runtimeSupport: PROVIDER_RUNTIMES[row.provider?.toLowerCase()] ?? "Not runnable",
        status: row.active ? "Active" : "Inactive",
      })),
    [filtered],
  );

  const handleSave = useCallback(
    async (payload: LlmCatalogModelPayload, id?: string) => {
      try {
        if (id) await updateModel({ id, model: payload }).unwrap();
        else await createModel(payload).unwrap();
        toast.success(id ? "Model updated" : "Model added");
        setIsPanelOpen(false);
        setSelected(null);
      } catch (error: any) {
        // The backend explains the duplicate, the unrunnable provider or the
        // empty model id better than a generic message could.
        toast.error(error?.data?.message ?? "Failed to save the model");
        throw error;
      }
    },
    [createModel, updateModel],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await deleteModel(pendingDelete.id).unwrap();
      toast.success("Model removed");
      setIsPanelOpen(false);
      setSelected(null);
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Failed to remove the model");
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, deleteModel]);

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div className="flex items-center gap-3 pb-6">
        <h1 className="text-2xl text-typography-900 font-secondary">Model Catalog</h1>
      </div>

      <ListToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search models..."
        action={{
          label: "Add model",
          variant: ButtonVariant.PRIMARY,
          onClick: () => {
            setSelected(null);
            setIsPanelOpen(true);
          },
        }}
      />

      <div className="flex flex-col gap-4 h-[calc(100dvh-100px)] relative mt-[20px]">
        <NotionTable
          tableData={{ data: tableData, columns: LLM_MODEL_CATALOG_COLUMNS }}
          // NotionTable passes the row index, not the row. Index into `filtered`,
          // which tableData was derived from — the unfiltered list would open the
          // wrong model while searching.
          onRowClick={(rowIndex: number) => {
            const match = filtered[rowIndex];
            if (!match) return;
            setSelected(match);
            setIsPanelOpen(true);
          }}
          onRowChange={() => {}}
          onSelectionChange={() => {}}
          tableFooter={
            <div className="py-4 text-typography-500 text-base">
              {isFetching ? "Loading…" : `${tableData.length} model(s)`}
            </div>
          }
        />
      </div>

      {isPanelOpen && (
        <LlmModelCatalogPanel
          selected={selected}
          onClose={() => {
            setIsPanelOpen(false);
            setSelected(null);
          }}
          onSave={handleSave}
          onDelete={setPendingDelete}
        />
      )}

      <ActionConfirmationPopup
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Remove model"
        description={`Remove "${pendingDelete?.label}" from the catalog? Languages and prompts already set to this model keep working — they store the model id, not a link to this row. Deactivate it instead if you only want it out of the pickers.`}
        primaryButton={{ label: "Remove", onClick: handleConfirmDelete }}
        secondaryButton={{ label: "Cancel", onClick: () => setPendingDelete(null) }}
      />
    </div>
  );
};
