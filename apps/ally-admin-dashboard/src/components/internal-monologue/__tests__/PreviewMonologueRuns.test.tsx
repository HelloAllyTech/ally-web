// Admin previews are ephemeral everywhere else in the platform: no session row
// exists for them and every ingest processor drops `preview-%`. These rows are
// the only record, so what this browser does with an empty list, a run that
// recorded nothing, and a run still in flight is the whole feature — a curator
// who cannot tell those three apart learns nothing from the screen.

import "@constants";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@api", async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useGetPreviewMonologuesQuery: vi.fn(),
    useGetScenarioLanguagesQuery: vi.fn(),
    useLazyGetPreviewMonologueRunQuery: vi.fn(),
  };
});

import * as api from "@api";
import { en } from "@constants";

import { PreviewMonologueRuns } from "../PreviewMonologueRuns";

const RUN = {
  id: "run-1",
  roomName: "preview-450-abc",
  scenarioId: 450,
  scenarioVersionId: null,
  languageId: 6,
  startedByUserId: 12,
  startedByName: "Gopi",
  startedAt: new Date().toISOString(),
  endedAt: new Date().toISOString(),
  turnCount: 3,
};

const TURN = {
  type: "monologue.turn" as const,
  turn: 1,
  counsellorSaid: "How have you been sleeping?",
  clientSaid: "Fine.",
  stanceFrom: null,
  stanceTo: "Guarded",
  turnsInStance: 1,
  arc: ["Guarded", "Honest sharing"],
  score: 10,
  affect: "wary",
  appraisal: "He is being kind but I do not know him.",
  register: "clipped",
  disclosed: [],
  withheld: [],
  threadsOpened: [],
  threadsClosed: [],
  recalled: [],
  retrieveCues: [],
  events: [],
  sections: {},
  missed: false,
  updatesMissed: 0,
};

const mockList = (overrides: Record<string, unknown> = {}) => {
  (api.useGetPreviewMonologuesQuery as any).mockReturnValue({
    data: [RUN],
    isLoading: false,
    isError: false,
    ...overrides,
  });
};

const mockRun = (data: unknown = { ...RUN, turns: [TURN] }) => {
  const trigger = vi.fn();
  (api.useLazyGetPreviewMonologueRunQuery as any).mockReturnValue([
    trigger,
    { data, isFetching: false },
  ]);
  return trigger;
};

describe("PreviewMonologueRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.useGetScenarioLanguagesQuery as any).mockReturnValue({
      data: [{ id: 6, label: "Tamil", value: "ta" }],
    });
    mockList();
    mockRun();
  });

  it("renders nothing while closed", () => {
    const { container } = render(
      <PreviewMonologueRuns scenarioId={450} isOpen={false} onClose={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("opens on the newest run rather than an empty pane", async () => {
    const trigger = mockRun();

    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    await waitFor(() => expect(trigger).toHaveBeenCalledWith({ runId: "run-1" }));
    expect(screen.queryByText(en.previewMonologueRuns.pickRun)).not.toBeInTheDocument();
  });

  it("names the language and who ran it, so two runs can be told apart", () => {
    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    expect(screen.getByText(/Tamil/)).toBeInTheDocument();
    expect(screen.getByText(/by Gopi/)).toBeInTheDocument();
    expect(screen.getByText(/3 turns/)).toBeInTheDocument();
  });

  it("says a run is still going rather than reporting zero turns", () => {
    (api.useGetPreviewMonologuesQuery as any).mockReturnValue({
      data: [{ ...RUN, endedAt: null, turnCount: 0 }],
      isLoading: false,
      isError: false,
    });

    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    expect(screen.getByText(new RegExp(en.previewMonologueRuns.inProgress))).toBeInTheDocument();
  });

  it("explains an empty history instead of showing a bare blank", () => {
    (api.useGetPreviewMonologuesQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    expect(screen.getByText(en.previewMonologueRuns.empty)).toBeInTheDocument();
  });

  it("names a failed load rather than looking like no runs exist", () => {
    (api.useGetPreviewMonologuesQuery as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    expect(screen.getByText(en.previewMonologueRuns.failed)).toBeInTheDocument();
  });

  it("renders the selected run through the same panel the live preview uses", () => {
    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    expect(screen.getByText(/How have you been sleeping\?/)).toBeInTheDocument();
    // The private appraisal is the one thought never sent to the actor, and the
    // usual answer to "why did she close up?" — it must survive the round trip.
    expect(screen.getByText(/I do not know him/)).toBeInTheDocument();
  });

  it("opens on the newest run that recorded something, not the newest run", async () => {
    // The literal newest is usually one still in flight; landing there shows an
    // empty pane and teaches the reader nothing.
    (api.useGetPreviewMonologuesQuery as any).mockReturnValue({
      data: [{ ...RUN, id: "run-live", endedAt: null, turnCount: 0 }, RUN],
      isLoading: false,
      isError: false,
    });
    const trigger = mockRun();

    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    await waitFor(() => expect(trigger).toHaveBeenCalledWith({ runId: "run-1" }));
  });

  it("distinguishes a run still going from one that recorded nothing", async () => {
    (api.useGetPreviewMonologuesQuery as any).mockReturnValue({
      data: [{ ...RUN, id: "run-live", endedAt: null, turnCount: 0 }],
      isLoading: false,
      isError: false,
    });
    mockRun({ ...RUN, id: "run-live", turns: [] });

    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(en.previewMonologueRuns.stillRunning)).toBeInTheDocument(),
    );
    expect(screen.queryByText(en.previewMonologueRuns.noTurns)).not.toBeInTheDocument();
  });

  it("says a finished run recorded nothing", async () => {
    (api.useGetPreviewMonologuesQuery as any).mockReturnValue({
      data: [{ ...RUN, id: "run-empty", turnCount: 0 }],
      isLoading: false,
      isError: false,
    });
    mockRun({ ...RUN, id: "run-empty", turns: [] });

    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(en.previewMonologueRuns.noTurns)).toBeInTheDocument(),
    );
  });

  it("keeps the recorded-runs modal on the light console palette", () => {
    // The same panel goes dark beside the simulation; here it sits in the admin
    // console, and inheriting the preview's near-black would look like a bug.
    const { container } = render(
      <PreviewMonologueRuns scenarioId={450} isOpen onClose={vi.fn()} />,
    );

    expect(container.querySelector(".bg-\\[\\#1D2020\\]")).toBeNull();
  });

  it("closes from the backdrop", () => {
    const onClose = vi.fn();
    render(<PreviewMonologueRuns scenarioId={450} isOpen onClose={onClose} />);

    fireEvent.click(screen.getByText(en.previewMonologueRuns.close));

    expect(onClose).toHaveBeenCalled();
  });
});
