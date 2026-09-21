import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Bulk upload.
 *
 * Four behaviours are pinned, and each one is about not lying to the admin about who the bot can
 * now talk to: unreadable lines are shown before anything is sent, the per-row result replaces
 * the form rather than sitting under it, conflicts are reported instead of applied, and the
 * "upload again, moving the conflicts" retry re-sends the SAME rows the admin just read.
 */
// `@constants` is mocked wholesale, like every other admin test here: importing the real barrel
// runs module-load-time work (SimulationCreator's table config) that has no place in a unit test
// and throws before the component is even reached.
vi.mock("@constants", () => ({
  en: {
    common: { cancel: "Cancel" },
    whatsappBot: {
      phoneMappings: {
        bulkHeading: "Upload numbers",
        bulkSubtitle: "One number per line.",
        bulkPasteLabel: "Numbers",
        bulkPastePlaceholder: "919876543210, Acme Health, Priya",
        bulkExample: "Example:",
        bulkChooseFile: "Choose a CSV file",
        bulkFileHint: "A .csv or .txt file fills the box below.",
        bulkDefaultOrganisationLabel: "Organisation for lines that do not name one",
        bulkOverwriteLabel: "Move numbers that already belong to another organisation",
        bulkOverwriteHelp: "Off by default.",
        bulkSubmit: (count: number) => `Upload ${count} number${count === 1 ? "" : "s"}`,
        bulkParsingProblems: (count: number) =>
          `${count} line${count === 1 ? "" : "s"} could not be read and will not be uploaded:`,
        bulkNothingToUpload: "Nothing to upload yet",
        bulkFailed: "The upload failed. Nothing was saved.",
        bulkSummary: "Upload finished",
        bulkOutcome: {
          created: "Added",
          updated: "Moved",
          unchanged: "Already there",
          conflict: "Belongs to another organisation",
          invalid: "Could not be used",
          duplicate: "Repeated in this file",
        },
        bulkResultsHeading: "Lines that need attention",
        bulkAllGood: "Every line was accepted.",
        bulkRetryWithOverwrite: "Upload again, moving the conflicts",
        bulkClose: "Done",
        organisationLabel: "Organisation",
        validationOrganisation: "Pick an organisation",
      },
    },
  },
}));

const bulkCreateSpy = vi.fn();

vi.mock("@api", () => ({
  useBulkCreateWaPhoneMappingsMutation: () => [bulkCreateSpy, { isLoading: false }],
  useGetTenantsQuery: () => ({
    data: {
      data: [
        { id: "tenant-a", name: "Acme Health" },
        { id: "tenant-b", name: "Beacon Care" },
      ],
    },
  }),
}));

