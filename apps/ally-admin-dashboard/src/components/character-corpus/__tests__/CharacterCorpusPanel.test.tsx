import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KbCharacterTopic, KbCorpus, KbDocumentStatus } from "@types";

/**
 * What matters here is the CORPUS SCOPE and the copy around an empty search.
 *
 * The scope, because every query this panel makes must be the character corpus: asking without
 * it would list the WhatsApp bot's clinical guidance inside the character library, which looks
 * entirely plausible on screen and is completely wrong.
 *
 * The empty-search copy, because a curator's real question is "will a gap make the agent make
 * something up?" — and the honest answer, which the agent's tool contract actually implements,
 * is that it is told the corpus has nothing and must not invent a source. Saying only "no
 * results" would leave the useful half unsaid.
 */

vi.mock("@constants", () => ({
  en: {
    // The delete confirmation reuses the shared cancel label.
    common: { cancel: "Cancel" },
    characterCorpus: {
      trigger: "Reference corpus",
      title: "Reference corpus",
      subtitle: "Material the interview agent draws on.",
      empty: "Nothing here yet",
      emptyBody: "Add a handbook or a case account.",
      add: "Add material",
      topicsHelp: "Which parts of a character this helps with.",
      topicsFailed: "Couldn't save that",
      preview: "Try a search",
      previewHelp: "Ask what the agent would ask.",
      previewPlaceholder: "e.g. how does dementia change speech?",
      previewRun: "Search",
      previewEmpty:
        "Nothing matched at this floor — the agent would be told so, and would not invent a source.",
      previewEmptyTryFloor:
        "Nothing matched at the default floor. Try a lower floor before concluding the corpus is missing this.",
      floor: "Match floor",
      archive: "Archive",
      unarchive: "Restore",
      archiveFailed: "Couldn't archive that",
      remove: "Delete",
      removeFailed: "Couldn't delete that",
      removeConfirmTitle: "Delete this material?",
      removeConfirmBody: "The document and its passages go for good.",
      previewFailed: "The search failed",
      score: "match",
      indexed: "Indexed",
      failed: "Failed",
      passages: "Passages",
    },
  },
  DOCUMENT_MAX_PASTE_CHARS: 200000,
  FILE_SIZE_LIMITS: { DOCUMENT: 25 * 1024 * 1024 },
  ACCEPT_ATTRIBUTES: { PDF: "", DOCX: "", EPUB: "" },
  DOCUMENT_UPLOAD_FORMATS: {},
}));

const documentsSpy = vi.fn();
const statsSpy = vi.fn();
const searchSpy = vi.fn();
const updateSpy = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

let searchResult: { data?: { passages: unknown[] }; isError?: boolean } = {};

const DOCUMENT = {
  id: "doc-1",
  corpus: KbCorpus.CHARACTER_LIBRARY,
  characterTopics: [KbCharacterTopic.SPEECH_AND_LANGUAGE],
  title: "Living With Early-Stage Dementia",
  status: KbDocumentStatus.INDEXED,
  statusMessage: null,
  indexedChunkCount: 7,
  chunkCount: 7,
};

// A vi.mock factory replaces the WHOLE module, so every hook the panel reaches — including
// ones it only uses on a card action — has to be listed or the render throws. This exact
// omission is what put ally-web master red for four hours today, in NavSideBar.
const archiveSpy = vi.fn();
const unarchiveSpy = vi.fn();
const deleteSpy = vi.fn();

vi.mock("@api", () => ({
  useArchiveKbDocumentMutation: () => [
    (id: string) => {
      archiveSpy(id);
      return { unwrap: () => Promise.resolve({}) };
    },
    { isLoading: false },
  ],
  useUnarchiveKbDocumentMutation: () => [
    (id: string) => {
      unarchiveSpy(id);
      return { unwrap: () => Promise.resolve({}) };
    },
    { isLoading: false },
  ],
  useDeleteKbDocumentMutation: () => [
    (id: string) => {
      deleteSpy(id);
      return { unwrap: () => Promise.resolve({ id }) };
    },
    { isLoading: false },
  ],
  useGetKbDocumentsQuery: (params: unknown, options: unknown) => {
    documentsSpy(params, options);
    return { data: { documents: [DOCUMENT], count: 1 }, isLoading: false };
  },
  useGetKbStatsQuery: (corpus: unknown, options: unknown) => {
    statsSpy(corpus, options);
    return { data: { byStatus: { indexed: 1 }, indexedChunks: 7, totalChunks: 7 } };
  },
  useSearchKbCorpusMutation: () => [
    (body: unknown) => {
      searchSpy(body);
      return { unwrap: () => Promise.resolve({ passages: [] }) };
    },
    { ...searchResult, isLoading: false, reset: vi.fn() },
  ],
  useUpdateKbDocumentMutation: () => [updateSpy, { isLoading: false }],
  useCreateKbDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useReplaceKbDocumentContentMutation: () => [vi.fn(), { isLoading: false }],
  useCreateKbUploadUrlMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@components", () => ({
  // Rendered inline by DocumentActions' delete confirmation.
  ActionConfirmationPopup: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="confirm-popup">{title}</div> : null,
  EmptyState: ({ title }: { title: string }) => <span>{title}</span>,
}));

