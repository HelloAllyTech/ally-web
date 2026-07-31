import React, { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  ActionConfirmationPopup,
  ListToolbar,
  NotionTable,
  ProviderConfigSidePanel,
} from "@components";
import { ProviderConfigPayload, ProviderConfigRow } from "@components/provider-config-side-panel";
import { ButtonVariant } from "@components/types";
import { getProviderLabelFrom, ProviderConfigSchema } from "@constants";

interface ProviderConfigRegistryProps {
  /** Page heading, e.g. "Speech Recognition". */
  title: string;
  /** Singular noun for buttons and messages, e.g. "STT config". */
  subject: string;
  configs: ProviderConfigRow[];
  isFetching: boolean;
  schema: ProviderConfigSchema;
  providerOptions: Array<{ value: string; label: string }>;
  columns: any[];
  /** Extra per-row cells beyond name/provider/status, e.g. the model column. */
  buildRow?: (config: ProviderConfigRow) => Record<string, any>;
  onSave: (payload: ProviderConfigPayload, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * The list + side panel shared by every provider-config registry tab.
 *
 * Speech Recognition and Language Model were the same 159-line page twice,
 * differing only in the strings and which hooks they called, so the page itself
 * is now the abstraction and each tab is a thin wrapper supplying its data.
 */
export const ProviderConfigRegistry: React.FC<ProviderConfigRegistryProps> = ({
  title,
  subject,
  configs,
  isFetching,
  schema,
  providerOptions,
  columns,
  buildRow,
  onSave,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [selected, setSelected] = useState<ProviderConfigRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProviderConfigRow | null>(null);

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return configs;
    return configs.filter(config =>
      [config.name, config.provider, config.config?.model]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle)),
    );
  }, [configs, searchQuery]);

  const tableData = useMemo(
    () =>
      filtered.map(config => ({
        ...config,
        configName: config.name,
        providerLabel: getProviderLabelFrom(providerOptions, config.provider),
        status: config.active ? "Active" : "Inactive",
        ...(buildRow ? buildRow(config) : {}),
      })),
    [filtered, providerOptions, buildRow],
  );

  const handleSave = useCallback(
    async (payload: ProviderConfigPayload, id?: string) => {
      try {
        await onSave(payload, id);
        toast.success(id ? `${subject} updated` : `${subject} created`);
        setIsSidePanelOpen(false);
        setSelected(null);
      } catch (error: any) {
        // Surface the backend's own message — it explains the name clash, the
        // missing required field, or the languages still pointing at this row.
        toast.error(error?.data?.message ?? `Failed to save the ${subject}`);
        throw error;
      }
    },
    [onSave, subject],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await onDelete(pendingDelete.id);
      toast.success(`${subject} deleted`);
      setIsSidePanelOpen(false);
      setSelected(null);
    } catch (error: any) {
      toast.error(error?.data?.message ?? `Failed to delete the ${subject}`);
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, onDelete, subject]);

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div className="flex items-center gap-3 pb-6">
        <h1 className="text-2xl text-typography-900 font-secondary">{title}</h1>
      </div>

      <ListToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={`Search ${subject}s...`}
        action={{
          label: `Create new ${subject}`,
          variant: ButtonVariant.PRIMARY,
          onClick: () => {
            setSelected(null);
            setIsSidePanelOpen(true);
          },
        }}
      />

      <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
        <NotionTable
          tableData={{ data: tableData, columns }}
          // NotionTable hands back the row *index*, not the row object. Index
          // into `filtered`, which tableData was derived from — the unfiltered
          // list would open the wrong config while searching.
          onRowClick={(rowIndex: number) => {
            const match = filtered[rowIndex];
            if (!match) return;
            setSelected(match);
            setIsSidePanelOpen(true);
          }}
          onRowChange={() => {}}
          onSelectionChange={() => {}}
          tableFooter={
            <div className="py-4 text-typography-500 text-base">
              {isFetching ? "Loading…" : `${tableData.length} config(s)`}
            </div>
          }
        />
      </div>

      {isSidePanelOpen && (
        <ProviderConfigSidePanel
          selected={selected}
          isOpen={isSidePanelOpen}
          subject={subject}
          schema={schema}
          providerOptions={providerOptions}
          onClose={() => {
            setIsSidePanelOpen(false);
            setSelected(null);
          }}
          onSave={handleSave}
          onDelete={setPendingDelete}
        />
      )}

      <ActionConfirmationPopup
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${subject}`}
        description={`Delete "${pendingDelete?.name}"? Languages that still default to it will block this — deactivate it instead if you just want it out of the pickers.`}
        primaryButton={{ label: "Delete", onClick: handleConfirmDelete }}
        secondaryButton={{ label: "Cancel", onClick: () => setPendingDelete(null) }}
      />
    </div>
  );
};
