import React, { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import { InlineNotification, SkeletonText } from "@ally-ui-mono/ui-shared";
import {
  useArchiveKbDocumentMutation,
  useDeleteKbDocumentMutation,
  useGetKbDocumentsQuery,
  useGetKbStatsQuery,
  useSearchKbCorpusMutation,
  useUnarchiveKbDocumentMutation,
  useUpdateKbDocumentMutation,
} from "@api";
import { ActionConfirmationPopup, EmptyState } from "@components";
import { CorpusDocumentPanel, DocumentStatusBadge } from "@components/knowledge-corpus";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { KB_IN_FLIGHT_STATUSES, KbCharacterTopic, KbCorpus, KbDocument } from "@types";

import { CHARACTER_TOPIC_OPTIONS, characterTopicLabel } from "./characterTopics";

/**
 * The character library's reference corpus, curated from inside the interview page.
 *
 * A SEPARATE SCREEN from the WhatsApp bot's Corpus tab, on purpose. They share a pipeline and a
 * data layer, and nothing else worth sharing: that tab manages clinical guidance served to
 * health workers, sorted and filtered and paginated for someone who administers a bot. This is
 * a curator adding the handful of books and case accounts that make a drafted character feel
 * like a person, in the place where they find out the drafts are thin. One UI trying to be both
 * would be worse at each. The uploader itself IS shared (`CorpusDocumentPanel`), which is how
 * format parity across paste / PDF / DOCX / EPUB / URL stays a fact rather than a promise.
 *
 * Three things it does, in the order a curator needs them:
 *
 *  1. Shows what the agent can currently draw on, and whether it is actually indexed —
 *     "uploaded" and "retrievable" are different states and only one of them helps.
 *  2. Lets material be tagged with the parts of a character it grounds. A hint, never a
 *     filter, and the copy says so: a curator who believes it restricts will under-tag.
 *  3. Lets a search be run exactly as the agent would run it, WITH THE SCORES SHOWN. That is
 *     the point of the panel rather than a nicety — the similarity floor is currently a
 *     considered guess (an unambiguous match measured 0.5056 against a floor first set at
 *     0.5), and seeing real scores against real material is how a human corrects it before
 *     there is enough traffic for a judge to.
 */

/** While anything is still extracting or indexing, re-poll — same cadence as the Corpus tab. */
const IN_FLIGHT_POLL_MS = 4000;
const PAGE_SIZE = 50;

interface CharacterCorpusPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TopicChips: React.FC<{
  document: KbDocument;
}> = ({ document }) => {
  const strings = en.characterCorpus;
  const [updateDocument, { isLoading }] = useUpdateKbDocumentMutation();
  const selected = useMemo(
    () => new Set(document.characterTopics ?? []),
    [document.characterTopics],
  );

  const toggle = useCallback(
    async (topic: KbCharacterTopic) => {
      const next = new Set(selected);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      try {
        // Sent even when empty: `[]` means "no hint", which is a choice a curator is allowed
        // to make and must not be read as "unchanged".
        await updateDocument({
          id: document.id,
          characterTopics: [...next],
        }).unwrap();
      } catch {
        toast.error(strings.topicsFailed);
      }
    },
    [document.id, selected, strings.topicsFailed, updateDocument],
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {CHARACTER_TOPIC_OPTIONS.map(({ id, label, hint }) => {
        const on = selected.has(id);
        return (
          <button
            key={id}
            type="button"
            title={hint}
            // Named explicitly: with only a `title` and text content, the accessibility tree
            // announced the HINT ("Register, dialect, code-mixing…") as the button's name
            // instead of the label, which reads as five unrelated sentences rather than a set
            // of toggles. Caught by reading the tree during browser testing, not visible on
            // screen at all.
            aria-label={label}
            disabled={isLoading}
            onClick={() => toggle(id)}
            aria-pressed={on}
            data-testid={`character-corpus-topic-${id}`}
            className={`rounded-full px-2.5 py-1 text-xs border transition-colors disabled:opacity-50 ${
              on
                ? "bg-primary-50 border-primary-500 text-primary-700"
                : "bg-white border-border-200 text-typography-600 hover:border-border-400"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Archive and delete, on every document.
 *
 * Absent from the first version of this panel, which meant material could be added and never
 * removed — and that is not a cosmetic gap. Two documents orphaned by a failed ingest sat in
 * the production corpus with no way to clear them from the UI at all.
 *
 * Archive is the normal action and is offered first: it deletes the vectors so the agent stops
 * retrieving the material, while keeping the row and its chunks so any citation already
 * recorded still resolves to the passage that was actually quoted. Delete is for material that
 * should never have been here — a mistake, a test, an orphan — and is confirmed, because
 * nothing brings it back.
 */
const DocumentActions: React.FC<{ document: KbDocument }> = ({ document }) => {
  const strings = en.characterCorpus;
  const [confirming, setConfirming] = useState(false);
  const [archive, { isLoading: archiving }] = useArchiveKbDocumentMutation();
  const [unarchive, { isLoading: unarchiving }] = useUnarchiveKbDocumentMutation();
  const [remove, { isLoading: removing }] = useDeleteKbDocumentMutation();
  const busy = archiving || unarchiving || removing;

  const onArchive = useCallback(async () => {
    try {
      await (document.isArchived ? unarchive(document.id) : archive(document.id)).unwrap();
    } catch {
      toast.error(strings.archiveFailed);
    }
  }, [archive, document.id, document.isArchived, strings.archiveFailed, unarchive]);

  const onRemove = useCallback(async () => {
    try {
      await remove(document.id).unwrap();
      setConfirming(false);
    } catch {
      toast.error(strings.removeFailed);
    }
  }, [document.id, remove, strings.removeFailed]);

  return (
    <>
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={onArchive}
          disabled={busy}
          data-testid="character-corpus-archive"
          className="text-xs text-typography-600 underline disabled:opacity-50"
        >
          {document.isArchived ? strings.unarchive : strings.archive}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          data-testid="character-corpus-delete"
          className="text-xs text-support-error-600 underline disabled:opacity-50"
        >
          {strings.remove}
        </button>
      </div>

      <ActionConfirmationPopup
        isOpen={confirming}
        title={strings.removeConfirmTitle}
        description={strings.removeConfirmBody}
        onClose={() => setConfirming(false)}
        primaryButton={{
          label: strings.remove,
          onClick: onRemove,
          variant: ButtonVariant.DESTRUCTIVE,
          disabled: removing,
        }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setConfirming(false) }}
      />
    </>
  );
};

/**
 * The floor the preview searches at.
 *
 * Exposed because without it "nothing matched" is undiagnosable, and that is the one question
 * this tool exists to answer. A curator (or an engineer) seeing an empty result cannot tell
 * whether the corpus lacks the material or the threshold is simply too tight — and single-shot
 * cosine similarity is brittle enough across phrasing that both happen. Dropping the floor and
 * re-running answers it in one click.
 *
 * `undefined` means "use the corpus default", which is what the agent itself will use, so the
 * first run always reflects real behaviour rather than a tuned setting.
 */
const FLOOR_CHOICES: { label: string; value: number | undefined }[] = [
  { label: "Default", value: undefined },
  { label: "0.30", value: 0.3 },
  { label: "0.20", value: 0.2 },
  { label: "0.00", value: 0 },
];

const RetrievalPreview: React.FC = () => {
  const strings = en.characterCorpus;
  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState<number | undefined>(undefined);
  const [runSearch, { data, isLoading, isError, reset }] = useSearchKbCorpusMutation();

  const submit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      await runSearch({
        corpus: KbCorpus.CHARACTER_LIBRARY,
        query: trimmed,
        ...(floor === undefined ? {} : { minSimilarity: floor }),
      }).unwrap();
    } catch {
      toast.error(strings.previewFailed);
    }
  }, [query, floor, runSearch, strings.previewFailed]);

  const passages = data?.passages ?? [];
  const hasRun = Boolean(data) || isError;

  return (
    <div className="border-t border-border-200 pt-4 mt-4">
      <p className="text-sm text-typography-900 font-medium">{strings.preview}</p>
      <p className="text-xs text-typography-500 mt-0.5">{strings.previewHelp}</p>

      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={query}
          placeholder={strings.previewPlaceholder}
          data-testid="character-corpus-preview-input"
          onChange={event => {
            setQuery(event.target.value);
            if (hasRun) reset();
          }}
          onKeyDown={event => {
            if (event.key === "Enter") submit();
          }}
          className="flex-1 min-w-0 rounded border border-border-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!query.trim() || isLoading}
          data-testid="character-corpus-preview-run"
          className="shrink-0 rounded bg-primary-500 text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          {strings.previewRun}
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-typography-500">{strings.floor}</span>
        {FLOOR_CHOICES.map(choice => (
          <button
            key={choice.label}
            type="button"
            data-testid={`character-corpus-floor-${choice.label}`}
            onClick={() => {
              setFloor(choice.value);
              if (hasRun) reset();
            }}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              floor === choice.value
                ? "border-primary-500 text-primary-600 bg-primary-50"
                : "border-border-200 text-typography-600"
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>

      {isLoading && <SkeletonText className="mt-3" />}

      {hasRun && !isLoading && !passages.length && (
        // Says what the AGENT would do, not just that the search was empty — the whole
        // question a curator has here is whether a gap makes the agent invent.
        <InlineNotification
          kind="info"
          title={floor === undefined ? strings.previewEmptyTryFloor : strings.previewEmpty}
          className="mt-3"
        />
      )}

      {!isLoading &&
        passages.map(passage => (
          <div
            key={passage.chunk_id}
            data-testid="character-corpus-preview-passage"
            className="mt-3 rounded border border-border-200 p-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-typography-700 font-medium truncate">
                {passage.document_title}
                {passage.section_path ? ` · ${passage.section_path}` : ""}
              </span>
              <span className="text-xs text-typography-500 shrink-0 tabular-nums">
                {passage.similarity.toFixed(3)} {strings.score}
              </span>
            </div>
            <p className="text-xs text-typography-600 mt-1.5 whitespace-pre-wrap">{passage.text}</p>
          </div>
        ))}
    </div>
  );
};

export const CharacterCorpusPanel: React.FC<CharacterCorpusPanelProps> = ({ isOpen, onClose }) => {
  const strings = en.characterCorpus;
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useGetKbDocumentsQuery(
    { corpus: KbCorpus.CHARACTER_LIBRARY, limit: PAGE_SIZE, offset: 0 },
    { skip: !isOpen },
  );
  const { data: stats } = useGetKbStatsQuery(KbCorpus.CHARACTER_LIBRARY, {
    skip: !isOpen,
    // Same reasoning as the Corpus tab: ally-be has no socket.io Redis adapter, so a
    // websocket would not reach every replica. This state machine settles in a minute.
    pollingInterval: IN_FLIGHT_POLL_MS,
  });

  const documents = data?.documents ?? [];
  const anyInFlight = documents.some(doc => KB_IN_FLIGHT_STATUSES.includes(doc.status));

  useGetKbDocumentsQuery(
    { corpus: KbCorpus.CHARACTER_LIBRARY, limit: PAGE_SIZE, offset: 0 },
    { skip: !isOpen || !anyInFlight, pollingInterval: IN_FLIGHT_POLL_MS },
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside
        data-testid="character-corpus-panel"
        className="fixed right-0 top-0 z-50 h-full w-full max-w-xl bg-white shadow-xl flex flex-col"
      >
        <header className="p-6 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg text-typography-900 font-secondary">{strings.title}</h2>
              <p className="text-xs text-typography-500 mt-1">{strings.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-typography-500 text-xl leading-none shrink-0"
            >
              ×
            </button>
          </div>

          {stats && (
            <div className="flex gap-4 mt-4 text-xs text-typography-600">
              <span>
                <strong className="text-typography-900">{stats.byStatus?.indexed ?? 0}</strong>{" "}
                {strings.indexed}
              </span>
              <span>
                <strong className="text-typography-900">{stats.indexedChunks ?? 0}</strong>{" "}
                {strings.passages}
              </span>
              {Boolean(stats.byStatus?.failed) && (
                <span className="text-error-600">
                  <strong>{stats.byStatus.failed}</strong> {strings.failed}
                </span>
              )}
            </div>
          )}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
          {isLoading && <SkeletonText paragraph />}

          {!isLoading && !documents.length && (
            <EmptyState
              title={strings.empty}
              subtitle={strings.emptyBody}
              actionLabel={strings.add}
              onAction={() => setAddOpen(true)}
            />
          )}

          {!isLoading && Boolean(documents.length) && (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  data-testid="character-corpus-add"
                  className="text-sm text-primary-600"
                >
                  {strings.add}
                </button>
              </div>

              <ul className="mt-2 flex flex-col gap-3">
                {documents.map(doc => (
                  <li
                    key={doc.id}
                    data-testid="character-corpus-document"
                    className="rounded border border-border-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-typography-900">{doc.title}</span>
                      <DocumentStatusBadge status={doc.status} statusMessage={doc.statusMessage} />
                    </div>
                    <p className="text-xs text-typography-500 mt-0.5">
                      {doc.indexedChunkCount} {strings.passages.toLowerCase()}
                      {doc.characterTopics?.length
                        ? ` · ${doc.characterTopics.map(characterTopicLabel).join(", ")}`
                        : ""}
                    </p>
                    <p className="text-xs text-typography-500 mt-2">{strings.topicsHelp}</p>
                    <div className="mt-1.5">
                      <TopicChips document={doc} />
                    </div>
                    <DocumentActions document={doc} />
                  </li>
                ))}
              </ul>

              <RetrievalPreview />
            </>
          )}
        </div>
      </aside>

      <CorpusDocumentPanel
        isOpen={addOpen}
        document={null}
        corpus={KbCorpus.CHARACTER_LIBRARY}
        onClose={() => setAddOpen(false)}
      />
    </>
  );
};
