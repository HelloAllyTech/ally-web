import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock constants
vi.mock("@constants", () => ({
  en: {
    badge: {
      icon: "Icon",
      uploadIcon: "Upload Icon",
      uploading: "Uploading...",
      iconUploadHint: "PNG or JPG files only (240x240 preferred)",
      iconMustBeImageFile: "Icon must be a PNG or JPG file",
      iconFileTooLarge: "Icon file must be less than 2MB",
      iconMustBeSquare: "Please upload an icon with 1:1 aspect ratio",
      iconUploadFailed: "Failed to upload icon",
    },
  },
}));

// Mock sonner
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: any[]) => toastError(...args),
    success: vi.fn(),
  },
}));

// Mock axios
const putSpy = vi.fn();
vi.mock("axios", () => ({
  default: {
    put: (...args: any[]) => putSpy(...args),
  },
}));

// Mock assets
vi.mock("@assets", () => ({
  UploadImage: () => <svg data-testid="upload-image-icon" />,
  Edit: () => <svg data-testid="edit-icon" />,
}));

// Mock CustomImage
vi.mock("@ally-ui-mono/ui-shared", () => ({
  CustomImage: ({ src, alt }: { src: string; alt: string }) => (
    <img data-testid="custom-image" src={src} alt={alt} />
  ),
}));

// Mock URL.createObjectURL and revokeObjectURL
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock-url"),
  revokeObjectURL: vi.fn(),
});

// Mock dimensions object to control aspect ratio in tests
const mockImageDimensions = { width: 100, height: 100 };

// Mock Image class for aspect ratio validation
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  _src = "";

  get width() {
    return mockImageDimensions.width;
  }

  get height() {
    return mockImageDimensions.height;
  }

  set src(val: string) {
    this._src = val;
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }

  get src() {
    return this._src;
  }
}

(global as any).Image = MockImage;

import { IconUploader } from "../IconUploader";

// Helper to create mock files
function createFile(name: string, type: string, size: number): File {
  const blob = new Blob(["x".repeat(size)], { type });
  return new File([blob], name, { type });
}

