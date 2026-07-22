import React, { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AutoExpandableTextarea, TextInput } from "@ally-ui-mono/ui-shared";
import {
  useArchiveGlossarySectionMutation,
  useConsolidateLanguageGlossaryMutation,
  useGenerateLanguageGlossaryMutation,
  useGetLanguageGlossaryQuery,
  useGetLanguagesQuery,
  usePublishGlossarySectionMutation,
  useUpsertGlossarySectionMutation,
} from "@api";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { ROUTES } from "@constants";
import {
  GlossaryEntry,
  GlossaryEntryType,
  GlossaryInjectionMode,
  GlossarySectionStatus,
  LanguageGlossarySection,
} from "@types";

const MODE_STYLES: Record<GlossaryInjectionMode, string> = {
  always: "bg-purple-100 text-purple-800",
  retrieved: "bg-teal-100 text-teal-800",
};

const STATUS_STYLES: Record<GlossarySectionStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-800",
  archived: "bg-yellow-100 text-yellow-800",
};

const ENTRY_STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  proposed: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
};

const errorMessage = (err: unknown): string => {
  const data = (err as { data?: { message?: string | string[] } })?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join("; ");
  return message ?? "Request failed";
};

/** Editable working copy of one section. */
interface SectionDraft {
  sectionCode: string;
  title: string;
  entries: GlossaryEntry[];
  retrievalHint: string;
  injectionMode: GlossaryInjectionMode;
  status: GlossarySectionStatus;
  isNew: boolean;
}

const toDraft = (section: LanguageGlossarySection): SectionDraft => ({
  sectionCode: section.sectionCode,
  title: section.title,
  entries: section.entries ?? [],
  retrievalHint: section.retrievalHint ?? "",
  injectionMode: section.injectionMode,
  status: section.status,
  isNew: false,
});

const newEntry = (type: GlossaryEntryType): GlossaryEntry => ({
  id: crypto.randomUUID(),
  type,
  status: "published",
  provenance: { source: "manual" },
  ...(type === "term_pair"
    ? { english: "", preferred: "", avoid: "" }
    : { text: "", examples: [] }),
});