vi.mock("@components", () => ({
  EntityField: ({ label, children }: { label: string; children?: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
  EntitySidePanel: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary" },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="numbers"
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  ),
  InlineNotification: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div role="alert">
      {title}
      {subtitle ? ` ${subtitle}` : ""}
    </div>
  ),
  CarbonDropdown: ({
    items,
    onChange,
  }: {
    items: { id: string; label: string }[];
    onChange: (data: { selectedItem: { id: string } }) => void;
  }) => (
    <select
      aria-label="organisation"
      onChange={event => onChange({ selectedItem: { id: event.target.value } })}
    >
      <option value="">none</option>
      {items.map(item => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  ),
  CarbonToggle: ({ labelText }: { labelText: string }) => <span>{labelText}</span>,
}));

const { PhoneMappingBulkPanel } = await import("../PhoneMappingBulkPanel");
const { en } = await import("@constants");

const strings = en.whatsappBot.phoneMappings;

const result = (over: Record<string, unknown> = {}) => ({
  created: 0,
  updated: 0,
  unchanged: 0,
  conflicts: 0,
  invalid: 0,
  duplicates: 0,
  results: [],
  ...over,
});

describe("PhoneMappingBulkPanel", () => {
  beforeEach(() => {
    bulkCreateSpy.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(result()) });
  });

  /**
   * `fireEvent.change` rather than `userEvent.paste`: the panel's textarea is a controlled
   * component and paste needs clipboard plumbing jsdom does not provide, while what is under
   * test is the parse-and-report behaviour, not the keystrokes.
   */
  const paste = (text: string) =>
    fireEvent.change(screen.getByLabelText("numbers"), { target: { value: text } });

  it("will not upload until an organisation covers the lines that name none", async () => {
    // Otherwise the server rejects every row for the same reason and the admin has to read 200
    // identical failures to learn one thing.
    render(<PhoneMappingBulkPanel isOpen onClose={vi.fn()} />);
    paste("919876543210");

    await userEvent.click(screen.getByText(strings.bulkSubmit(1)));

    expect(bulkCreateSpy).not.toHaveBeenCalled();
  });

  it("uploads with the chosen default organisation", async () => {
    render(<PhoneMappingBulkPanel isOpen onClose={vi.fn()} />);
    paste("919876543210\n919876500000");
    await userEvent.selectOptions(screen.getByLabelText("organisation"), "tenant-a");

    await userEvent.click(screen.getByText(strings.bulkSubmit(2)));

    expect(bulkCreateSpy).toHaveBeenCalledWith({
      rows: [{ phone: "919876543210" }, { phone: "919876500000" }],
      defaultTenantId: "tenant-a",
    });
  });

  it("shows unreadable lines before anything is sent", async () => {
    // Only the browser knows which line said "Acme Helth" — a server rejection can only say the
    // organisation does not exist.
    render(<PhoneMappingBulkPanel isOpen onClose={vi.fn()} />);
    paste("919876543210, Acme Health\n919876500000, Acme Helth");

    expect(screen.getByText(strings.bulkParsingProblems(1))).toBeInTheDocument();
    // The good line is still offered — one bad line must not throw away the rest.
    expect(screen.getByText(strings.bulkSubmit(1))).toBeInTheDocument();
  });

  it("replaces the form with the per-row result", async () => {
    bulkCreateSpy.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          result({
            created: 1,
            conflicts: 1,
            results: [
              { line: 1, phone: "919876543210", outcome: "created", reason: null },
              {
                line: 2,
                phone: "919876500000",
                outcome: "conflict",
                reason: "Already mapped to Beacon Care",
              },
            ],
          }),
        ),
    });

    render(<PhoneMappingBulkPanel isOpen onClose={vi.fn()} />);
    paste("919876543210\n919876500000");
    await userEvent.selectOptions(screen.getByLabelText("organisation"), "tenant-a");
    await userEvent.click(screen.getByText(strings.bulkSubmit(2)));

    // The conflict is named with its line, and the form is gone so the same list cannot be
    // uploaded twice by accident.
    expect(screen.getByText("Already mapped to Beacon Care")).toBeInTheDocument();
    expect(screen.queryByLabelText("numbers")).not.toBeInTheDocument();
    // The created row needs no line-by-line reading, so it is not in the attention list.
    expect(screen.queryByText("919876543210")).not.toBeInTheDocument();
  });

  it("offers the overwrite retry only when there are conflicts, and re-sends the same rows", async () => {
    bulkCreateSpy.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          result({
            conflicts: 1,
            results: [
              {
                line: 1,
                phone: "919876543210",
                outcome: "conflict",
                reason: "Already mapped to Beacon Care",
              },
            ],
          }),
        ),
    });

    render(<PhoneMappingBulkPanel isOpen onClose={vi.fn()} />);
    paste("919876543210");
    await userEvent.selectOptions(screen.getByLabelText("organisation"), "tenant-a");
    await userEvent.click(screen.getByText(strings.bulkSubmit(1)));

    await userEvent.click(screen.getByText(strings.bulkRetryWithOverwrite));

    expect(bulkCreateSpy).toHaveBeenLastCalledWith({
      rows: [{ phone: "919876543210" }],
      defaultTenantId: "tenant-a",
      overwriteConflicts: true,
    });
  });

  it("does not offer the overwrite retry when nothing conflicted", async () => {
    bulkCreateSpy.mockReturnValue({
      unwrap: () => Promise.resolve(result({ created: 1 })),
    });

    render(<PhoneMappingBulkPanel isOpen onClose={vi.fn()} />);
    paste("919876543210");
    await userEvent.selectOptions(screen.getByLabelText("organisation"), "tenant-a");
    await userEvent.click(screen.getByText(strings.bulkSubmit(1)));

    expect(screen.getByText(strings.bulkAllGood)).toBeInTheDocument();
    expect(screen.queryByText(strings.bulkRetryWithOverwrite)).not.toBeInTheDocument();
  });
});
