import { useState } from "react";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REFERENCE_IMAGES_MAX,
  REFERENCE_IMAGE_MAX_BYTES,
  ReferenceImagesField,
} from "../ReferenceImagesField";

/**
 * Boxed rather than plain `const`s: `vi.mock` factories are hoisted above every declaration in
 * this file, so a factory that closes over a bare `const` throws on initialisation. Reading
 * through an object created inside the hoisted block is the way round it.
 */
const spies = vi.hoisted(() => ({
  presign: vi.fn(),
  put: vi.fn(),
  toastError: vi.fn(),
}));
const { presign, put } = spies;
const toastError = spies.toastError;

vi.mock("@api", () => ({
  // Stable across renders, for the reason spelled out in AddOpportunityDrawer.test.tsx.
  useGetRoadmapReferenceImageUploadUrlMutation: () => [spies.presign, { isLoading: false }],
}));
vi.mock("@icons", () => ({
  Close: () => null,
  TooltipIcon: () => null,
  UploadImage: () => null,
}));
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("axios", () => ({ default: { put: spies.put } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: spies.toastError } }));

const OURS = "https://ally-assets.s3.ap-south-1.amazonaws.com/roadmap/reference-images/a.png";

const file = (name: string, type = "image/png", size = 1024) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

/**
 * Selecting files. Awaited inside `act` because the change handler is async — the upload's own
 * state settles a microtask later, and asserting before it does produces the act() warning
 * whether or not the assertion happens to hold.
 */
const pick = async (files: File[]) => {
  const input = screen.getByLabelText("Add reference images");
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
};

const renderField = (images: { url: string; caption?: string | null }[] = [], canEdit = true) => {
  const onChange = vi.fn();
  const view = render(
    <ReferenceImagesField images={images} onChange={onChange} canEdit={canEdit} />,
  );
  return { onChange, view };
};