const Pill: React.FC<{ className: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${className}`}>
    {children}
  </span>
);

export const LanguageGlossary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const languageId = Number(id);
  const navigate = useNavigate();

  const { data: languages } = useGetLanguagesQuery({ limit: 200, offset: 0 });
  const language = useMemo(
    () => (languages ?? []).find(l => l.id === languageId),
    [languages, languageId],
  );

  const { data, isLoading } = useGetLanguageGlossaryQuery(languageId, {
    skip: !Number.isFinite(languageId),
  });
  const [upsertSection, { isLoading: isSaving }] = useUpsertGlossarySectionMutation();
  const [publishSection, { isLoading: isPublishing }] = usePublishGlossarySectionMutation();
  const [archiveSection] = useArchiveGlossarySectionMutation();
  const [generateGlossary, { isLoading: isGenerating }] = useGenerateLanguageGlossaryMutation();
  const [consolidateGlossary, { isLoading: isConsolidating }] =
    useConsolidateLanguageGlossaryMutation();

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<SectionDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const views = useMemo(() => {
    const list = data?.sections ?? [];
    // Tier 0 (always) sections first, then by code — mirrors compile order.
    return [...list].sort((a, b) => {
      if (a.section.injectionMode !== b.section.injectionMode) {
        return a.section.injectionMode === "always" ? -1 : 1;
      }
      return a.section.sectionCode.localeCompare(b.section.sectionCode);
    });
  }, [data]);

  const selectedView = views.find(v => v.section.sectionCode === selectedCode);

  // Hydrate the editable draft whenever the selection or server data changes,
  // but never while the user has unsaved edits.
  useEffect(() => {
    if (dirty) return;
    if (selectedView) {
      setDraft(toDraft(selectedView.section));
    } else if (!selectedCode) {
      setDraft(null);
    }
  }, [selectedView, selectedCode, dirty]);

  const selectSection = (code: string) => {
    if (dirty && !window.confirm("Discard unsaved changes to this section?")) return;
    setDirty(false);
    setSelectedCode(code);
  };

  const addSection = () => {
    if (dirty && !window.confirm("Discard unsaved changes to this section?")) return;
    setDirty(true);
    setSelectedCode(null);
    setDraft({
      sectionCode: "",
      title: "",
      entries: [],
      retrievalHint: "",
      injectionMode: "retrieved",
      status: "draft",
      isNew: true,
    });
  };

  const updateDraft = (patch: Partial<SectionDraft>) => {
    setDraft(d => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  const updateEntry = (entryId: string, patch: Partial<GlossaryEntry>) => {
    setDraft(d =>
      d ? { ...d, entries: d.entries.map(e => (e.id === entryId ? { ...e, ...patch } : e)) } : d,
    );
    setDirty(true);
  };

  const removeEntry = (entryId: string) => {
    setDraft(d => (d ? { ...d, entries: d.entries.filter(e => e.id !== entryId) } : d));
    setDirty(true);
  };

  const addEntry = (type: GlossaryEntryType) => {
    setDraft(d => (d ? { ...d, entries: [...d.entries, newEntry(type)] } : d));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    const code = draft.sectionCode.trim();
    if (!code || !draft.title.trim()) {
      toast.error("Section code and title are required");
      return;
    }
    try {
      await upsertSection({
        languageId,
        sectionCode: code,
        payload: {
          title: draft.title.trim(),
          entries: draft.entries,
          retrievalHint: draft.retrievalHint.trim() || undefined,
          injectionMode: draft.injectionMode,
        },
      }).unwrap();
      setDirty(false);
      setSelectedCode(code);
      toast.success(`Section '${code}' saved`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handlePublish = async () => {
    if (!draft || draft.isNew) return;
    try {
      await publishSection({ languageId, sectionCode: draft.sectionCode }).unwrap();
      setDirty(false);
      toast.success(`Section '${draft.sectionCode}' published`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleArchive = async () => {
    if (!draft || draft.isNew) return;
    setConfirmArchive(false);
    try {
      await archiveSection({ languageId, sectionCode: draft.sectionCode }).unwrap();
      setDirty(false);
      toast.success(`Section '${draft.sectionCode}' archived`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleConsolidate = async () => {
    try {
      const result = await consolidateGlossary(languageId).unwrap();
      if (result.annotationsConsidered === 0) {
        toast.info("No new judge error annotations to consolidate");
        return;
      }
      toast.success(
        `Consolidated ${result.annotationsConsidered} annotations into ${result.proposed} proposed entries (${result.skippedDuplicates} duplicates skipped) — review the amber entries`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await generateGlossary(languageId).unwrap();
      toast.success(
        `Draft glossary generated: ${result.created.length} created, ${result.updated.length} updated, ${result.skipped.length} skipped (published)`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const tier0Tokens = data?.tier0Tokens ?? 0;
  const tier0Cap = data?.tier0TokenCap ?? 2000;
  const tier0Pct = Math.min(100, Math.round((tier0Tokens / tier0Cap) * 100));
  const tier0Over = tier0Tokens > tier0Cap * 0.9;

  const renderEntryEditor = (entry: GlossaryEntry) => {
    const statusPill = (
      <Pill className={ENTRY_STATUS_STYLES[entry.status] ?? "bg-gray-100 text-gray-700"}>
        {entry.status}
      </Pill>
    );
    const reviewControls = entry.status === "proposed" && (
      <span className="flex gap-1">
        <button
          className="text-xs text-green-700 underline"
          onClick={() => updateEntry(entry.id, { status: "published" })}
        >
          Accept
        </button>
        <button
          className="text-xs text-red-700 underline"
          onClick={() => updateEntry(entry.id, { status: "rejected" })}
        >
          Reject
        </button>
      </span>
    );

    if (entry.type === "term_pair") {
      return (
        <div key={entry.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center py-1">
          <TextInput
            id={`en-${entry.id}`}
            labelText="English"
            hideLabel
            placeholder="English term"
            value={entry.english ?? ""}
            onChange={e => updateEntry(entry.id, { english: e.target.value })}
          />
          <TextInput
            id={`pref-${entry.id}`}
            labelText="Say"
            hideLabel
            placeholder="Say (colloquial, native script)"
            value={entry.preferred ?? ""}
            onChange={e => updateEntry(entry.id, { preferred: e.target.value })}
          />
          <TextInput
            id={`avoid-${entry.id}`}
            labelText="Avoid"
            hideLabel
            placeholder="Avoid (literary)"
            value={entry.avoid ?? ""}
            onChange={e => updateEntry(entry.id, { avoid: e.target.value })}
          />
          <span className="flex items-center gap-2">
            {statusPill}
            {reviewControls}
            <button
              className="text-gray-400 hover:text-red-600 text-sm"
              title="Remove entry"
              onClick={() => removeEntry(entry.id)}
            >
              ✕
            </button>
          </span>
        </div>
      );
    }

    return (
      <div key={entry.id} className="border border-gray-200 rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {entry.type === "rule" ? "Rule" : "Pattern"}
          </span>
          <span className="flex items-center gap-2">
            {statusPill}
            {reviewControls}
            <button
              className="text-gray-400 hover:text-red-600 text-sm"
              title="Remove entry"
              onClick={() => removeEntry(entry.id)}
            >
              ✕
            </button>
          </span>
        </div>
        <TextInput
          id={`text-${entry.id}`}
          labelText="Text"
          hideLabel
          placeholder={entry.type === "rule" ? "One-line rule (English)" : "Conversational move"}
          value={entry.text ?? ""}
          onChange={e => updateEntry(entry.id, { text: e.target.value })}
        />
        <AutoExpandableTextarea
          maxLines={6}
          minHeight={20}
          value={(entry.examples ?? []).join("\n")}
          onChange={(text: string) =>
            updateEntry(entry.id, {
              examples: text.split("\n").filter(line => line.trim().length > 0),
            })
          }
          placeholder="Native-script examples, one per line"
          className="py-1 px-2 border border-gray-200 rounded text-sm w-full resize-none"
        />
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            className="text-sm text-gray-500 hover:text-gray-800"
            onClick={() => navigate(ROUTES.MANAGE_SCENARIO_LANGUAGES)}
          >
            ← Languages
          </button>
          <h1 className="text-2xl font-semibold mt-1">
            {language?.label ?? `Language ${languageId}`} — glossary
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Tier 0 budget (always-injected)</div>
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 bg-gray-200 rounded overflow-hidden">
                <div
                  className={`h-full ${tier0Over ? "bg-red-500" : "bg-green-600"}`}
                  style={{ width: `${tier0Pct}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {tier0Tokens.toLocaleString()} / {tier0Cap.toLocaleString()} tok
              </span>
            </div>
          </div>
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={handleConsolidate}
            disabled={isConsolidating}
            title="Turn the language judge's error annotations into proposed entries"
          >
            {isConsolidating ? "Consolidating…" : "Run consolidation"}
          </Button>
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating…" : "Generate draft glossary"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        <div className="border border-gray-200 rounded">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <span className="text-sm font-medium">Sections</span>
            <button className="text-sm text-primary-500" onClick={addSection}>
              + Add
            </button>
          </div>
          {isLoading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
          {!isLoading && views.length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              No sections yet. Generate a draft glossary or add a section.
            </div>
          )}
          {views.map(v => (
            <button
              key={v.section.sectionCode}
              className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${
                v.section.sectionCode === selectedCode ? "bg-gray-100" : ""
              }`}
              onClick={() => selectSection(v.section.sectionCode)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{v.section.title}</span>
                <Pill className={MODE_STYLES[v.section.injectionMode]}>
                  {v.section.injectionMode}
                </Pill>
              </div>
              <div className="flex items-center justify-between mt-1">
                <Pill className={STATUS_STYLES[v.section.status]}>{v.section.status}</Pill>
                <span className="text-xs text-gray-500">
                  {v.section.entries.length} entries · {v.compiledTokens} tok
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="border border-gray-200 rounded p-4">
          {!draft && (
            <div className="text-sm text-gray-500 p-4">
              Select a section on the left, or add a new one.
            </div>
          )}
          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_220px] gap-3">
                <TextInput
                  id="glossary-title"
                  labelText="Title"
                  value={draft.title}
                  onChange={e => updateDraft({ title: e.target.value })}
                  placeholder="Section title (shown to the retrieval selector)"
                />
                <TextInput
                  id="glossary-code"
                  labelText="Section code"
                  value={draft.sectionCode}
                  onChange={e => draft.isNew && updateDraft({ sectionCode: e.target.value.trim() })}
                  placeholder="e.g. clinical_terms"
                  disabled={!draft.isNew}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  Injection mode
                  <select
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    value={draft.injectionMode}
                    onChange={e =>
                      updateDraft({ injectionMode: e.target.value as GlossaryInjectionMode })
                    }
                  >
                    <option value="always">always (Tier 0, every turn)</option>
                    <option value="retrieved">retrieved (on demand)</option>
                  </select>
                </label>
                <Pill className={STATUS_STYLES[draft.status]}>{draft.status}</Pill>
                {selectedView && (
                  <span className="text-xs text-gray-500">
                    compiled: {selectedView.compiledTokens} tok · v{selectedView.section.version}
                  </span>
                )}
              </div>

              {draft.injectionMode === "retrieved" && (
                <TextInput
                  id="glossary-hint"
                  labelText="Retrieval hint (when should the agent pull this section?)"
                  value={draft.retrievalHint}
                  onChange={e => updateDraft({ retrievalHint: e.target.value })}
                  placeholder="e.g. Retrieve when the reply turns toward diagnosis, symptoms, medication"
                />
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Entries ({draft.entries.length})</span>
                  <span className="flex gap-2">
                    <Button variant={ButtonVariant.TEXT} onClick={() => addEntry("term_pair")}>
                      + Term pair
                    </Button>
                    <Button variant={ButtonVariant.TEXT} onClick={() => addEntry("rule")}>
                      + Rule
                    </Button>
                    <Button variant={ButtonVariant.TEXT} onClick={() => addEntry("pattern")}>
                      + Pattern
                    </Button>
                  </span>
                </div>
                {draft.entries.some(e => e.type === "term_pair") && (
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-gray-500 px-1">
                    <span>English</span>
                    <span>Say (colloquial)</span>
                    <span>Avoid (literary)</span>
                    <span />
                  </div>
                )}
                <div className="space-y-2">{draft.entries.map(renderEntryEditor)}</div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <Button
                  variant={ButtonVariant.PRIMARY}
                  onClick={handleSave}
                  disabled={isSaving || !dirty}
                >
                  {isSaving ? "Saving…" : "Save"}
                </Button>
                {!draft.isNew && draft.status !== "published" && (
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    onClick={handlePublish}
                    disabled={isPublishing || dirty}
                    title={dirty ? "Save changes before publishing" : ""}
                  >
                    {isPublishing ? "Publishing…" : "Publish"}
                  </Button>
                )}
                {!draft.isNew && draft.status === "published" && (
                  <Button variant={ButtonVariant.SECONDARY} onClick={() => setConfirmArchive(true)}>
                    Archive
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Archive section?"
        description="The section stops being served to agents immediately. It can be re-published later."
        primaryButton={{
          label: "Archive",
          onClick: handleArchive,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{ label: "Cancel", onClick: () => setConfirmArchive(false) }}
      />
    </div>
  );
};

export default LanguageGlossary;
