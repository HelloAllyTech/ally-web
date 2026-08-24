import React, { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import { TextArea } from "@ally-ui-mono/ui-shared";
import {
  useGetLabVariablesQuery,
  useCreateLabVariableMutation,
  useUpdateLabVariableMutation,
  useDeleteLabVariableMutation,
} from "@api";
import { ActionConfirmationPopup, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabVariable } from "@types";

import { AiLabErrorState } from "./AiLabErrorState";
import { LabSidePanel, LabField } from "./LabSidePanel";
import { LabTable, LabTableColumn } from "./LabTable";

const EMPTY_FORM = { name: "", description: "" };
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

export const VariablesTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetLabVariablesQuery({ search: search || undefined });
  const variables = data?.items ?? [];

  const [createVariable] = useCreateLabVariableMutation();
  const [updateVariable] = useUpdateLabVariableMutation();
  const [deleteVariable] = useDeleteLabVariableMutation();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selected, setSelected] = useState<LabVariable | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<LabVariable | null>(null);

  const openCreate = useCallback(() => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setIsPanelOpen(true);
  }, []);

  const openEdit = useCallback((variable: LabVariable) => {
    setSelected(variable);
    setForm({ name: variable.name, description: variable.description ?? "" });
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelected(null);
  }, []);

  const isValid = NAME_PATTERN.test(form.name.trim());

  const dirty = useMemo(() => {
    const original = selected
      ? { name: selected.name, description: selected.description ?? "" }
      : EMPTY_FORM;
    return JSON.stringify(form) !== JSON.stringify(original);
  }, [form, selected]);

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    };
    const response = selected
      ? await updateVariable({ id: selected.id, data: payload })
      : await createVariable(payload);
    if ("error" in response && response.error) {
      const status = (response.error as { status?: number })?.status;
      toast.error(status === 409 ? en.aiLab.variables.duplicate : en.aiLab.variables.saveFailed);
      return;
    }
    toast.success(selected ? en.aiLab.variables.updated : en.aiLab.variables.created);
    closePanel();
  }, [isValid, form, selected, updateVariable, createVariable, closePanel]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const response = await deleteVariable(deleteTarget.id);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.variables.deleteFailed);
    } else {
      toast.success(en.aiLab.variables.deleted);
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteVariable]);

  const columns: LabTableColumn<LabVariable>[] = [
    {
      key: "name",
      label: en.aiLab.variables.nameLabel,
      render: row => <span className="font-mono text-sm">{`{{${row.name}}}`}</span>,
      className: "w-[30%]",
    },
    {
      key: "description",
      label: en.aiLab.variables.descriptionLabel,
      render: row => <span className="text-typography-700">{row.description || "—"}</span>,
    },
  ];

  return (
    <div className="mt-4">
      <p className="text-typography-600 text-sm mb-4 max-w-3xl">{en.aiLab.variables.subtitle}</p>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={en.aiLab.variables.searchPlaceholder}
        action={{
          label: en.aiLab.variables.create,
          onClick: openCreate,
          variant: ButtonVariant.PRIMARY,
        }}
      />

      <div className="mt-5">
        {isLoading ? (
          <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
        ) : isError ? (
          <AiLabErrorState message={en.aiLab.variables.loadFailed} onRetry={refetch} />
        ) : variables.length === 0 ? (
          <EmptyState
            title={en.aiLab.variables.empty}
            subtitle={en.aiLab.variables.emptySubtitle}
            actionLabel={en.aiLab.variables.create}
            onAction={openCreate}
          />
        ) : (
          <LabTable
            columns={columns}
            rows={variables}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        )}
      </div>

      <LabSidePanel
        isOpen={isPanelOpen}
        title={selected ? en.aiLab.variables.edit : en.aiLab.variables.create}
        dirty={dirty}
        saveDisabled={!isValid}
        saveDisabledReason={en.aiLab.variables.validation}
        onClose={closePanel}
        onSave={handleSave}
      >
        <LabField label={en.aiLab.variables.nameLabel} required help={en.aiLab.variables.nameHelp}>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={en.aiLab.variables.namePlaceholder}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base font-mono"
          />
        </LabField>
        <LabField label={en.aiLab.variables.descriptionLabel}>
          <TextArea
            id="ailab-variable-description"
            labelText={en.aiLab.variables.descriptionLabel}
            hideLabel
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={en.aiLab.variables.descriptionPlaceholder}
            rows={3}
            className="w-full"
          />
        </LabField>
      </LabSidePanel>

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={en.aiLab.variables.deleteTitle}
        description={en.aiLab.variables.deleteDescription}
        primaryButton={{
          label: en.common.delete,
          onClick: handleDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setDeleteTarget(null) }}
      />
    </div>
  );
};
