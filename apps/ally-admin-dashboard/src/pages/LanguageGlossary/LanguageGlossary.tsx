import React, { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AutoExpandableTextarea, TextInput } from "@ally-ui-mono/ui-shared";
import {
  useAcceptGlossaryProposalMutation,
  useArchiveGlossarySectionMutation,
  useConsolidateLanguageGlossaryMutation,
  useGenerateLanguageGlossaryMutation,
  useGetLanguageGlossaryQuery,
  useGetLanguagesQuery,
  useGetVarietyProfilesQuery,
  usePublishGlossarySectionMutation,
  useRejectGlossaryProposalMutation,
  useUpsertGlossarySectionMutation,
} from "@api";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { ROUTES } from "@constants";
import { GlossaryInjectionMode, GlossarySectionStatus, LanguageGlossarySection } from "@types";

const MODE_STYLES: Record<GlossaryInjectionMode, string> = {
  always: "bg-purple-100 text-purple-800",
  retrieved: "bg-teal-100 text-teal-800",
};

/** Human wording for injectionMode — "always" rides in every reply's
 * instructions (token-capped); "retrieved" is pulled in only when the
 * conversation needs that vocabulary. */
const MODE_LABELS: Record<GlossaryInjectionMode, string> = {
  always: "every turn",
  retrieved: "on demand",
};

const STATUS_STYLES: Record<GlossarySectionStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-800",
  archived: "bg-yellow-100 text-yellow-800",
};

const errorMessage = (err: unknown): string => {
  const data = (err as { data?: { message?: string | string[] } })?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join("; ");
  return message ?? "Request failed";
};

/** Editable working copy of one section — title + one markdown body. */
interface SectionDraft {
  sectionCode: string;
  title: string;
  content: string;
  retrievalHint: string;
  injectionMode: GlossaryInjectionMode;
  status: GlossarySectionStatus;
  isNew: boolean;
  /** Non-null when the section is a style overlay (variety profile scoped). */
  profileId: string | null;
}

const toDraft = (section: LanguageGlossarySection): SectionDraft => ({
  sectionCode: section.sectionCode,
  title: section.title,
  content: section.content ?? "",
  retrievalHint: section.retrievalHint ?? "",
  injectionMode: section.injectionMode,
  status: section.status,
  isNew: false,
  profileId: section.profileId ?? null,
});

/** Sections are unique by (sectionCode, profileId) now that style overlays
 * share their global counterpart's code. */
