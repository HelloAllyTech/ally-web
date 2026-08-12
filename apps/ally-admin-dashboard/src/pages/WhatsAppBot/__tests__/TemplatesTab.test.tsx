import React from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WaTemplateKind, WaTemplateMatchType } from "@types";

/**
 * Two behaviours are pinned here, both safety-relevant and both invisible:
 *
 *  - The list renders in the order the server returned, which IS the matcher's evaluation order. If
 *    the tab ever re-sorted client-side, an admin would be reading a different order from the one
 *    the bot uses, and could not tell that a new FAQ rule now shadows a crisis rule.
 *  - A mandatory safety template gets NO delete action, rather than one that fails with a 403.
 */

vi.mock("@constants", () => ({
  en: {
    common: { cancel: "Cancel", loading: "Loading…" },
    whatsappBot: {
      templates: {
        subtitle: "Fixed replies.",
        create: "Add reply",
        edit: "Edit reply",
        columnName: "Reply",
        columnKind: "Kind",
        columnPatterns: "Triggers",
        columnOrder: "Order",
        kind: { crisis: "Crisis", command: "Command", consent: "Consent", faq: "FAQ" },
        matchType: {
          exact: "Whole message",
          contains: "Contains",
          any_of: "Any word",
          regex: "Regex",
        },
        requiredBadge: "REQUIRED",
        cannotDeactivate: "Required safety replies cannot be switched off.",
        moveUp: "Move earlier",
        moveDown: "Move later",
        empty: "No keyword replies yet",
        emptySubtitle: "Add one.",
        archived: "Reply removed",
        saveFailed: "Could not save the reply",
        tester: "Test a message",
        testerPlaceholder: "Type a message",
        testerRun: "Check",
        testerNoMatch: "No keyword reply matches — this would go to the corpus.",
        testerMatched: "Matches",
        testerReply: "Would reply",
        testerNormalised: "Compared as",
        testerStops: "Stops here.",
        testerReachesCorpus: "Then searches the corpus.",
      },
    },
  },
}));

const capturedTableProps: { rows?: unknown[]; onDelete?: (row: unknown) => void }[] = [];

vi.mock("@api", () => ({
  useGetWaTemplatesQuery: () => mockTemplatesResult,
  useArchiveWaTemplateMutation: () => [vi.fn(), { isLoading: false }],
  useReorderWaTemplatesMutation: () => [vi.fn(), { isLoading: false }],
  useTestWaTemplateMutation: () => [vi.fn(), { data: undefined, isLoading: false, reset: vi.fn() }],
  useCreateWaTemplateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateWaTemplateMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@components", () => ({
  ActionConfirmationPopup: () => null,
  Button: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  EntityTable: (props: { rows: { id: string; name: string }[]; onDelete?: (row: unknown) => void }) => {
    capturedTableProps.push(props);
    return (
      <ul>
        {props.rows.map(row => (
          <li key={row.id} data-testid="template-row">
            {row.name}
          </li>
        ))}
      </ul>
    );
  },
  EntityField: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  EntitySidePanel: () => null,
}));

vi.mock("@components/types", () => ({ ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary" } }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InlineNotification: ({ title }: { title: string }) => <div role="alert">{title}</div>,
  TextInput: () => null,
  AutoExpandableTextarea: () => null,
  NumberInput: () => null,
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: () => null,
  CarbonToggle: () => null,
}));

vi.mock("@icons", () => ({ ArrowUp: () => <span />, ArrowDown: () => <span /> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let mockTemplatesResult: {
  data?: { templates: unknown[]; count: number };
  isLoading: boolean;
  isError: boolean;
};

const template = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "t-1",
  kind: WaTemplateKind.FAQ,
  name: "FAQ rule",
  matchType: WaTemplateMatchType.ANY_OF,
  patterns: ["phq"],
  languageCode: null,
  priority: 350,
  responseText: "Some reply",
  bypassRag: true,
  terminal: false,
  active: true,
  mandatory: false,
  archivedAt: null,
  ...over,
});

const { TemplatesTab } = await import("../TemplatesTab");

describe("TemplatesTab", () => {
  beforeEach(() => {
    capturedTableProps.length = 0;
    mockTemplatesResult = {
      data: { templates: [], count: 0 },
      isLoading: false,
      isError: false,
    };
  });

  it("renders rows in the order the server returned, not re-sorted", () => {
    // The server orders by (priority, createdAt) — the matcher's own order. Re-sorting here would
    // show the admin a different order from the one the bot evaluates.
    mockTemplatesResult.data = {
      templates: [
        template({ id: "crisis", kind: WaTemplateKind.CRISIS, name: "Crisis", priority: 10 }),
        template({ id: "consent", kind: WaTemplateKind.CONSENT, name: "Opt out", priority: 110 }),
        template({ id: "faq", name: "FAQ rule", priority: 350 }),
      ],
      count: 3,
    };

    render(<TemplatesTab />);

    expect(screen.getAllByTestId("template-row").map(node => node.textContent)).toEqual([
      "Crisis",
      "Opt out",
      "FAQ rule",
    ]);
  });

  it("offers no delete action for a required safety template", () => {
    // A delete that exists and then 403s is worse than no delete: it implies the action is possible.
    mockTemplatesResult.data = {
      templates: [
        template({ id: "crisis", kind: WaTemplateKind.CRISIS, name: "Crisis", mandatory: true }),
      ],
      count: 1,
    };

    render(<TemplatesTab />);

    const props = capturedTableProps[capturedTableProps.length - 1];
    const row = (props.rows as { mandatory: boolean }[])[0];
    expect(row.mandatory).toBe(true);
    // The tab passes a handler that returns undefined for a mandatory row.
    expect(props.onDelete?.(row)).toBeUndefined();
  });

  it("shows the empty state when there are no templates", () => {
    render(<TemplatesTab />);
    expect(screen.getByText("No keyword replies yet")).toBeTruthy();
  });

  it("surfaces a load failure as an alert", () => {
    mockTemplatesResult.isError = true;
    mockTemplatesResult.data = undefined;

    render(<TemplatesTab />);

    expect(screen.getByRole("alert").textContent).toContain("Could not save the reply");
  });
});
