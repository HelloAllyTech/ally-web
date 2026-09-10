import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KbDocumentSourceType, KbDocumentStatus } from "@types";

/**
 * Saving a document's organisations.
 *
 * Three behaviours here are worth pinning because each one is invisible when wrong:
 *
 *  - Retargeting is sent ONLY when the audience actually changed. A no-op save otherwise sweeps
 *    every chunk of a 300-page book to write the same values back.
 *  - The panel stays OPEN when the index update fails. Closing reads as success, and this is the
 *    one save here that can leave Postgres and the vector index disagreeing.
 *  - A document made global sends an EMPTY organisation list, not the ids that were on screen.
 *    Stale ids are harmless while it is global and wrong the moment it stops being.
 */
vi.mock("@constants", () => ({
  DOCUMENT_MAX_PASTE_CHARS: 200000,
  FILE_SIZE_LIMITS: { DOCUMENT: 25 * 1024 * 1024 },
  ACCEPT_ATTRIBUTES: { PDF: "", DOCX: "", EPUB: "" },
  DOCUMENT_UPLOAD_FORMATS: {
    pdf: { mime: "application/pdf", extensions: [".pdf"] },
    docx: { mime: "docx", extensions: [".docx"] },
    epub: { mime: "application/epub+zip", extensions: [".epub"] },
  },
  en: {
    common: { save: "Save", cancel: "Cancel" },
    whatsappBot: {
      corpus: {
        create: "Add document",
        edit: "Edit document",
        titleLabel: "Title",
        titlePlaceholder: "Title",
        sourceTypeLabel: "Source",
        sourceTypeLocked: "Locked",
        sourceType: { paste: "Text", pdf: "PDF", docx: "Word", epub: "EPUB", url: "URL" },
        textLabel: "Text",
        textPlaceholder: "Paste",
        textTooLong: "Too long",
        uploadLabel: "File",
        urlLabel: "URL",
        urlPlaceholder: "https://",
        invalidUrl: "Invalid URL",
        languageLabel: "Language",
        languageHelp: "Blank to detect",
        audienceLabel: "Available to",
        audienceHelp: "Who can get answers.",
        audienceAll: "All organisations",
        audienceSpecific: "Specific organisations",
        audiencePickLabel: "Organisations",
        audiencePickPlaceholder: "Search",
        audienceNoneWarning: "No organisations selected.",
        audienceSaved: "Organisations updated",
        audienceIndexFailed: "Index not updated",
        created: "Document added",
        updated: "Document updated",
        contentUnchanged: "Unchanged",
        saveFailed: "Could not save",
        validationTitle: "A title is required",
        validationBody: "Add some text",
      },
    },
  },
}));

const setAudienceSpy = vi.fn();
const updateDocumentSpy = vi.fn();
const createDocumentSpy = vi.fn();

vi.mock("@api", () => ({
  useCreateKbDocumentMutation: () => [createDocumentSpy, { isLoading: false }],
  useUpdateKbDocumentMutation: () => [updateDocumentSpy, { isLoading: false }],
  useReplaceKbDocumentContentMutation: () => [vi.fn(), { isLoading: false }],
  useSetKbDocumentAudienceMutation: () => [setAudienceSpy, { isLoading: false }],
  useCreateKbUploadUrlMutation: () => [vi.fn(), { isLoading: false }],
  useGetTenantsQuery: () => ({
    data: {
      data: [
        { id: "tenant-a", name: "Acme Health" },
        { id: "tenant-b", name: "Beacon Care" },
      ],
    },
  }),
}));

const closeSpy = vi.fn();

vi.mock("@components", () => ({
  EntityField: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  // Exposes the save affordance so the save path can actually be exercised.
  EntitySidePanel: ({
    isOpen,
    children,
    onSave,
  }: {
    isOpen: boolean;
    children?: React.ReactNode;
    onSave: () => void;
  }) =>
    isOpen ? (
      <div>
        {children}
        <button onClick={onSave}>Save</button>
      </div>
    ) : null,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: () => null,
  ContentSwitcher: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Switch: () => null,
  TextInput: () => null,
  InlineNotification: ({ title }: { title: string }) => <div role="alert">{title}</div>,
  FilterableMultiSelect: () => null,
  RadioButton: ({ labelText, value }: { labelText: string; value: string }) => (
    <span data-testid={`radio-${value}`}>{labelText}</span>
  ),
  // Renders the two choices and lets a test pick one, which is the only interaction that
  // matters here.
  RadioButtonGroup: ({
    children,
    valueSelected,
    onChange,
  }: {
    children?: React.ReactNode;
    valueSelected: string;
    onChange: (value: string) => void;
  }) => (
    <div data-testid="audience-group" data-selected={valueSelected}>
      {children}
      <button onClick={() => onChange("all")}>Pick all</button>
      <button onClick={() => onChange("specific")}>Pick specific</button>
    </div>
  ),
}));

vi.mock("./../DocumentUploadField", () => ({
  DocumentUploadField: () => null,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const { CorpusDocumentPanel } = await import("../CorpusDocumentPanel");

const doc = (over: Record<string, unknown> = {}) => ({
  id: "doc-1",
  title: "WHO mhGAP Intervention Guide",
  sourceType: KbDocumentSourceType.PDF,
  sourceUrl: null,
  fileName: "mhgap.pdf",
  contentType: "application/pdf",
  sizeBytes: 1000,
  language: "en",
  tags: [],
  status: KbDocumentStatus.INDEXED,
  statusMessage: null,
  chunkCount: 10,
  indexedChunkCount: 10,
  isGlobal: false,
  tenantIds: ["tenant-a"],
  isArchived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  ...over,
});

describe("CorpusDocumentPanel audience", () => {
  beforeEach(() => {
    setAudienceSpy.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(doc()) });
    updateDocumentSpy.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(doc()) });
    createDocumentSpy.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(doc()) });
    closeSpy.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("does not retarget when the audience was not touched", async () => {
    render(<CorpusDocumentPanel isOpen document={doc() as never} onClose={closeSpy} />);

    await userEvent.click(screen.getByText("Save"));

    expect(updateDocumentSpy).toHaveBeenCalled();
    expect(setAudienceSpy).not.toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it("clears the organisations when the document is made global", async () => {
    render(<CorpusDocumentPanel isOpen document={doc() as never} onClose={closeSpy} />);

    await userEvent.click(screen.getByText("Pick all"));
    await userEvent.click(screen.getByText("Save"));

    expect(setAudienceSpy).toHaveBeenCalledWith({
      id: "doc-1",
      isGlobal: true,
      tenantIds: [],
    });
  });

  it("stays open and says what happened when the index update fails", async () => {
    setAudienceSpy.mockReturnValue({
      unwrap: () => Promise.reject(new Error("weaviate is down")),
    });

    render(<CorpusDocumentPanel isOpen document={doc() as never} onClose={closeSpy} />);

    await userEvent.click(screen.getByText("Pick all"));
    await userEvent.click(screen.getByText("Save"));

    expect(toastError).toHaveBeenCalledWith("Index not updated");
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("starts a new document targeted at nobody rather than everybody", () => {
    // The permissive outcome must not be the one you get by not reading the form.
    render(<CorpusDocumentPanel isOpen document={null} onClose={closeSpy} />);

    expect(screen.getByTestId("audience-group").dataset.selected).toBe("specific");
    expect(screen.getByRole("alert").textContent).toBe("No organisations selected.");
  });
});