const sectionKey = (s: { sectionCode: string; profileId?: string | null }) =>
  s.profileId ? `${s.sectionCode}@${s.profileId}` : s.sectionCode;

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
  const [acceptProposal] = useAcceptGlossaryProposalMutation();
  const [rejectProposal] = useRejectGlossaryProposalMutation();

  const { data: varietyProfiles } = useGetVarietyProfilesQuery(languageId, {
    skip: !Number.isFinite(languageId),
  });
  // profileId -> style name + the orgs that speak it (for overlay badges).
  const profileInfo = useMemo(() => {
    const map = new Map<string, { name: string; orgs: string[] }>();
    for (const view of varietyProfiles ?? []) {
      map.set(view.profile.id, {
        name: view.profile.name,
        orgs: view.attachments.map(a => a.tenantName ?? a.tenantId),
      });
    }
    return map;
  }, [varietyProfiles]);

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

  const selectedView = views.find(v => sectionKey(v.section) === selectedCode);
  const pendingProposals = (selectedView?.section.entries ?? []).filter(
    e => e.status === "proposed",
  );

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
      content: "",
      retrievalHint: "",
      injectionMode: "retrieved",
      status: "draft",
      isNew: true,
      profileId: null,
    });
  };

  const updateDraft = (patch: Partial<SectionDraft>) => {
    setDraft(d => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft || draft.profileId) return;
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
          content: draft.content,
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
      await publishSection({
        languageId,
        sectionCode: draft.sectionCode,
        profileId: draft.profileId,
      }).unwrap();
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
      await archiveSection({
        languageId,
        sectionCode: draft.sectionCode,
        profileId: draft.profileId,
      }).unwrap();
      setDirty(false);
      toast.success(`Section '${draft.sectionCode}' archived`);
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

  const handleConsolidate = async () => {
    try {
      const result = await consolidateGlossary(languageId).unwrap();
      if (result.annotationsConsidered === 0) {
        toast.info("No new judge error annotations to consolidate");
        return;
      }
      toast.success(
        `Consolidated ${result.annotationsConsidered} annotations into ${result.proposed} proposals (${result.skippedDuplicates} duplicates skipped)`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleProposal = async (entryId: string, accept: boolean) => {
    if (!draft || draft.isNew) return;
    if (accept && dirty) {
      toast.error("Save your content edits before accepting a proposal");
      return;
    }
    try {
      const mutate = accept ? acceptProposal : rejectProposal;
      await mutate({
        languageId,
        sectionCode: draft.sectionCode,
        entryId,
        profileId: draft.profileId,
      }).unwrap();
      setDirty(false);
      toast.success(accept ? "Proposal added to the section" : "Proposal rejected");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const tier0Tokens = data?.tier0Tokens ?? 0;
  const tier0Cap = data?.tier0TokenCap ?? 2000;
  const tier0Pct = Math.min(100, Math.round((tier0Tokens / tier0Cap) * 100));
  const tier0Over = tier0Tokens > tier0Cap * 0.9;

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
        <div className="text-right">
          <div className="text-xs text-gray-500">Every-turn budget (published sections)</div>
          <div className="flex items-center gap-2 justify-end">
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
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        <div className="border border-gray-200 rounded flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <span className="text-sm font-medium">Sections</span>
            <button className="text-sm text-primary-500" onClick={addSection}>
              + Add
            </button>
          </div>
          {isLoading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
          {!isLoading && views.length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              No sections yet. Generate a draft glossary below, or add a section by hand.
            </div>
          )}
          <div className="flex-1">
            {views.map(v => {
              const proposals = (v.section.entries ?? []).filter(
                e => e.status === "proposed",
              ).length;
              const style = v.section.profileId ? profileInfo.get(v.section.profileId) : undefined;
              return (
                <button
                  key={sectionKey(v.section)}
                  className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${
                    sectionKey(v.section) === selectedCode ? "bg-gray-100" : ""
                  }`}
                  onClick={() => selectSection(sectionKey(v.section))}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{v.section.title}</span>
                    <Pill className={MODE_STYLES[v.section.injectionMode]}>
                      {MODE_LABELS[v.section.injectionMode]}
                    </Pill>
                  </div>
                  {v.section.profileId && (
                    <div className="mt-1">
                      <Pill className="bg-indigo-100 text-indigo-800">
                        style: {style?.name ?? "variety overlay"}
                      </Pill>
                      <div
                        className="text-xs text-gray-500 truncate mt-0.5"
                        title={(style?.orgs ?? []).join(", ")}
                      >
                        used by {style?.orgs?.length ? style.orgs.join(", ") : "no orgs yet"}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="flex items-center gap-1">
                      <Pill className={STATUS_STYLES[v.section.status]}>{v.section.status}</Pill>
                      {proposals > 0 && (
                        <Pill className="bg-amber-100 text-amber-800">
                          {proposals} proposal{proposals > 1 ? "s" : ""}
                        </Pill>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">{v.compiledTokens} tok</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-3 border-t border-gray-200 flex flex-col gap-2">
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? "Generating…" : "Generate draft glossary"}
            </Button>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={handleConsolidate}
              disabled={isConsolidating}
              className="w-full"
              title="Turn the language judge's error annotations into proposals"
            >
              {isConsolidating ? "Consolidating…" : "Run consolidation"}
            </Button>
          </div>
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
                  Used
                  <select
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    value={draft.injectionMode}
                    onChange={e =>
                      updateDraft({ injectionMode: e.target.value as GlossaryInjectionMode })
                    }
                    title="Every turn: part of the agent's standing instructions on every reply (counts against the token budget). On demand: pulled in only when the conversation needs this vocabulary."
                  >
                    <option value="always">every turn (core style rules)</option>
                    <option value="retrieved">on demand (when relevant)</option>
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
                  labelText="When should this be pulled in? (guides the on-demand lookup)"
                  value={draft.retrievalHint}
                  onChange={e => updateDraft({ retrievalHint: e.target.value })}
                  placeholder="e.g. Retrieve when the reply turns toward diagnosis, symptoms, medication"
                />
              )}

              <div>
                <div className="text-sm text-gray-600 mb-1">
                  Content (markdown — served to the agent as written)
                </div>
                <AutoExpandableTextarea
                  maxLines={30}
                  minHeight={200}
                  value={draft.content}
                  onChange={(text: string) => updateDraft({ content: text })}
                  placeholder={
                    '- worry: say "டென்ஷன்" (avoid: "பதட்டம்")\n- Always use colloquial spoken forms.\n  e.g. சாப்டீங்களா? (not சாப்பிட்டீர்களா?)'
                  }
                  className="w-full border border-gray-200 rounded p-3 text-sm font-mono resize-none"
                />
              </div>

              {pendingProposals.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded p-3 space-y-2">
                  <div className="text-sm font-medium text-amber-900">
                    Proposals from the language judge ({pendingProposals.length})
                  </div>
                  {pendingProposals.map(proposal => (
                    <div
                      key={proposal.id}
                      className="flex items-start justify-between gap-3 bg-white border border-amber-200 rounded p-2"
                    >
                      <pre className="text-sm whitespace-pre-wrap flex-1 font-sans">
                        {proposal.markdown}
                      </pre>
                      <span className="flex gap-2 shrink-0">
                        <button
                          className="text-sm text-green-700 underline"
                          onClick={() => handleProposal(proposal.id, true)}
                        >
                          Accept
                        </button>
                        <button
                          className="text-sm text-red-700 underline"
                          onClick={() => handleProposal(proposal.id, false)}
                        >
                          Reject
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {draft.profileId && (
                <div className="text-xs text-gray-500 border border-indigo-100 bg-indigo-50 rounded p-2">
                  Style overlay — written by the consolidation loop for{" "}
                  {profileInfo.get(draft.profileId)?.name ?? "a variety profile"} (used by{" "}
                  {(profileInfo.get(draft.profileId)?.orgs ?? []).join(", ") || "no orgs yet"}).
                  Review its proposals here; content edits and publish/archive apply to the global
                  section only.
                </div>
              )}
              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <Button
                  variant={ButtonVariant.PRIMARY}
                  onClick={handleSave}
                  disabled={isSaving || !dirty || Boolean(draft.profileId)}
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