describe("ReferenceImagesField", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uploads to the presigned URL and hands back the stored URL, not the signed one", async () => {
    // The signature must never reach the row. Storing `presignedUrl` would persist a credential
    // that also stops working in ten minutes.
    presign.mockReturnValue({
      unwrap: () => Promise.resolve({ presignedUrl: "https://signed?sig=abc", imageUrl: OURS }),
    });
    put.mockResolvedValue({ status: 200 });
    const { onChange } = renderField();

    await pick([file("a.png")]);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([{ url: OURS }]));
    expect(put).toHaveBeenCalledWith("https://signed?sig=abc", expect.anything(), {
      headers: { "Content-Type": "image/png" },
    });
  });

  it("appends to the existing list rather than replacing it", async () => {
    presign.mockReturnValue({
      unwrap: () => Promise.resolve({ presignedUrl: "https://signed", imageUrl: OURS }),
    });
    put.mockResolvedValue({ status: 200 });
    const existing = [
      { url: "https://ally-assets.s3.x.amazonaws.com/roadmap/reference-images/b.png" },
    ];
    const { onChange } = renderField(existing);

    await pick([file("a.png")]);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([...existing, { url: OURS }]));
  });

  it("refuses an unsupported type without asking for a URL", async () => {
    // SVG in particular: it is a document that can carry script and this renders inline for
    // every roadmap viewer. Refused here AND by the server's content-type enum.
    renderField();

    await pick([file("logo.svg", "image/svg+xml")]);

    expect(presign).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining("logo.svg"));
  });

  it("refuses a file over the size cap without uploading it", async () => {
    renderField();

    await pick([file("huge.png", "image/png", REFERENCE_IMAGE_MAX_BYTES + 1)]);

    expect(presign).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("uploads the good files in a batch and names only the bad one", async () => {
    // A 12 MB file among five must not cost the other four — the cap means re-picking the whole
    // set may not even fit.
    presign.mockReturnValue({
      unwrap: () => Promise.resolve({ presignedUrl: "https://signed", imageUrl: OURS }),
    });
    put.mockResolvedValue({ status: 200 });
    const { onChange } = renderField();

    await pick([file("good.png"), file("bad.tiff", "image/tiff")]);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([{ url: OURS }]));
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining("bad.tiff"));
  });

  it("trims a selection to what fits BEFORE uploading anything", async () => {
    // Uploading a file only to discard it would leave an object in the bucket nothing points at.
    presign.mockReturnValue({
      unwrap: () => Promise.resolve({ presignedUrl: "https://signed", imageUrl: OURS }),
    });
    put.mockResolvedValue({ status: 200 });
    const existing = Array.from({ length: REFERENCE_IMAGES_MAX - 1 }, (_u, i) => ({
      url: `https://ally-assets.s3.x.amazonaws.com/roadmap/reference-images/${i}.png`,
    }));
    renderField(existing);

    await pick([file("a.png"), file("b.png"), file("c.png")]);

    await waitFor(() => expect(presign).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining("skipped"));
  });

  it("disables the button at the cap and says how to get room back", () => {
    const full = Array.from({ length: REFERENCE_IMAGES_MAX }, (_u, i) => ({
      url: `https://ally-assets.s3.x.amazonaws.com/roadmap/reference-images/${i}.png`,
    }));
    renderField(full);

    expect(screen.getByRole("button", { name: /add images/i })).toBeDisabled();
    expect(screen.getByText(/remove one to add another/i)).toBeInTheDocument();
  });

  it("removes by dropping the entry, leaving the rest in order", () => {
    const images = [{ url: "https://a/roadmap/reference-images/1.png" }, { url: OURS }];
    const { onChange } = renderField(images);

    fireEvent.click(screen.getByRole("button", { name: /remove reference image 1/i }));

    expect(onChange).toHaveBeenCalledWith([images[1]]);
  });

  it("captions the right image and leaves the others untouched", () => {
    const images = [{ url: "https://a/roadmap/reference-images/1.png" }, { url: OURS }];
    const { onChange } = renderField(images);

    fireEvent.change(screen.getByLabelText(/caption for reference image 2/i), {
      target: { value: "After" },
    });

    expect(onChange).toHaveBeenCalledWith([images[0], { url: OURS, caption: "After" }]);
  });

  it("shows a viewer the images and captions but no controls", () => {
    renderField([{ url: OURS, caption: "Current state" }], false);

    expect(screen.getByText("Current state")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add images/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("renders nothing for a viewer when there are no images", () => {
    // An empty section telling somebody who cannot act that there is nothing there is worse
    // than no section.
    const { view } = renderField([], false);

    expect(view.container).toBeEmptyDOMElement();
  });

  it("uses the caption as the image's alt text when there is one", () => {
    renderField([{ url: OURS, caption: "Filter row wrapping" }], false);

    expect(screen.getByAltText("Filter row wrapping")).toBeInTheDocument();
  });

  it("keeps a removal made while a different upload is still in flight, instead of reviving the removed image once the upload resolves", async () => {
    // The presign call is held open on purpose, so there's a real window in which the list can
    // change under the pending upload's feet.
    let resolvePresign: (value: { presignedUrl: string; imageUrl: string }) => void = () => {};
    presign.mockReturnValue({
      unwrap: () =>
        new Promise(resolve => {
          resolvePresign = resolve;
        }),
    });
    put.mockResolvedValue({ status: 200 });

    // A real controlled wrapper, not a plain mock: `onChange` has to actually feed back into
    // `images` for a stale closure to be observable across the re-render it causes.
    const Controlled = () => {
      const [images, setImages] = useState([
        { url: "https://a/roadmap/reference-images/keep.png" },
      ]);
      return <ReferenceImagesField images={images} onChange={setImages} canEdit />;
    };
    render(<Controlled />);

    // Start uploading a second image; its presign promise won't settle until we resolve it below.
    act(() => {
      fireEvent.change(screen.getByLabelText("Add reference images"), {
        target: { files: [file("a.png")] },
      });
    });

    // While that upload is still pending, remove the already-attached image.
    fireEvent.click(screen.getByRole("button", { name: /remove reference image 1/i }));
    expect(screen.queryAllByRole("img")).toHaveLength(0);

    // Now let the in-flight upload finish.
    await act(async () => {
      resolvePresign({ presignedUrl: "https://signed", imageUrl: OURS });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The uploaded image lands, but the earlier removal must not be undone by it.
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    expect(screen.getByRole("img")).toHaveAttribute("src", OURS);
  });
});
