import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ImageLibrary } from "../ImageLibrary";

const IMAGE_LIBRARY_LIMIT = 30;

const mockCoverImages = [
  { id: "img-1", imageUrl: "https://example.com/img1.jpg" },
  { id: "img-2", imageUrl: "https://example.com/img2.jpg" },
  { id: "img-3", imageUrl: "https://example.com/img3.jpg" },
];

const mockQueryReturn = (
  overrides: Partial<{
    data: { coverImages: typeof mockCoverImages; count: number };
    isLoading: boolean;
    isFetching: boolean;
  }> = {},
) => ({
  data: undefined as { coverImages: typeof mockCoverImages; count: number } | undefined,
  isLoading: false,
  isFetching: false,
  ...overrides,
});

// vi.hoisted ensures the fn is available inside vi.mock (mocks are hoisted)
const mockUseGetImageLibraryQuery = vi.hoisted(() => vi.fn());

vi.mock("@api", () => ({
  useGetImageLibraryQuery: (args: { limit: number; offset: number }, options: { skip?: boolean }) =>
    mockUseGetImageLibraryQuery(args, options),
}));

vi.mock("@constants", () => ({
  en: {
    simulation: {
      imageLibrary: "Image Library",
      noImagesAvailable: "No images available",
      imageLibraryEmpty: "The image library is empty.",
      cancel: "Cancel",
      selectImage: "Select Image",
    },
    common: { loading: "Loading..." },
  },
}));

vi.mock("@assets", () => ({
  CheckCircle: () => <span data-testid="check-circle" />,
}));

vi.mock("@components", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock("@components/types", () => ({
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
  },
}));

vi.mock("@ally-ui-mono/ui-shared/index", () => ({
  CustomImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="library-image" />
  ),
}));

