import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { VideoActorPicker } from "../VideoActorPicker";

const facesMock = vi.fn();
const importCoverMock = vi.fn();

vi.mock("@api", () => ({
  useGetVideoActorFacesQuery: () => facesMock(),
  useImportVideoActorFaceCoverMutation: () => [
    (args: any) => ({ unwrap: () => importCoverMock(args) }),
    { isLoading: false },
  ],
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
}));
vi.mock("@assets", () => ({ TooltipIcon: () => <span /> }));

const makeFormMethods = (initial: Record<string, any> = {}) => {
  const values: Record<string, any> = { ...initial };
  return {
    values,
    watch: (name: string) => values[name],
    // Mirrors react-hook-form: getValues(name) reads one field, getValues()
    // reads them all. The first version ignored the argument and returned the
    // whole object, which is truthy — so every "did this field have a value?"
    // check silently passed.
    getValues: (name?: string) => (name ? values[name] : values),
    setValue: vi.fn((name: string, value: any) => {
      values[name] = value;
    }),
  } as any;
};

// One merged roster: each face carries its own vendor, so the author never
// picks a vendor. Tavus publishes previews; Beyond Presence publishes none.
const FACES = [
  {
    value: "ra066ab28864",
    label: "Raj",
    provider: "tavus",
    thumbnailImageUrl: "https://cdn.example/raj.jpg",
    thumbnailVideoUrl: "https://cdn.example/raj.mp4",
  },
  { value: "694c83e2", label: "Nelly - Office", provider: "bey" },
];

