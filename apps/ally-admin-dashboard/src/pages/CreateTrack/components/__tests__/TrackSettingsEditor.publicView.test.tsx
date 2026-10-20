import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrackFormValues } from "@types";

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: mockToastSuccess, error: mockToastError } }));

vi.mock("@assets", () => ({
  TooltipIcon: () => <span data-testid="tooltip-icon" />,
  Trash: () => <span data-testid="trash" />,
  WandStars: () => <span data-testid="wand-stars" />,
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button
      type="button"
      aria-label={label ?? "Toggle"}
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
    />
  ),
}));

vi.mock("@components/rich-text-editor", () => ({ RichTextEditor: () => <div /> }));

vi.mock("@components/organization-access-details/text-helpline/helpers", () => ({
  buildPublicLink: (path: string) => `https://app.example.com${path}`,
}));

vi.mock("@constants", () => ({
  getCourseSharePath: (trackId: string) => `/course/${trackId}`,
}));

vi.mock("../../useTrackMediaUpload", () => ({
  useTrackMediaUpload: () => ({ upload: vi.fn(), isUploading: false }),
}));

vi.mock("../TrackCompetenciesField", () => ({ TrackCompetenciesField: () => null }));
vi.mock("../GenerateCoverImageModal", () => ({ GenerateCoverImageModal: () => null }));

import { TrackSettingsEditor } from "../TrackSettingsEditor";

const TRACK_ID = "96d570f0-14b6-42d7-8e78-79d7520c7f69";
const LINK = `https://app.example.com/course/${TRACK_ID}`;

const Harness = ({
  isPublicView = false,
  trackId = TRACK_ID as string | null,
  isPublished = true,
}: {
  isPublicView?: boolean;
  trackId?: string | null;
  isPublished?: boolean;
}) => {
  const methods = useForm<TrackFormValues>({
    defaultValues: {
      title: "Course",
      description: "",
      coverImageUrl: "",
      isGlobal: false,
      isPublicView,
      competencyIds: [],
      sections: [],
    },
  });
  return (
    <FormProvider {...methods}>
      <TrackSettingsEditor trackId={trackId} isPublished={isPublished} />
    </FormProvider>
  );
};

const toggle = () => screen.getByRole("button", { name: "Public view" });

describe("TrackSettingsEditor — public view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is off by default and shows no link", () => {
    render(<Harness />);

    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Off — the course has no public link.")).toBeInTheDocument();
    expect(screen.queryByTestId("course-share-link")).toBeNull();
  });

  it("shows the live link of a published public course, with Copy and Open", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<Harness isPublicView />);

    expect(screen.getByRole("textbox", { name: "Course link" })).toHaveValue(LINK);
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", LINK);
    expect(
      screen.getByText(
        "Visitors see the outline and log in to start. Only learners this course is assigned to can take it.",
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(mockToastSuccess).toHaveBeenCalledWith("Link copied");
  });

  it("says the link goes live on publish for a draft", () => {
    render(<Harness isPublicView isPublished={false} />);

    expect(screen.getByRole("textbox", { name: "Course link" })).toHaveValue(LINK);
    expect(
      screen.getByText("The link starts working once you publish the course."),
    ).toBeInTheDocument();
  });

  it("asks for a save before a just-switched-on link works", async () => {
    render(<Harness />);

    await userEvent.click(toggle());

    expect(screen.getByRole("textbox", { name: "Course link" })).toHaveValue(LINK);
    expect(screen.getByText("Save your changes to turn the link on.")).toBeInTheDocument();
  });

  it("warns that switching it off stops the link once saved", async () => {
    render(<Harness isPublicView />);

    await userEvent.click(toggle());

    expect(screen.queryByTestId("course-share-link")).toBeNull();
    expect(
      screen.getByText(
        "Save your changes to turn the link off. Anyone who opens it after that is told the course isn't available.",
      ),
    ).toBeInTheDocument();
  });

  it("has no link to show before a new course is first saved", async () => {
    render(<Harness trackId={null} isPublished={false} />);

    await userEvent.click(toggle());

    expect(screen.getByTestId("course-share-link-unsaved")).toHaveTextContent(
      "Save the course to get its link.",
    );
  });
});