describe("IconUploader", () => {
  const defaultProps = {
    imageUrl: "",
    onImageChange: vi.fn(),
    onUpload: vi.fn(),
    onImageDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (putSpy as any).mockResolvedValue({ status: 200 });
    (defaultProps.onUpload as any).mockResolvedValue({
      presignedUrl: "https://s3/upload",
      imageUrl: "https://cdn/badge-icon.png",
    });
    // Reset image dimensions to valid 1:1 ratio
    mockImageDimensions.width = 100;
    mockImageDimensions.height = 100;
  });

  it("renders upload icon when no image is provided", () => {
    render(<IconUploader {...defaultProps} />);

    expect(screen.getByTestId("upload-image-icon")).toBeInTheDocument();
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByText("Upload Icon")).toBeInTheDocument();
  });

  it("renders preview image when imageUrl is provided", () => {
    render(<IconUploader {...defaultProps} imageUrl="https://example.com/image.png" />);

    expect(screen.getByTestId("custom-image")).toBeInTheDocument();
    expect(screen.getByTestId("edit-icon")).toBeInTheDocument();
  });

  it("rejects non-image file types", async () => {
    render(<IconUploader {...defaultProps} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = createFile("doc.pdf", "application/pdf", 1000);

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(toastError).toHaveBeenCalledWith("Icon must be a PNG or JPG file");
    expect(defaultProps.onUpload).not.toHaveBeenCalled();
  });

  it("rejects files larger than 2MB", async () => {
    render(<IconUploader {...defaultProps} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = createFile("large.png", "image/png", 2 * 1024 * 1024 + 1);

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(toastError).toHaveBeenCalledWith("Icon file must be less than 2MB");
    expect(defaultProps.onUpload).not.toHaveBeenCalled();
  });

  it("rejects images with non-1:1 aspect ratio", async () => {
    // Set non-square dimensions
    mockImageDimensions.width = 200;
    mockImageDimensions.height = 100;

    render(<IconUploader {...defaultProps} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = createFile("image.png", "image/png", 1000);

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Please upload an icon with 1:1 aspect ratio");
    });
    expect(defaultProps.onUpload).not.toHaveBeenCalled();

    // Wait for any pending state updates to complete
    await waitFor(() => {
      expect(screen.queryByText("Uploading...")).not.toBeInTheDocument();
    });
  });

  it("uploads valid image and calls onImageChange", async () => {
    const onImageChange = vi.fn();
    const onUpload = vi.fn().mockResolvedValue({
      presignedUrl: "https://s3/upload",
      imageUrl: "https://cdn/badge-icon.png",
    });

    render(<IconUploader {...defaultProps} onImageChange={onImageChange} onUpload={onUpload} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = createFile("icon.png", "image/png", 1000);

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith({
        fileName: "icon.png",
        fileSize: 1000,
        contentType: "image/png",
      });
    });

    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith("https://s3/upload", validFile, {
        headers: { "Content-Type": "image/png" },
      });
    });

    await waitFor(() => {
      expect(onImageChange).toHaveBeenCalledWith("https://cdn/badge-icon.png");
    });
  });

  it("accepts JPEG files", async () => {
    const onUpload = vi.fn().mockResolvedValue({
      presignedUrl: "https://s3/upload",
      imageUrl: "https://cdn/badge-icon.jpg",
    });

    render(<IconUploader {...defaultProps} onUpload={onUpload} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const jpegFile = createFile("icon.jpg", "image/jpeg", 1000);

    fireEvent.change(input, { target: { files: [jpegFile] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith({
        fileName: "icon.jpg",
        fileSize: 1000,
        contentType: "image/jpeg",
      });
    });
  });

  it("shows uploading state while upload is in progress", async () => {
    const onUpload = vi.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(
            () =>
              resolve({
                presignedUrl: "https://s3/upload",
                imageUrl: "https://cdn/badge-icon.png",
              }),
            100,
          );
        }),
    );

    render(<IconUploader {...defaultProps} onUpload={onUpload} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = createFile("icon.png", "image/png", 1000);

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText("Uploading...")).toBeInTheDocument();
    });
  });

  it("handles upload failure gracefully", async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error("Upload failed"));
    const onImageChange = vi.fn();

    render(<IconUploader {...defaultProps} onUpload={onUpload} onImageChange={onImageChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = createFile("icon.png", "image/png", 1000);

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to upload icon");
    });
    expect(onImageChange).not.toHaveBeenCalled();

    // Wait for upload state to be reset
    await waitFor(() => {
      expect(screen.queryByText("Uploading...")).not.toBeInTheDocument();
    });
  });

  it("opens file picker when edit button is clicked on existing image", () => {
    render(<IconUploader {...defaultProps} imageUrl="https://example.com/image.png" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    const editButton = screen.getByTestId("edit-icon").closest("button") as HTMLButtonElement;
    fireEvent.click(editButton);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("opens file picker when upload button is clicked", () => {
    render(<IconUploader {...defaultProps} />);

    const uploadButton = screen.getByText("Upload Icon");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.click(uploadButton);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles drag and drop file upload", async () => {
    const onUpload = vi.fn().mockResolvedValue({
      presignedUrl: "https://s3/upload",
      imageUrl: "https://cdn/badge-icon.png",
    });

    render(<IconUploader {...defaultProps} onUpload={onUpload} />);

    const dropZone = screen.getByTestId("upload-image-icon").closest("div")?.parentElement;
    const validFile = createFile("icon.png", "image/png", 1000);

    // Simulate drag over
    fireEvent.dragOver(dropZone!);

    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [validFile],
      },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalled();
    });
  });

  it("handles drag leave event", () => {
    render(<IconUploader {...defaultProps} />);

    const dropZone = screen.getByTestId("upload-image-icon").closest("div")?.parentElement;

    fireEvent.dragOver(dropZone!);
    fireEvent.dragLeave(dropZone!);

    // Component should not crash and should still be functional
    expect(screen.getByTestId("upload-image-icon")).toBeInTheDocument();
  });

  it("disables upload button while uploading", async () => {
    const onUpload = vi.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(
            () =>
              resolve({
                presignedUrl: "https://s3/upload",
                imageUrl: "https://cdn/badge-icon.png",
              }),
            100,
          );
        }),
    );

    render(<IconUploader {...defaultProps} onUpload={onUpload} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = createFile("icon.png", "image/png", 1000);

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      const uploadButton = screen.getByText("Uploading...");
      expect(uploadButton).toBeDisabled();
    });
  });
});