vi.mock("@components/knowledge-corpus", () => ({
  CorpusDocumentPanel: ({ corpus }: { corpus?: string }) => (
    <div data-testid="uploader" data-corpus={corpus} />
  ),
  DocumentStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InlineNotification: ({ title }: { title: string }) => <div>{title}</div>,
  SkeletonText: () => <div>loading</div>,
}));

const { CharacterCorpusPanel } = await import("../CharacterCorpusPanel");

describe("CharacterCorpusPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchResult = {};
  });

  it("scopes every read to the character corpus", () => {
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);

    expect(documentsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ corpus: KbCorpus.CHARACTER_LIBRARY }),
      expect.anything(),
    );
    expect(statsSpy).toHaveBeenCalledWith(KbCorpus.CHARACTER_LIBRARY, expect.anything());
  });

  it("files uploads into the character corpus, not the default", () => {
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("character-corpus-add"));
    expect(screen.getByTestId("uploader").getAttribute("data-corpus")).toBe(
      KbCorpus.CHARACTER_LIBRARY,
    );
  });

  it("renders nothing at all while closed, and does not fetch", () => {
    render(<CharacterCorpusPanel isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("character-corpus-panel")).toBeNull();
    // `skip` is what keeps a closed panel off the endpoint.
    expect(documentsSpy).toHaveBeenCalledWith(expect.anything(), { skip: true });
  });

  it("searches the character corpus with the typed query", () => {
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("character-corpus-preview-input"), {
      target: { value: "how does dementia change speech?" },
    });
    fireEvent.click(screen.getByTestId("character-corpus-preview-run"));

    expect(searchSpy).toHaveBeenCalledWith({
      corpus: KbCorpus.CHARACTER_LIBRARY,
      query: "how does dementia change speech?",
    });
  });

  it("does not search a blank query", () => {
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("character-corpus-preview-input"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByTestId("character-corpus-preview-run"));
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it("points at the floor first when nothing matched at the default", () => {
    // The empty state has to distinguish "the corpus lacks this" from "the floor was too
    // tight", because single-shot similarity is brittle across phrasing and a curator cannot
    // tell the two apart. Not hypothetical: a production query returned nothing against a
    // document containing a section that answered it directly.
    searchResult = { data: { passages: [] } };
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    expect(screen.getByText(/try a lower floor/i)).toBeTruthy();
  });

  it("says what the AGENT does once the floor has been lowered", () => {
    searchResult = { data: { passages: [] } };
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("character-corpus-floor-0.00"));
    expect(screen.getByText(/would not invent a source/i)).toBeTruthy();
  });

  it("sends the chosen floor to the search, and the corpus default until one is picked", () => {
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("character-corpus-preview-input"), {
      target: { value: "how specific should a character be?" },
    });
    fireEvent.click(screen.getByTestId("character-corpus-preview-run"));
    // No minSimilarity — the first run must reflect what the agent itself would get.
    expect(searchSpy).toHaveBeenCalledWith(
      expect.not.objectContaining({ minSimilarity: expect.anything() }),
    );

    fireEvent.click(screen.getByTestId("character-corpus-floor-0.20"));
    fireEvent.click(screen.getByTestId("character-corpus-preview-run"));
    expect(searchSpy).toHaveBeenLastCalledWith(expect.objectContaining({ minSimilarity: 0.2 }));
  });

  it("offers archive and delete on every document", () => {
    // Absent from the first version: material could be added and never removed, which left two
    // documents orphaned by a failed ingest stuck in the production corpus.
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    expect(screen.getByTestId("character-corpus-archive")).toBeTruthy();
    expect(screen.getByTestId("character-corpus-delete")).toBeTruthy();
  });

  it("confirms before deleting, and archives without confirming", () => {
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId("character-corpus-archive"));
    expect(archiveSpy).toHaveBeenCalledWith("doc-1");

    fireEvent.click(screen.getByTestId("character-corpus-delete"));
    // Nothing is deleted on the first click — the popup is.
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm-popup")).toBeTruthy();
  });

  it("sends an empty topic array when the last chip is turned off", () => {
    // `[]` is a real answer — "no hint" — and must reach the server rather than being
    // read as "nothing changed".
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId(`character-corpus-topic-${KbCharacterTopic.SPEECH_AND_LANGUAGE}`),
    );
    expect(updateSpy).toHaveBeenCalledWith({ id: "doc-1", characterTopics: [] });
  });

  it("adds a topic without dropping the ones already set", () => {
    render(<CharacterCorpusPanel isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`character-corpus-topic-${KbCharacterTopic.INNER_LIFE}`));
    expect(updateSpy).toHaveBeenCalledWith({
      id: "doc-1",
      characterTopics: [KbCharacterTopic.SPEECH_AND_LANGUAGE, KbCharacterTopic.INNER_LIFE],
    });
  });
});