describe("ImageLibrary", () => {
  const onClose = vi.fn();
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetImageLibraryQuery.mockReturnValue(
      mockQueryReturn({
        data: { coverImages: mockCoverImages, count: 3 },
        isLoading: false,
        isFetching: false,
      }),
    );
  });

  describe("visibility", () => {
    it("returns null when isOpen is false", () => {
      const { container } = render(
        <ImageLibrary isOpen={false} onClose={onClose} onSelect={onSelect} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("does not call useGetImageLibraryQuery when isOpen is false (skip: true)", () => {
      render(<ImageLibrary isOpen={false} onClose={onClose} onSelect={onSelect} />);
      expect(mockUseGetImageLibraryQuery).toHaveBeenCalledWith(
        { limit: IMAGE_LIBRARY_LIMIT, offset: 0 },
        { skip: true },
      );
    });

    it("renders modal when isOpen is true", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      expect(screen.getByRole("heading", { name: /image library/i })).toBeInTheDocument();
    });

    it("calls useGetImageLibraryQuery with limit and offset when isOpen is true", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      expect(mockUseGetImageLibraryQuery).toHaveBeenCalledWith(
        { limit: IMAGE_LIBRARY_LIMIT, offset: 0 },
        { skip: false },
      );
    });
  });

  describe("reset state on open", () => {
    it("resets offset and fetches from 0 when modal opens", () => {
      const { rerender } = render(
        <ImageLibrary isOpen={false} onClose={onClose} onSelect={onSelect} />,
      );
      mockUseGetImageLibraryQuery.mockClear();
      rerender(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      expect(mockUseGetImageLibraryQuery).toHaveBeenCalledWith(
        { limit: IMAGE_LIBRARY_LIMIT, offset: 0 },
        { skip: false },
      );
    });
  });

  describe("loading and empty states", () => {
    it("shows loading skeletons when isLoading and no images yet", () => {
      mockUseGetImageLibraryQuery.mockReturnValue(
        mockQueryReturn({ data: undefined, isLoading: true, isFetching: true }),
      );
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows empty state when not loading and no images", () => {
      mockUseGetImageLibraryQuery.mockReturnValue(
        mockQueryReturn({ data: { coverImages: [], count: 0 }, isLoading: false }),
      );
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      expect(screen.getByText(/no images available/i)).toBeInTheDocument();
      expect(screen.getByText(/image library is empty/i)).toBeInTheDocument();
    });

    it("shows image grid when images are loaded", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const images = screen.getAllByTestId("library-image");
      expect(images).toHaveLength(3);
      expect(images[0]).toHaveAttribute("src", mockCoverImages[0].imageUrl);
    });
  });

  describe("image selection", () => {
    it("disables Select button when no image is selected", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const selectButton = screen.getByRole("button", { name: /select image/i });
      expect(selectButton).toBeDisabled();
    });

    it("enables Select button when an image is selected", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const firstImage = screen.getAllByTestId("library-image")[0].closest("button");
      if (firstImage) fireEvent.click(firstImage);
      const selectButton = screen.getByRole("button", { name: /select image/i });
      expect(selectButton).not.toBeDisabled();
    });

    it("calls onSelect with selected image URL and onClose when Select is clicked", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const firstImage = screen.getAllByTestId("library-image")[0].closest("button");
      if (firstImage) fireEvent.click(firstImage);
      const selectButton = screen.getByRole("button", { name: /select image/i });
      fireEvent.click(selectButton);
      expect(onSelect).toHaveBeenCalledWith(mockCoverImages[0].imageUrl);
      expect(onClose).toHaveBeenCalled();
    });

    it("disables Select button when loading (isFetching) even if image selected", () => {
      mockUseGetImageLibraryQuery.mockReturnValue(
        mockQueryReturn({
          data: { coverImages: mockCoverImages, count: 3 },
          isLoading: false,
          isFetching: true,
        }),
      );
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const firstImage = screen.getAllByTestId("library-image")[0].closest("button");
      if (firstImage) fireEvent.click(firstImage);
      const selectButton = screen.getByRole("button", { name: /select image/i });
      expect(selectButton).toBeDisabled();
    });
  });

  describe("close behavior", () => {
    it("calls onClose when Cancel is clicked", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when backdrop (overlay) is clicked", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const overlay = document.querySelector(".bg-black.bg-opacity-50");
      expect(overlay).toBeInTheDocument();
      if (overlay) fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    });

    it("does not close when modal content is clicked (stopPropagation)", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const content = document.querySelector(".relative.bg-white");
      expect(content).toBeInTheDocument();
      if (content) fireEvent.click(content);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("infinite scroll / load more", () => {
    it("shows loading text when isFetching and images already present", () => {
      mockUseGetImageLibraryQuery.mockReturnValue(
        mockQueryReturn({
          data: { coverImages: mockCoverImages, count: 6 },
          isLoading: false,
          isFetching: true,
        }),
      );
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("scroll near bottom triggers load more (hook called with increased offset)", async () => {
      mockUseGetImageLibraryQuery.mockReturnValue(
        mockQueryReturn({
          data: { coverImages: mockCoverImages, count: 10 },
          isLoading: false,
          isFetching: false,
        }),
      );
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      mockUseGetImageLibraryQuery.mockClear();

      const scrollContainer = document.querySelector(".overflow-y-auto");
      expect(scrollContainer).toBeInTheDocument();

      Object.defineProperty(scrollContainer, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 400, configurable: true });
      Object.defineProperty(scrollContainer, "scrollTop", { value: 450, configurable: true });

      fireEvent.scroll(scrollContainer);

      await waitFor(() => {
        const calls = mockUseGetImageLibraryQuery.mock.calls;
        const offsetCalls = calls.map((c: unknown[]) => (c[0] as { offset: number }).offset);
        expect(offsetCalls).toContain(IMAGE_LIBRARY_LIMIT);
      });
    });
  });

  describe("image grid filtering", () => {
    it("filters out images without imageUrl (only valid images rendered)", () => {
      const imagesWithMissingUrl = [
        { id: "img-1", imageUrl: "https://example.com/img1.jpg" },
        { id: "img-2", imageUrl: "" },
        { id: "img-3", imageUrl: "https://example.com/img3.jpg" },
      ];
      mockUseGetImageLibraryQuery.mockReturnValue(
        mockQueryReturn({
          data: { coverImages: imagesWithMissingUrl as typeof mockCoverImages, count: 3 },
        }),
      );
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      const imgs = screen.getAllByTestId("library-image");
      expect(imgs).toHaveLength(2);
      expect(imgs[0]).toHaveAttribute("src", "https://example.com/img1.jpg");
      expect(imgs[1]).toHaveAttribute("src", "https://example.com/img3.jpg");
    });
  });

  describe("header and footer UI", () => {
    it("renders header with image library title", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      expect(screen.getByRole("heading", { name: /image library/i })).toBeInTheDocument();
    });

    it("renders Cancel and Select Image buttons in footer", () => {
      render(<ImageLibrary isOpen onClose={onClose} onSelect={onSelect} />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /select image/i })).toBeInTheDocument();
    });
  });
});
