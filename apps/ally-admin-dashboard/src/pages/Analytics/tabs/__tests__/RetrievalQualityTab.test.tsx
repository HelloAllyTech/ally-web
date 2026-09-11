import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What this panel must not do is let a small sample read as a finding.
 *
 * The judge labels a handful of retrievals a day on a quiet corpus, so a percentage computed
 * off six rows would look authoritative and be noise. The rule the tests hold: counts always,
 * percentages only when the server says the sample supports them.
 *
 * The other guarded property is the floor table's `relevantLost` column. That is the number
 * that settles what the similarity floor should be — the floor was set three times by argument,
 * and once by a direct hit measuring 0.5056 against a floor of 0.5 — so a table showing only
 * what a floor KEEPS would reproduce exactly the blind spot it exists to remove.
 */

const RESPONSE = {
  window: { from: "2026-08-12", to: "2026-09-11", label: "Last 30 days", days: 30 },
  coverage: {
    retrievals: 120,
    judged: 96,
    passages: 400,
    judgedPassages: 320,
    belowReportingFloor: false,
  },
  sufficiency: [
    { label: "sufficient", count: 60 },
    { label: "partial", count: 24 },
    { label: "nothing_useful", count: 12 },
  ],
  relevance: [
    { label: "relevant", count: 200 },
    { label: "tangential", count: 80 },
    { label: "irrelevant", count: 40 },
  ],
  superficialMatches: 18,
  byConsumer: [
    { consumer: "interview_agent", retrievals: 80, judged: 70, emptyRetrievals: 6 },
    { consumer: "admin_preview", retrievals: 40, judged: 26, emptyRetrievals: 11 },
  ],
  floorCurve: [
    { floor: 0.2, kept: 320, relevant: 200, tangential: 80, irrelevant: 40, relevantLost: 0 },
    { floor: 0.35, kept: 260, relevant: 190, tangential: 50, irrelevant: 20, relevantLost: 10 },
    { floor: 0.5, kept: 90, relevant: 80, tangential: 8, irrelevant: 2, relevantLost: 120 },
  ],
  gaps: [
    {
      query: "how does early-stage dementia change speech?",
      sufficiency: "nothing_useful",
      missing: "a first-person account of word-finding trouble",
      consumer: "interview_agent",
      returnedCount: 0,
      minSimilarity: 0.35,
      occurredAt: "2026-09-10T15:41:00.000Z",
      querySensitive: false,
    },
  ],
  judgeVersions: [{ judgeModel: "gemini-2.5-pro", judgePromptVersion: "v1", judgments: 96 }],
};

let result: { data?: unknown; isLoading?: boolean; isError?: boolean } = {
  data: RESPONSE,
  isLoading: false,
};
const querySpy = vi.fn();

vi.mock("@api", () => ({
  useGetRagQualityQuery: (args: unknown) => {
    querySpy(args);
    return result;
  },
}));

vi.mock("@constants", () => ({
  en: {
    ragQuality: {
      tab: "Retrieval quality",
      failed: "Couldn't load retrieval quality",
      consumer: "Asked by",
      allConsumers: "Everything",
      interviewAgent: "Interview agent",
      whatsappBot: "WhatsApp bot",
      queryWithheld: "Question withheld — asked by a health worker",
      adminPreview: "Admin preview",
      corpus: "Corpus",
      allCorpora: "Both",
      characterLibrary: "Character library",
      whatsappQa: "WhatsApp Q&A",
      retrievalsJudged: "Retrievals judged",
      passagesLabelled: "Passages labelled",
      answered: "Answered the question",
      nothingUseful: "Found nothing useful",
      superficial: "Superficial matches",
      superficialHelp: "A superficial match scored well on shared wording.",
      smallSample: "Too few judged retrievals for a percentage to mean anything yet",
      mixedJudges: "This window contains judgments from more than one judge",
      floorTitle: "What each similarity floor would cost",
      floorHelp: "The floor decides which passages reach the agent at all.",
      floorCaveat: "Every passage here already cleared the floor in force",
      floor: "Floor",
      kept: "Kept",
      relevant: "Relevant",
      tangential: "Tangential",
      irrelevant: "Irrelevant",
      precision: "Relevant share",
      relevantLost: "Relevant lost",
      currentFloor: "in use",
      consumerTitle: "Who asked, and what they got",
      retrievals: "Retrievals",
      judged: "Judged",
      returnedNothing: "Returned nothing",
      gapsTitle: "What the corpus was missing",
      gapsHelp: "Retrievals the judge called partial or useless",
      noGaps: "Every judged retrieval in this window answered its question.",
      nothingJudged: "Nothing judged in this window yet.",
      returned: "returned",
      atFloor: "at floor",
      missingPrefix: "Judge wanted:",
    },
  },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InlineNotification: ({ title }: { title: string }) => <div>{title}</div>,
  SkeletonText: () => <div>loading</div>,
  Tile: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHead: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children, ...rest }: any) => <td {...rest}>{children}</td>,
}));

const { RetrievalQualityTab } = await import("../RetrievalQualityTab");

