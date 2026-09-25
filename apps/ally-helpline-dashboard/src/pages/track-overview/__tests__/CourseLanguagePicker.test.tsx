import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrackLanguageOption } from "@types";

const { mockSetTrackLanguage, mockUnwrap, mockToastError } = vi.hoisted(() => ({
  mockSetTrackLanguage: vi.fn(),
  mockUnwrap: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@api", () => ({
  useSetTrackLanguageMutation: () => [mockSetTrackLanguage, { isLoading: false }],
}));

vi.mock("sonner", () => ({ toast: { error: mockToastError } }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts?.language ? `${key}:${opts.language}` : key,
  }),
}));

import { CourseLanguagePicker, getCourseLanguageLabel } from "../components/CourseLanguagePicker";

const english: TrackLanguageOption = {
  languageId: 0,
  languageCode: "en",
  label: "English",
  isSource: true,
};
const hindi: TrackLanguageOption = {
  languageId: 2,
  languageCode: "hi",
  label: "Hindi",
  isSource: false,
};
const marathi: TrackLanguageOption = {
  languageId: 3,
  languageCode: "mr",
  label: "Marathi",
  isSource: false,
};

const openAndPick = (label: string) => {
  fireEvent.click(screen.getByRole("button", { name: "Toggle options" }));
  fireEvent.click(screen.getByRole("option", { name: label }));
};

describe("CourseLanguagePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetTrackLanguage.mockReturnValue({ unwrap: mockUnwrap });
    mockUnwrap.mockResolvedValue({ languageCode: "hi" });
  });

  it("prefers the app's endonym over the backend's English name", () => {
    expect(getCourseLanguageLabel(hindi)).toBe("हिंदी");
    expect(getCourseLanguageLabel(english)).toBe("English");
    expect(getCourseLanguageLabel({ ...hindi, languageCode: "bn", label: "Bengali" })).toBe(
      "Bengali",
    );
  });

  it("renders nothing for a course published in a single language", () => {
    const { container } = render(
      <CourseLanguagePicker
        trackId="t1"
        options={[english]}
        currentLanguageCode="en"
        enrolled
        onPreferredLanguageChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows what the learner is reading in, matching a regional tag to its base language", () => {
    render(
      <CourseLanguagePicker
        trackId="t1"
        options={[english, hindi, marathi]}
        currentLanguageCode="hi-IN"
        enrolled
        onPreferredLanguageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("tracks2.language.readingIn:हिंदी")).toBeInTheDocument();
  });

  it("persists the choice on the enrollment once enrolled", async () => {
    const onPreferred = vi.fn();
    render(
      <CourseLanguagePicker
        trackId="t1"
        options={[english, hindi, marathi]}
        currentLanguageCode="en"
        enrolled
        onPreferredLanguageChange={onPreferred}
      />,
    );
    openAndPick("मराठी");
    await waitFor(() =>
      expect(mockSetTrackLanguage).toHaveBeenCalledWith({ trackId: "t1", languageCode: "mr" }),
    );
    expect(onPreferred).not.toHaveBeenCalled();
  });

  it("keeps the choice locally before enrollment, since there is nothing to persist it on", () => {
    const onPreferred = vi.fn();
    render(
      <CourseLanguagePicker
        trackId="t1"
        options={[english, hindi]}
        currentLanguageCode="en"
        enrolled={false}
        onPreferredLanguageChange={onPreferred}
      />,
    );
    openAndPick("हिंदी");
    expect(onPreferred).toHaveBeenCalledWith("hi");
    expect(mockSetTrackLanguage).not.toHaveBeenCalled();
  });

  it("does nothing when the current language is re-selected", () => {
    render(
      <CourseLanguagePicker
        trackId="t1"
        options={[english, hindi]}
        currentLanguageCode="hi"
        enrolled
        onPreferredLanguageChange={vi.fn()}
      />,
    );
    openAndPick("हिंदी");
    expect(mockSetTrackLanguage).not.toHaveBeenCalled();
  });

  it("tells the learner when the change could not be saved", async () => {
    mockUnwrap.mockRejectedValueOnce(new Error("nope"));
    render(
      <CourseLanguagePicker
        trackId="t1"
        options={[english, hindi]}
        currentLanguageCode="en"
        enrolled
        onPreferredLanguageChange={vi.fn()}
      />,
    );
    openAndPick("हिंदी");
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("tracks2.language.changeFailed"),
    );
  });
});
