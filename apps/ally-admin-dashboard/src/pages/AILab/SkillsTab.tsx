import React, { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetLabSkillsQuery,
  useCreateLabSkillMutation,
  useUpdateLabSkillMutation,
  useDeleteLabSkillMutation,
  useGetAutofillModelsQuery,
} from "@api";
import { ActionConfirmationPopup, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { en, DEFAULT_AUTOFILL_MODEL, FALLBACK_AUTOFILL_MODEL_OPTIONS } from "@constants";
import { LabSkill } from "@types";

import { LabSidePanel, LabField } from "./LabSidePanel";
import { LabTable, LabTableColumn } from "./LabTable";

// Numeric params are kept as strings in the form (empty = "use default").
const EMPTY_FORM = {
  name: "",
  description: "",
  content: "",
  model: DEFAULT_AUTOFILL_MODEL,
  temperature: "",
  maxTokens: "",
  systemPrompt: "",
};

export const SkillsTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetLabSkillsQuery({ search: search || undefined });
  const skills = data?.items ?? [];

  const [createSkill] = useCreateLabSkillMutation();
  const [updateSkill] = useUpdateLabSkillMutation();
  const [deleteSkill] = useDeleteLabSkillMutation();

  // Model options from the LLM registry (OpenAI + Anthropic), with a static
  // fallback if the endpoint is unavailable.
  const { data: models } = useGetAutofillModelsQuery();
  const modelOptions = models?.length ? models : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const openaiModels = modelOptions.filter(m => m.provider === "openai");
  const anthropicModels = modelOptions.filter(m => m.provider === "anthropic");

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selected, setSelected] = useState<LabSkill | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<LabSkill | null>(null);

  const openCreate = useCallback(() => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setIsPanelOpen(true);
  }, []);

  const openEdit = useCallback((skill: LabSkill) => {
    setSelected(skill);
    setForm({
      name: skill.name,
      description: skill.description ?? "",
      content: skill.content,
      model: skill.model || DEFAULT_AUTOFILL_MODEL,
      temperature: skill.temperature != null ? String(skill.temperature) : "",
      maxTokens: skill.maxTokens != null ? String(skill.maxTokens) : "",
      systemPrompt: skill.systemPrompt ?? "",
    });
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelected(null);
  }, []);

  // Blank numeric fields are valid (they mean "use the default"); a present
  // value must parse and sit in range.
  const temperatureValid =
    form.temperature.trim() === "" ||
    (!Number.isNaN(Number(form.temperature)) &&
      Number(form.temperature) >= 0 &&
      Number(form.temperature) <= 2);
  const maxTokensValid =
    form.maxTokens.trim() === "" ||
    (Number.isInteger(Number(form.maxTokens)) && Number(form.maxTokens) >= 1);
  const isValid =
    form.name.trim().length > 0 &&
    form.content.trim().length > 0 &&
    temperatureValid &&
    maxTokensValid;

  const dirty = useMemo(() => {
    const original = selected
      ? {
          name: selected.name,
          description: selected.description ?? "",
          content: selected.content,
          model: selected.model || DEFAULT_AUTOFILL_MODEL,
          temperature: selected.temperature != null ? String(selected.temperature) : "",
          maxTokens: selected.maxTokens != null ? String(selected.maxTokens) : "",
          systemPrompt: selected.systemPrompt ?? "",
        }
      : EMPTY_FORM;
    return JSON.stringify(form) !== JSON.stringify(original);
  }, [form, selected]);

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      content: form.content,
      model: form.model,
      temperature: form.temperature.trim() === "" ? undefined : Number(form.temperature),
      maxTokens: form.maxTokens.trim() === "" ? undefined : Number(form.maxTokens),
      systemPrompt: form.systemPrompt.trim() || undefined,
    };
    const response = selected
      ? await updateSkill({ id: selected.id, data: payload })
      : await createSkill(payload);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.skills.saveFailed);
      return;
    }
    toast.success(selected ? en.aiLab.skills.updated : en.aiLab.skills.created);
    closePanel();
  }, [isValid, form, selected, updateSkill, createSkill, closePanel]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const response = await deleteSkill(deleteTarget.id);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.skills.deleteFailed);
    } else {
      toast.success(en.aiLab.skills.deleted);
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteSkill]);

  const columns: LabTableColumn<LabSkill>[] = [
    {
      key: "name",
      label: en.aiLab.skills.nameLabel,
      className: "font-medium w-[22%]",
    },
    {
      key: "model",
      label: en.aiLab.skills.modelLabel,
      render: row => (
        <span className="font-mono text-xs text-typography-700">
          {row.model || DEFAULT_AUTOFILL_MODEL}
        </span>
      ),
      className: "w-[16%]",
    },
    {
      key: "description",
      label: en.aiLab.skills.descriptionLabel,
      render: row => (
        <span className="text-typography-700 line-clamp-2">{row.description || "—"}</span>
      ),
      className: "w-[26%]",
    },
    {
      key: "content",
      label: en.aiLab.skills.contentLabel,
      render: row => (
        <span className="text-typography-600 line-clamp-2 font-mono text-sm">{row.content}</span>
      ),
    },
  ];

  return (
    <div className="mt-4">
      <p className="text-typography-600 text-sm mb-4 max-w-3xl">{en.aiLab.skills.subtitle}</p>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={en.aiLab.skills.searchPlaceholder}
        action={{
          label: en.aiLab.skills.create,
          onClick: openCreate,
          variant: ButtonVariant.PRIMARY,
        }}
      />

      <div className="mt-5">
        {isLoading ? (
          <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
        ) : skills.length === 0 ? (
          <EmptyState
            title={en.aiLab.skills.empty}
            subtitle={en.aiLab.skills.emptySubtitle}
            actionLabel={en.aiLab.skills.create}
            onAction={openCreate}
          />
        ) : (
          <LabTable columns={columns} rows={skills} onEdit={openEdit} onDelete={setDeleteTarget} />
        )}
      </div>

      <LabSidePanel
        isOpen={isPanelOpen}
        title={selected ? en.aiLab.skills.edit : en.aiLab.skills.create}
        dirty={dirty}
        saveDisabled={!isValid}
        saveDisabledReason={en.aiLab.skills.validation}
        onClose={closePanel}
        onSave={handleSave}
      >
        <LabField label={en.aiLab.skills.nameLabel} required>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={en.aiLab.skills.namePlaceholder}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base"
          />
        </LabField>
        <LabField label={en.aiLab.skills.descriptionLabel}>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={en.aiLab.skills.descriptionPlaceholder}
            rows={2}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base resize-none"
          />
        </LabField>
        <LabField label={en.aiLab.skills.modelLabel} required help={en.aiLab.skills.modelHelp}>
          <select
            value={form.model}
            onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base bg-white"
          >
            {openaiModels.length > 0 && (
              <optgroup label="OpenAI">
                {openaiModels.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            )}
            {anthropicModels.length > 0 && (
              <optgroup label="Anthropic">
                {anthropicModels.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </LabField>
        <div className="flex gap-3">
          <LabField label={en.aiLab.skills.temperatureLabel} help={en.aiLab.skills.temperatureHelp}>
            <input
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={form.temperature}
              onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))}
              placeholder={en.aiLab.skills.temperaturePlaceholder}
              className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base"
            />
          </LabField>
          <LabField label={en.aiLab.skills.maxTokensLabel} help={en.aiLab.skills.maxTokensHelp}>
            <input
              type="number"
              step="1"
              min={1}
              value={form.maxTokens}
              onChange={e => setForm(f => ({ ...f, maxTokens: e.target.value }))}
              placeholder={en.aiLab.skills.maxTokensPlaceholder}
              className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base"
            />
          </LabField>
        </div>
        <LabField label={en.aiLab.skills.systemPromptLabel} help={en.aiLab.skills.systemPromptHelp}>
          <textarea
            value={form.systemPrompt}
            onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
            placeholder={en.aiLab.skills.systemPromptPlaceholder}
            rows={3}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-sm font-mono resize-y"
          />
        </LabField>
        <LabField label={en.aiLab.skills.contentLabel} required>
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder={en.aiLab.skills.contentPlaceholder}
            rows={12}
            className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-sm font-mono resize-y"
          />
        </LabField>
      </LabSidePanel>

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={en.aiLab.skills.deleteTitle}
        description={en.aiLab.skills.deleteDescription}
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
