import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RoleplayItemPlayer } from "../RoleplayItemPlayer";
import {
  StartRoleplayItemPayload,
  TrackDetailItem,
  TrackItemStatus,
  TrackItemType,
} from "../../../../../types/tracks";

const { mockStartSimulation } = vi.hoisted(() => ({ mockStartSimulation: vi.fn() }));

const mockUseGetScenarioQuery = vi.fn();
const mockUseGetScenariosQuery = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@api", () => ({
  useGetScenarioQuery: (args: any, opts: any) => mockUseGetScenarioQuery(args, opts),
  useGetScenarioCaseDetailsQuery: () => ({ data: undefined }),
  useGetScenariosQuery: (args: any, opts: any) => {
    const result = mockUseGetScenariosQuery(args);
    return opts?.selectFromResult ? opts.selectFromResult(result ?? {}) : result;
  },
}));

vi.mock("@assets", () => ({
  ArrowDownFilled: () => <span data-testid="arrow-down" />,
  PlayIcon: () => <span data-testid="play-icon" />,
  Refresh: () => <span data-testid="refresh-icon" />,
  TickGreenBackground: () => <span data-testid="tick-icon" />,
}));

/**
 * Faithful stand-in for the real ScenarioCard: the blurb is plain text clamped
 * to two lines, and trigger warnings take its place entirely when present.
 * Neither path can show the learner the full challenge description.
 */
vi.mock("@components", () => ({
  ScenarioCard: ({ title, description, triggerWarnings }: any) => (
    <div data-testid="scenario-card">
      <div>{title}</div>
      {triggerWarnings?.length > 0 ? (
        <div data-testid="card-trigger-warnings">warnings</div>
      ) : (
        <div data-testid="card-blurb">{description}</div>
      )}
    </div>
  ),
}));

vi.mock("@hooks", () => ({
  useStartSimulation: () => ({ startSimulation: mockStartSimulation, isStarting: false }),
}));

vi.mock("@utils", () => ({
  getFormattedDateTime: () => "Jan 1, 2026",
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  RichTextRenderer: ({ content }: any) => <div data-testid="rich-text">{content}</div>,
  DropdownField: ({ options, value, onChange, label }: any) => (
    <select
      aria-label={label || "language"}
      data-testid="language-dropdown"
      value={value}
      onChange={e => onChange?.(e.target.value)}
    >
      {options?.map((option: string) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("../RoleplaySessionLogPanel", () => ({
  RoleplaySessionLogPanel: () => <div data-testid="session-log-panel" />,
}));

const ENGLISH = { value: "en-IN", label: "English (India)", language_id: 1 };
const HINDI = { value: "hi-IN", label: "Hindi (India)", language_id: 2 };

const CHALLENGE_DESCRIPTION =
  "<p>You are taking a call from a distressed parent whose teenager has run away.</p>";

const payload: StartRoleplayItemPayload = {
  type: TrackItemType.ROLEPLAY,
  trackItemProgressId: "progress-1",
  scenarioId: 123,
  completionCriteria: null,
  lastScenarioSessionId: null,
};

const buildItem = (description: string | null): TrackDetailItem => ({
  id: "item-1",
  type: TrackItemType.ROLEPLAY,
  order: 1,
  title: "Runaway teenager",
  description,
  scenarioId: 123,
  caseId: null,
  completionCriteria: null,
  contentMeta: null,
  status: TrackItemStatus.UNLOCKED,
  startedAt: null,
  completedAt: null,
  score: null,
  attemptCount: null,
  maxWatchedPct: null,
});

const mockScenario = (overrides: Record<string, unknown> = {}) => {
  mockUseGetScenarioQuery.mockReturnValue({
    data: {
      id: 123,
      title: "Runaway teenager",
      description: CHALLENGE_DESCRIPTION,
      coverImageUrl: "cover.jpg",
      ...overrides,
    },
  });
};

const mockCatalogLanguages = (languages: (typeof ENGLISH)[] | undefined) => {
  mockUseGetScenariosQuery.mockReturnValue({
    data: languages
      ? { data: [{ id: 123, availableLanguages: languages.map(lang => ({ ...lang })) }] }
      : undefined,
  });
};

const renderPlayer = (item: TrackDetailItem = buildItem(null)) =>
  render(
    <RoleplayItemPlayer payload={payload} item={item} trackId="track-1" alreadyCompleted={false} />,
  );

describe("RoleplayItemPlayer — challenge description", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScenario();
    mockCatalogLanguages(undefined);
  });

  it("shows the full challenge description even when the track item has its own blurb", () => {
    // The card blurb prefers the (short) track-item description, so the
    // scenario's actual brief was nowhere on the pre-launch screen.
    renderPlayer(buildItem("Short item blurb"));

    expect(screen.getByTestId("rich-text")).toHaveTextContent(CHALLENGE_DESCRIPTION);
  });

  it("shows the challenge description when trigger warnings take over the card", () => {
    mockScenario({ triggerWarnings: [{ id: 1, name: "Self harm" }] });

    renderPlayer();

    expect(screen.getByTestId("card-trigger-warnings")).toBeInTheDocument();
    expect(screen.getByTestId("rich-text")).toHaveTextContent(CHALLENGE_DESCRIPTION);
  });
});

describe("RoleplayItemPlayer — language selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScenario();
    mockCatalogLanguages([ENGLISH, HINDI]);
  });

  it("offers the roleplay's languages, defaulting to the first", async () => {
    renderPlayer();

    await waitFor(() => expect(screen.getByTestId("language-dropdown")).toHaveValue(ENGLISH.label));
  });

  it("starts the simulation in the language the learner picked", async () => {
    renderPlayer();

    const dropdown = await screen.findByTestId("language-dropdown");
    fireEvent.change(dropdown, { target: { value: HINDI.label } });
    await waitFor(() => expect(dropdown).toHaveValue(HINDI.label));

    fireEvent.click(screen.getByText("Start roleplay"));

    await waitFor(() =>
      expect(mockStartSimulation).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            scenarioId: 123,
            trackItemProgressId: "progress-1",
            languageId: HINDI.language_id,
          }),
        }),
      ),
    );
  });

  it("renders no picker when the roleplay offers no languages", () => {
    mockCatalogLanguages(undefined);

    renderPlayer();

    expect(screen.queryByTestId("language-dropdown")).not.toBeInTheDocument();
  });
});