describe("VideoActorPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    facesMock.mockReturnValue({ data: FACES, isFetching: false, isError: false });
    importCoverMock.mockResolvedValue({ coverImageUrl: "https://our-bucket/cover.jpg" });
  });

  it("never asks the author to choose a vendor", () => {
    render(<VideoActorPicker label="Video Actor" formMethods={makeFormMethods()} />);
    expect(screen.queryByTestId("video-actor-provider")).toBeNull();
  });

  it("lists faces from every vendor in one roster", () => {
    render(<VideoActorPicker label="Video Actor" formMethods={makeFormMethods()} />);
    expect(screen.getByTestId("video-actor-face-ra066ab28864")).toBeTruthy();
    expect(screen.getByTestId("video-actor-face-694c83e2")).toBeTruthy();
  });

  it("shows a thumbnail where the vendor publishes one, a name where it doesn't", () => {
    render(<VideoActorPicker label="Video Actor" formMethods={makeFormMethods()} />);
    expect((screen.getByAltText("Raj") as HTMLImageElement).src).toBe(
      "https://cdn.example/raj.jpg",
    );
    expect(screen.queryByAltText("Nelly - Office")).toBeNull();
    expect(screen.getByText("Nelly - Office")).toBeTruthy();
  });

  it("derives the vendor from the chosen face", async () => {
    const formMethods = makeFormMethods();
    render(<VideoActorPicker label="Video Actor" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-face-694c83e2"));

    expect(formMethods.setValue).toHaveBeenCalledWith("videoActorAvatarId", "694c83e2", {
      shouldDirty: true,
    });
    expect(formMethods.setValue).toHaveBeenCalledWith("videoActorProvider", "bey", {
      shouldDirty: true,
    });
  });

  it("fills an empty cover from the chosen face, using our urls not the vendor's", async () => {
    const formMethods = makeFormMethods();
    render(<VideoActorPicker label="Video Actor" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-face-ra066ab28864"));

    expect(importCoverMock).toHaveBeenCalledWith({
      provider: "tavus",
      faceId: "ra066ab28864",
    });
    expect(formMethods.setValue).toHaveBeenCalledWith(
      "coverImageUrl",
      "https://our-bucket/cover.jpg",
      { shouldDirty: true },
    );
  });

  it("repoints an existing cover at the newly chosen face", async () => {
    // Unconditional by design: the cover fields stay on screen, so the author
    // sees the change land and can upload over it. That is what makes an
    // overwrite acceptable here where a silent swap behind a hidden field
    // would not be.
    const formMethods = makeFormMethods({ coverImageUrl: "https://our-bucket/curated.jpg" });
    render(<VideoActorPicker label="Video Actor" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-face-ra066ab28864"));

    expect(importCoverMock).toHaveBeenCalledWith({
      provider: "tavus",
      faceId: "ra066ab28864",
    });
  });

  it("clears a previously uploaded cover video so it cannot mismatch the face", async () => {
    // The bug an author hit: cover image became the avatar's face while cover
    // video stayed as a different person they had uploaded. We cannot import
    // the face's own clip, so empty is the honest state.
    const formMethods = makeFormMethods({ coverVideoUrl: "https://our-bucket/someone-else.mp4" });
    render(<VideoActorPicker label="Avatar" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-face-ra066ab28864"));

    // null, not undefined: JSON.stringify drops undefined keys, so an
    // undefined here never reaches the backend and the clear silently fails.
    expect(formMethods.setValue).toHaveBeenCalledWith("coverVideoUrl", null, {
      shouldDirty: true,
    });
  });

  it("says the video was cleared rather than removing it silently", async () => {
    const formMethods = makeFormMethods({ coverVideoUrl: "https://our-bucket/someone-else.mp4" });
    render(<VideoActorPicker label="Avatar" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-face-ra066ab28864"));

    expect(screen.getByTestId("video-actor-cover-notice").textContent).toMatch(
      /cover video was cleared/i,
    );
  });

  it("does not dirty the video field when there was no video to clear", async () => {
    const formMethods = makeFormMethods();
    render(<VideoActorPicker label="Avatar" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-face-ra066ab28864"));

    const touchedVideo = formMethods.setValue.mock.calls.some(
      ([field]: [string]) => field === "coverVideoUrl",
    );
    expect(touchedVideo).toBe(false);
  });

  it("leaves both covers alone for a face that publishes no picture", async () => {
    // Beyond Presence publishes no thumbnails, so such a face supplies nothing.
    // Clearing the author's video while providing no image would leave them
    // strictly worse off than before they picked a face — both covers stay
    // theirs to upload.
    const formMethods = makeFormMethods({
      coverImageUrl: "https://our-bucket/authors-own.jpg",
      coverVideoUrl: "https://our-bucket/authors-own.mp4",
    });
    render(<VideoActorPicker label="Avatar" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-face-694c83e2"));

    const touchedCovers = formMethods.setValue.mock.calls.some(([field]: [string]) =>
      ["coverImageUrl", "coverVideoUrl"].includes(field),
    );
    expect(touchedCovers).toBe(false);
    expect(importCoverMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("video-actor-cover-notice").textContent).toMatch(/yours to upload/i);
  });

  it("keeps the face selected when the cover copy fails", async () => {
    importCoverMock.mockRejectedValue(new Error("vendor down"));
    const formMethods = makeFormMethods();
    render(<VideoActorPicker label="Video Actor" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-face-ra066ab28864"));

    expect(formMethods.setValue).toHaveBeenCalledWith("videoActorAvatarId", "ra066ab28864", {
      shouldDirty: true,
    });
    expect(screen.getByTestId("video-actor-cover-notice").textContent).toMatch(/still selected/i);
  });

  it("clearing the face also clears the derived vendor", async () => {
    const formMethods = makeFormMethods({
      videoActorAvatarId: "ra066ab28864",
      videoActorProvider: "tavus",
    });
    render(<VideoActorPicker label="Video Actor" formMethods={formMethods} />);

    await userEvent.click(screen.getByTestId("video-actor-clear-face"));

    // null so the clear actually persists — undefined is dropped from JSON and
    // the backend would keep the old face.
    expect(formMethods.setValue).toHaveBeenCalledWith("videoActorAvatarId", null, {
      shouldDirty: true,
    });
    expect(formMethods.setValue).toHaveBeenCalledWith("videoActorProvider", null, {
      shouldDirty: true,
    });
  });

  it("still lets an id be typed when nothing can be listed", () => {
    facesMock.mockReturnValue({ data: [], isFetching: false, isError: true });
    render(<VideoActorPicker label="Video Actor" formMethods={makeFormMethods()} />);
    expect(screen.getByTestId("video-actor-face-manual")).toBeTruthy();
  });
});
