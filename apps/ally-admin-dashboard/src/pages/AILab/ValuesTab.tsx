import React, { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import { Select, SelectItem } from "@ally-ui-mono/ui-shared";
import {
  useGetLabValuesQuery,
  useGetLabVariablesQuery,
  useCreateLabValueMutation,
  useUpdateLabValueMutation,
  useDeleteLabValueMutation,
} from "@api";
import { ActionConfirmationPopup, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabValue } from "@types";

import { LabSidePanel, LabField } from "./LabSidePanel";
import { LabTable, LabTableColumn } from "./LabTable";

const EMPTY_FORM = { variableId: "", label: "", value: "" };

export const ValuesTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetLabValuesQuery({ search: search || undefined });
  const values = data?.items ?? [];

  // Full variable list drives the picker (and gates creation when empty).
  const { data: variablesData } = useGetLabVariablesQuery({ limit: 500 });
  const variables = variablesData?.items ?? [];
  const hasVariables = variables.length > 0;

  const [createValue] = useCreateLabValueMutation();
  const [updateValue] = useUpdateLabValueMutation();
  const [deleteValue] = useDeleteLabValueMutation();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selected, setSelected] = useState<LabValue | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<LabValue | null>(null);

  const openCreate = useCallback(() => {
    setSelected(null);
    setForm({ ...EMPTY_FORM, variableId: variables[0]?.id ?? "" });
    setIsPanelOpen(true);
  }, [variables]);

  const openEdit = useCallback((value: LabValue) => {
    setSelected(value);
    setForm({
      variableId: value.variableId,
      label: value.label ?? "",
      value: value.value,
    });
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelected(null);
  }, []);

  const isValid = form.variableId.length > 0 && form.value.trim().length > 0;

  const dirty = useMemo(() => {
    const original = selected
      ? {
          variableId: selected.variableId,
          label: selected.label ?? "",
          value: selected.value,
        }
      : { ...EMPTY_FORM, variableId: variables[0]?.id ?? "" };
    return JSON.stringify(form) !== JSON.stringify(original);
  }, [form, selected, variables]);

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    const payload = {
      variableId: form.variableId,
      label: form.label.trim() || undefined,
      value: form.value,
    };
    const response = selected
      ? await updateValue({ id: selected.id, data: payload })
      : await createValue(payload);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.values.saveFailed);
      return;
    }
    toast.success(selected ? en.aiLab.values.updated : en.aiLab.values.created);
    closePanel();
  }, [isValid, form, selected, updateValue, createValue, closePanel]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const response = await deleteValue(deleteTarget.id);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.values.deleteFailed);
    } else {
      toast.success(en.aiLab.values.deleted);
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteValue]);

  const columns: LabTableColumn<LabValue>[] = [
    {
      key: "variable",
      label: en.aiLab.values.columnVariable,
      render: row => (
        <span className="font-mono text-sm">{row.variable ? `{{${row.variable.name}}}` : "—"}</span>
      ),
      className: "w-[24%]",
    },
    {
      key: "label",
      label: en.aiLab.values.columnLabel,
      render: row => <span className="text-typography-700">{row.label || "—"}</span>,
      className: "w-[22%]",
    },
    {
      key: "value",
      label: en.aiLab.values.columnValue,
      render: row => <span className="text-typography-900 line-clamp-2">{row.value}</span>,
    },
  ];

  return (
    <div className="mt-4">
      <p className="text-typography-600 text-sm mb-4 max-w-3xl">{en.aiLab.values.subtitle}</p>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={en.aiLab.values.searchPlaceholder}
        action={
          hasVariables
            ? {
                label: en.aiLab.values.create,
                onClick: openCreate,
                variant: ButtonVariant.PRIMARY,
              }
            : undefined
        }
      />

      {!hasVariables && (
        <p className="mt-3 text-sm text-typography-600 bg-background-secondary border border-border-light rounded-md px-4 py-3">
          {en.aiLab.values.noVariables}
        </p>
      )}

      <div className="mt-5">
        {isLoading ? (
          <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
        ) : values.length === 0 ? (
          <EmptyState
            title={en.aiLab.values.empty}
            subtitle={en.aiLab.values.emptySubtitle}
            actionLabel={hasVariables ? en.aiLab.values.create : undefined}
            onAction={openCreate}
            hideActionButton={!hasVariables}
          />
        ) : (
          <LabTable columns={columns} rows={values} onEdit={openEdit} onDelete={setDeleteTarget} />
        )}
      </div>

      <LabSidePanel
        isOpen={isPanelOpen}
        title={selected ? en.aiLab.values.edit : en.aiLab.values.create}
        dirty={dirty}
        saveDisabled={!isValid}
        saveDisabledReason={en.aiLab.values.validation}
        onClose={closePanel}
        onSave={handleSave}
      >
        <LabField label={en.aiLab.values.variableLabel} required>
          <Select
            id="ailab-values-variable"
            labelText={en.aiLab.values.variableLabel}
            hideLabel
            value={form.variableId}
            onChange={e => setForm(f => ({ ...f, variableId: e.target.value }))}
          >
            <SelectItem value="" text={en.aiLab.values.variablePlaceholder} disabled />
            {variables.map(variable => (
              <SelectItem key={variable.id} value={variable.id} text={`{{${variable.name}}}`} />
            ))}
          </Select>
        </LabField>
        <LabField label={en.aiLab.values.labelLabel}>
          <input
            type="text"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder={en.aiLab.values.labelPlaceholder}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base"
          />
        </LabField>
        <LabField label={en.aiLab.values.valueLabel} required>
          <textarea
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            placeholder={en.aiLab.values.valuePlaceholder}
            rows={6}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base resize-y"
          />
        </LabField>
      </LabSidePanel>

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={en.aiLab.values.deleteTitle}
        description={en.aiLab.values.deleteDescription}
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
