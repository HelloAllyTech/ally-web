import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrackDetail } from "@types";

const {
  mockUseGetLearnTrackDetailQuery,
  mockUseGetTrackLanguagesQuery,
  mockEnrollTrack,
  mockGetNextItem,
  mockSetTrackLanguage,
} = vi.hoisted(() => ({
  mockUseGetLearnTrackDetailQuery: vi.fn(),
  mockUseGetTrackLanguagesQuery: vi.fn(),
  mockEnrollTrack: vi.fn(),
  mockGetNextItem: vi.fn(),
  mockSetTrackLanguage: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetLearnTrackDetailQuery: (args: unknown, opts: unknown) =>
    mockUseGetLearnTrackDetailQuery(args, opts),
  useEnrollTrackMutation: () => [mockEnrollTrack],
  useLazyGetNextTrackItemQuery: () => [mockGetNextItem],
  useGetTrackLanguagesQuery: (args: unknown, opts: unknown) =>
    mockUseGetTrackLanguagesQuery(args, opts),
  useSetTrackLanguageMutation: () => [mockSetTrackLanguage, { isLoading: false }],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts?.language ? `${key}:${opts.language}` : key,
    i18n: { language: "hi" },
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// The constants barrel imports dozens of icons and images; answer every one
// with an inert stub. `then` must stay undefined or vitest treats the module
// as a thenable and hangs.
vi.mock(
  "@assets",
  () =>
    new Proxy(
      {},
      {
        has: (_target, prop) => typeof prop === "string" && prop !== "then",
        get: (_target, prop) => {
          if (typeof prop !== "string" || prop === "then") return undefined;
          if (prop === "__esModule") return true;
          const Stub = () => <svg data-testid={`asset-${prop}`} />;
          return Stub;
        },
      },
    ),
);

// The components barrel drags in the whole app; the journey map only needs these.
vi.mock("@components", () => ({
  TrackTypeIcon: () => <svg data-testid="type-icon" />,
  getTrackItemMeta: () => "meta",
}));

vi.mock("@ally-ui-mono/ui-shared", async () => {
  const actual =
    await vi.importActual<typeof import("@ally-ui-mono/ui-shared")>("@ally-ui-mono/ui-shared");
  return { ...actual, CustomImage: (props: any) => <img alt={props.alt} src={props.src} /> };
});

vi.mock("../components/TrackProgressDrawer", () => ({ TrackProgressDrawer: () => null }));

import { TrackOverview } from "../TrackOverview";

const track: TrackDetail = {
  id: "t1",
  title: "Course",
  description: null,
  coverImageUrl: null,
  status: "ACTIVE",
  totalItems: 1,
  simulationsCount: 0,
  estimatedDurationMinutes: null,
  enrolled: false,
  trackEnrollmentId: null,
  completedItems: 0,
  completedAt: null,
  languageCode: "hi",
  availableLanguages: [
    { languageId: 0, languageCode: "en", label: "English", isSource: true },
    { languageId: 2, languageCode: "hi", label: "Hindi", isSource: false },
  ],
  sections: [],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tracks/t1"]}>
      <Routes>
        <Route path="/tracks/:trackId" element={<TrackOverview />} />
      </Routes>
    </MemoryRouter>,
  );

describe("TrackOverview course language", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetLearnTrackDetailQuery.mockReturnValue({ data: track, isLoading: false });
    mockUseGetTrackLanguagesQuery.mockReturnValue({ data: undefined });
    mockSetTrackLanguage.mockReturnValue({ unwrap: () => Promise.resolve({ languageCode: "hi" }) });
    mockEnrollTrack.mockReturnValue({ unwrap: () => Promise.resolve({ trackEnrollmentId: "e1" }) });
    mockGetNextItem.mockReturnValue({
      unwrap: () => Promise.resolve({ trackCompleted: true, nextItem: null }),
    });
  });

  it("asks for the course in the app language", () => {
    renderPage();
    expect(mockUseGetLearnTrackDetailQuery).toHaveBeenCalledWith(
      { trackId: "t1", languageCode: "hi" },
      expect.anything(),
    );
  });

  it("shows the language the course is being read in", () => {
    renderPage();
    expect(screen.getByText("tracks2.language.readingIn:हिंदी")).toBeInTheDocument();
  });

  it("seeds the enrollment with the app language on Start", async () => {
    renderPage();
    fireEvent.click(screen.getByText("common.start"));
    await waitFor(() =>
      expect(mockEnrollTrack).toHaveBeenCalledWith({ trackId: "t1", languageCode: "hi" }),
    );
  });

  it("does not touch the server's language before enrollment", () => {
    renderPage();
    expect(mockUseGetTrackLanguagesQuery).toHaveBeenCalledWith(
      { trackId: "t1" },
      expect.objectContaining({ skip: true }),
    );
    expect(mockSetTrackLanguage).not.toHaveBeenCalled();
  });

  it("adopts the app language for an enrollment saved without one", async () => {
    mockUseGetLearnTrackDetailQuery.mockReturnValue({
      data: { ...track, enrolled: true, trackEnrollmentId: "e1" },
      isLoading: false,
    });
    mockUseGetTrackLanguagesQuery.mockReturnValue({
      data: { languages: track.availableLanguages, selectedLanguageCode: null },
    });
    renderPage();
    await waitFor(() =>
      expect(mockSetTrackLanguage).toHaveBeenCalledWith({ trackId: "t1", languageCode: "hi" }),
    );
  });

  it("leaves an enrollment alone once it has a saved language", () => {
    mockUseGetLearnTrackDetailQuery.mockReturnValue({
      data: { ...track, enrolled: true, trackEnrollmentId: "e1" },
      isLoading: false,
    });
    mockUseGetTrackLanguagesQuery.mockReturnValue({
      data: { languages: track.availableLanguages, selectedLanguageCode: "hi" },
    });
    renderPage();
    expect(mockSetTrackLanguage).not.toHaveBeenCalled();
  });

  it("carries a pre-enrollment language choice into the detail query and enroll", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Toggle options" }));
    fireEvent.click(screen.getByRole("option", { name: "English" }));
    await waitFor(() =>
      expect(mockUseGetLearnTrackDetailQuery).toHaveBeenLastCalledWith(
        { trackId: "t1", languageCode: "en" },
        expect.anything(),
      ),
    );
    fireEvent.click(screen.getByText("common.start"));
    await waitFor(() =>
      expect(mockEnrollTrack).toHaveBeenCalledWith({ trackId: "t1", languageCode: "en" }),
    );
  });
});
