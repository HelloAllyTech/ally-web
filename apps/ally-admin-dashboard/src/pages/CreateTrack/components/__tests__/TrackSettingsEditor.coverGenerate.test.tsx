import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrackFormValues } from "@types";

const { mockToastSuccess, modalProps } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  modalProps: { current: null as any },
}));

vi.mock("sonner", () => ({ toast: { success: mockToastSuccess, error: vi.fn() } }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  CustomImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
  Tooltip: ({ children }: any) => <>{children}</>,
}));

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
  ToggleSwitch: () => null,
}));

vi.mock("@components/rich-text-editor", () => ({ RichTextEditor: () => <div /> }));

vi.mock("../../useTrackMediaUpload", () => ({
  useTrackMediaUpload: () => ({ upload: vi.fn(), isUploading: false }),
}));

vi.mock("../CourseShareLink", () => ({ CourseShareLink: () => null }));
vi.mock("../TrackCompetenciesField", () => ({ TrackCompetenciesField: () => null }));

vi.mock("../GenerateCoverImageModal", () => ({
  GenerateCoverImageModal: (props: any) => {
    modalProps.current = props;
    return (
      <div role="dialog">
        <button type="button" onClick={() => props.onAccept("https://cdn.example.com/gen.png")}>
          Use as cover
        </button>
        <button type="button" onClick={() => props.onPromptChange("My edited prompt")}>
          Edit prompt
        </button>
        <button type="button" onClick={props.onClose}>
          Cancel
        </button>
      </div>
    );
  },
}));

import { TrackSettingsEditor } from "../TrackSettingsEditor";

let isCoverDirty = false;

const Harness = () => {
  const methods = useForm<TrackFormValues>({
    defaultValues: {
      title: "Listening Well",
      description: "<p>Learn to listen.</p>",
      coverImageUrl: "",
      isGlobal: false,
      isPublicView: false,
      competencyIds: [],
      sections: [],
    },
  });
  isCoverDirty = !!methods.formState.dirtyFields.coverImageUrl;
  return (
    <FormProvider {...methods}>
      <TrackSettingsEditor trackId="t-1" isPublished={false} />
    </FormProvider>
  );
};

const openGenerator = () =>
  fireEvent.click(screen.getByRole("button", { name: "Generate cover image with AI" }));

describe("TrackSettingsEditor — generate cover image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modalProps.current = null;
    isCoverDirty = false;
  });

  it("opens the pop-up on a default prompt built from the course", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openGenerator();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(modalProps.current.initialPrompt).toContain('titled "Listening Well"');
    expect(modalProps.current.initialPrompt).toContain("Learn to listen.");
    expect(modalProps.current.trackTitle).toBe("Listening Well");
  });

  it("an accepted image becomes the cover as an unsaved change", () => {
    render(<Harness />);
    openGenerator();

    fireEvent.click(screen.getByRole("button", { name: "Use as cover" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByAltText("Cover")).toHaveAttribute("src", "https://cdn.example.com/gen.png");
    expect(isCoverDirty).toBe(true);
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/Save the course/));
  });

  it("keeps the trainer's edited prompt for the next time the pop-up opens", () => {
    render(<Harness />);
    openGenerator();
    fireEvent.click(screen.getByRole("button", { name: "Edit prompt" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    openGenerator();

    expect(modalProps.current.initialPrompt).toBe("My edited prompt");
    expect(modalProps.current.defaultPrompt).toContain('titled "Listening Well"');
  });
});