describe("RetrievalQualityTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: RESPONSE, isLoading: false };
  });

  it("shows what a higher floor would have thrown away, not just what it keeps", () => {
    render(<RetrievalQualityTab range="30d" />);
    // 0.5 discards 120 relevant passages — the cost that was invisible while the floor was
    // being argued about.
    expect(screen.getByTestId("rag-floor-lost-0.50")).toHaveTextContent("120");
    expect(screen.getByTestId("rag-floor-lost-0.20")).toHaveTextContent("0");
  });

  it("marks the floor actually in use", () => {
    render(<RetrievalQualityTab range="30d" />);
    expect(screen.getByTestId("rag-floor-0.35")).toHaveTextContent("in use");
    expect(screen.getByTestId("rag-floor-0.50")).not.toHaveTextContent("in use");
  });

  it("suppresses every percentage when the judged sample is too small", () => {
    result = {
      data: {
        ...RESPONSE,
        coverage: { ...RESPONSE.coverage, judged: 6, belowReportingFloor: true },
      },
      isLoading: false,
    };
    render(<RetrievalQualityTab range="30d" />);

    expect(screen.getByText(/Too few judged retrievals/)).toBeTruthy();
    // The counts stay, the derived shares go.
    expect(screen.getByTestId("rag-floor-0.35")).toHaveTextContent("190");
    expect(screen.queryByText("73%")).toBeNull();
  });

  it("shows shares once the sample supports them", () => {
    render(<RetrievalQualityTab range="30d" />);
    // 190 relevant of 260 kept at the floor in use.
    expect(screen.getByTestId("rag-floor-0.35")).toHaveTextContent("73%");
  });

  it("names what the judge said was missing", () => {
    // An empty retrieval cannot distinguish a corpus gap from a tight floor; this text is the
    // only thing that can.
    render(<RetrievalQualityTab range="30d" />);
    expect(screen.getByText(/a first-person account of word-finding trouble/)).toBeTruthy();
    expect(screen.getByTestId("rag-gap")).toHaveTextContent("at floor 0.35");
  });

  it("separates the two consumers instead of pooling them", () => {
    render(<RetrievalQualityTab range="30d" />);
    expect(screen.getByTestId("rag-consumer-row-interview_agent")).toHaveTextContent("80");
    expect(screen.getByTestId("rag-consumer-row-admin_preview")).toHaveTextContent("40");
  });

  it("narrows the whole payload to one consumer on request", () => {
    render(<RetrievalQualityTab range="30d" />);
    fireEvent.click(screen.getByTestId("rag-consumer-interview_agent"));
    expect(querySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ consumer: "interview_agent" }),
    );
  });

  it("narrows to one corpus, because floor and chunk size differ per corpus", () => {
    render(<RetrievalQualityTab range="30d" />);
    fireEvent.click(screen.getByTestId("rag-corpus-character_library"));
    expect(querySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ corpus: "character_library" }),
    );
  });

  it("warns when a window mixes two judges rather than averaging them", () => {
    result = {
      data: {
        ...RESPONSE,
        judgeVersions: [
          { judgeModel: "gemini-2.5-pro", judgePromptVersion: "v1", judgments: 90 },
          { judgeModel: "gemini-2.5-pro", judgePromptVersion: "v2", judgments: 6 },
        ],
      },
      isLoading: false,
    };
    render(<RetrievalQualityTab range="30d" />);
    expect(screen.getByTestId("rag-mixed-judges")).toBeTruthy();
  });

  it("distinguishes nothing judged yet from nothing missing", () => {
    // "No gaps" over an unjudged window would read as a clean bill of health.
    result = {
      data: {
        ...RESPONSE,
        coverage: { ...RESPONSE.coverage, judged: 0, belowReportingFloor: true },
        gaps: [],
      },
      isLoading: false,
    };
    render(<RetrievalQualityTab range="30d" />);
    expect(screen.getByTestId("rag-no-gaps")).toHaveTextContent("Nothing judged");
  });

  it("says every retrieval answered its question when none fell short", () => {
    result = { data: { ...RESPONSE, gaps: [] }, isLoading: false };
    render(<RetrievalQualityTab range="30d" />);
    expect(screen.getByTestId("rag-no-gaps")).toHaveTextContent("answered its question");
  });

  it("says a worker's question is withheld rather than rendering a blank line", () => {
    // The bot's queries arrive as null from the server, withheld in SQL. An empty line would
    // read as a bug and invite someone to "fix" the redaction.
    result = {
      data: {
        ...RESPONSE,
        gaps: [
          {
            query: null,
            querySensitive: true,
            sufficiency: "declined_below_threshold",
            missing: "guidance on refusing medication",
            consumer: "whatsapp_bot",
            returnedCount: 0,
            minSimilarity: 0.35,
            occurredAt: "2026-09-11T06:20:00.000Z",
          },
        ],
      },
      isLoading: false,
    };
    render(<RetrievalQualityTab range="30d" />);

    expect(screen.getByTestId("rag-gap-withheld")).toBeTruthy();
    // The judge's own words still carry the actionable half.
    expect(screen.getByText(/guidance on refusing medication/)).toBeTruthy();
  });

  it("can narrow to the bot, the highest-volume path", () => {
    render(<RetrievalQualityTab range="30d" />);
    fireEvent.click(screen.getByTestId("rag-consumer-whatsapp_bot"));
    expect(querySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ consumer: "whatsapp_bot" }),
    );
  });
});
