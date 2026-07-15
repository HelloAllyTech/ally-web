import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock constants early - plain mock with ReportGenerationStatus for transitive imports (report-section)
vi.mock("@constants", () => ({
  ReportGenerationStatus: {
    STARTED: "STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    FAILED: "FAILED",
  },
  en: {
    common: {
      uploading: "Uploading...",
    },
    errors: {
      fileMustBeJPEGOrPNG: "File must be JPEG or PNG.",
      fileMustBeVideo: "File must be a video.",
      fileUploadFailed: "Failed to upload file. Please try again.",
      fileMetadataLoadFailed: "Failed to load video metadata",
      imageMustHave169AspectRatio: "Image must have a 16:9 aspect ratio.",
      fileDeleteFailed: "Failed to delete file. Please try again.",
    },
    simulation: {
      file: "File",
      upload: "Upload",
      dragDrop: "Drag & drop or",
      choose: "choose",
      pngUploadGuidelines: "a JPEG or PNG file with a",
      videoUploadGuidelines: "a MP4 or MOV file with a resolution of 16:9 ratio and under 15MB.",
      resolution: "resolution of 1920x1080 and under 2MB.",
      imageMaxSizeLabel: "2MB",
      videoMaxSizeLabel: "15MB",
    },
  },
  imageTypes: {
    JPEG: "image/jpeg",
    PNG: "image/png",
  },
  FILE_TYPE: {
    IMAGE: "image",
    VIDEO: "video",
    ANY: "any",
  },
  ACCEPTED_FILE_TYPES: {
    IMAGE: { "image/jpeg": [".jpeg", ".jpg"], "image/png": [".png"] },
    VIDEO: {
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/x-msvideo": [".avi"],
    },
  },
  ACCEPT_ATTRIBUTES: {
    IMAGE: "image/jpeg,image/png",
    VIDEO: "video/mp4,video/quicktime,video/x-msvideo",
    ANY: "image/jpeg,image/png,video/mp4,video/quicktime,video/x-msvideo",
  },
  FILE_SIZE_LIMITS: {
    IMAGE: 2 * 1024 * 1024, // 2MB
    VIDEO: 15 * 1024 * 1024, // 15MB
  },
  ASPECT_RATIO: 16 / 9,
  ASPECT_RATIO_TOLERANCE: 0.01,
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
}));

import { FileUpload } from "../FileUpload";

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    DragUpload: () => <svg data-testid="drag-upload" />,
    Trash: () => <svg data-testid="trash-icon" />,
    VideoCamera: () => <svg data-testid="video-camera" />,
  };
});

// Mock ImageLibrary to avoid Redux/RTK Query dependency (useGetImageLibraryQuery)
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    ImageLibrary: () => null,
  };
});

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: any[]) => toastError(...args),
    success: (...args: any[]) => toastSuccess(...args),
  },
}));

const putSpy = vi.fn();
vi.mock("axios", () => ({
  default: {
    put: (...args: any[]) => putSpy(...args),
  },
}));

const getCoverImageUrlMock = vi.fn();
const deleteCoverImageMock = vi.fn();
const getCoverVideoUrlMock = vi.fn();
const deleteCoverVideoMock = vi.fn();
const generateCoverImageMock = vi.fn();
vi.mock("@api", async importOriginal => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    // Mock both mutations to avoid requiring a Redux Provider in tests
    useGetCoverImageUrlMutation: () => [
      () => ({
        unwrap: () => getCoverImageUrlMock(),
      }),
    ],
    useDeleteCoverImageMutation: () => [
      () => ({
        unwrap: () => deleteCoverImageMock(),
      }),
    ],
    useGetCoverVideoUrlMutation: () => [
      () => ({
        unwrap: () => getCoverVideoUrlMock(),
      }),
    ],
    useDeleteCoverVideoMutation: () => [
      () => ({
        unwrap: () => deleteCoverVideoMock(),
      }),
    ],
    useGenerateCoverImageMutation: () => [
      () => ({
        unwrap: () => generateCoverImageMock(),
      }),
      { isLoading: false },
    ],
  };
});

// Mock react-dropzone to provide minimal API
const openSpy = vi.fn();
vi.mock("react-dropzone", () => ({
  useDropzone: ({ onDrop }: any) => ({
    getRootProps: () => ({ onClick: vi.fn() }),
    getInputProps: () => ({ onChange: (e: any) => onDrop(e.target.files) }),
    isDragActive: false,
    open: (...args: any[]) => openSpy(...args),
  }),
}));

// Helpers
function createFile(name: string, type: string, size: number) {
  const blob = new Blob(["x".repeat(size)], { type });
  return new File([blob], name, { type });
}

// Mock URL.createObjectURL
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock"),
  revokeObjectURL: vi.fn(),
});

// Mock Image to control onload and dimensions
class MockImage {
  onload: any;
  _src: string = "";
  set src(val: string) {
    this._src = val;
    // Defer to allow test code to assign onload after src set
    setTimeout(() => {
      if (typeof this.onload === "function") this.onload();
    }, 0);
  }
  get src() {
    return this._src;
  }
}
// Default intrinsic size; tests can override via MockImage.prototype.width/height
(MockImage as any).prototype.width = 1600;
(MockImage as any).prototype.height = 900;
(global as any).Image = MockImage as any;

describe("FileUpload", () => {
  const id = "coverImage";
  let valueStore: Record<string, any>;
  let setValue: any;
  let setError: any;
  let clearErrors: any;
  let register: any;
  let formState: any;

  const makeFormMethods = () => ({
    setValue,
    setError,
    clearErrors,
    register,
    watch: (key: string) => valueStore[key],
    formState,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    valueStore = {};
    setValue = vi.fn((key: string, val: any) => {
      valueStore[key] = val;
    });
    setError = vi.fn();
    clearErrors = vi.fn();
    register = vi.fn(() => ({}));
    formState = { errors: {} };
    (putSpy as any).mockResolvedValue({ status: 200 });
    (getCoverImageUrlMock as any).mockResolvedValue({
      presignedUrl: "https://s3/upload",
      coverImageUrl: "https://cdn/image.jpg",
    });
  });

  it("renders label and required asterisk when mandatory", () => {
    render(<FileUpload id={id} formMethods={makeFormMethods()} isMandatory={true} label="Cover" />);

    expect(screen.getByLabelText(/file/i)).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByTestId("drag-upload")).toBeInTheDocument();
  });

  it("rejects invalid file type with error", async () => {
    render(
      <FileUpload id={id} formMethods={makeFormMethods()} isMandatory={false} label="Cover" />,
    );

    const input = screen
      .getByLabelText(/file/i)
      .parentElement!.parentElement!.querySelector(`input#${id}[type="file"]`) as HTMLInputElement;

    const badFile = createFile("doc.pdf", "application/pdf", 1000);
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(setError).toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("File must be JPEG or PNG.");
  });

  it("rejects file larger than 2MB", () => {
    render(
      <FileUpload id={id} formMethods={makeFormMethods()} isMandatory={false} label="Cover" />,
    );

    const input = screen
      .getByLabelText(/file/i)
      .parentElement!.parentElement!.querySelector(`input#${id}[type="file"]`) as HTMLInputElement;

    const bigFile = createFile("big.jpg", "image/jpeg", 2 * 1024 * 1024 + 1);
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(setError).toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("File must be under 2MB.");
  });

  it("rejects image with non 16:9 aspect ratio", async () => {
    // Change mock dimensions
    (MockImage as any).prototype.width = 1000;
    (MockImage as any).prototype.height = 500; // 2:1 ratio

    render(
      <FileUpload id={id} formMethods={makeFormMethods()} isMandatory={false} label="Cover" />,
    );

    const input = screen
      .getByLabelText(/file/i)
      .parentElement!.parentElement!.querySelector(`input#${id}[type="file"]`) as HTMLInputElement;

    const okSizeFile = createFile("ok.jpg", "image/jpeg", 1000);
    fireEvent.change(input, { target: { files: [okSizeFile] } });

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(id, {
        type: "manual",
        message: "Image must have a 16:9 aspect ratio.",
      });
    });
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("uploads valid image and sets value", async () => {
    // Valid 16:9
    (MockImage as any).prototype.width = 1600;
    (MockImage as any).prototype.height = 900;

    render(
      <FileUpload id={id} formMethods={makeFormMethods()} isMandatory={false} label="Cover" />,
    );

    const input = screen
      .getByLabelText(/file/i)
      .parentElement!.parentElement!.querySelector(`input#${id}[type="file"]`) as HTMLInputElement;

    const goodFile = createFile("good.jpg", "image/jpeg", 1000);
    fireEvent.change(input, { target: { files: [goodFile] } });

    // uploading indicator shows at some point
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalled();
      expect(setValue).toHaveBeenCalledWith(id, "https://cdn/image.jpg", { shouldValidate: true });
    });
  });

  it("sets cover URL without S3 PUT when API returns no presigned URL (mock / local dev)", async () => {
    (MockImage as any).prototype.width = 1600;
    (MockImage as any).prototype.height = 900;
    (getCoverImageUrlMock as any).mockResolvedValue({
      presignedUrl: "",
      coverImageUrl: "https://example.com/mock-only.png",
    });

    render(
      <FileUpload id={id} formMethods={makeFormMethods()} isMandatory={false} label="Cover" />,
    );

    const input = screen
      .getByLabelText(/file/i)
      .parentElement!.parentElement!.querySelector(`input#${id}[type="file"]`) as HTMLInputElement;

    const goodFile = createFile("good.jpg", "image/jpeg", 1000);
    fireEvent.change(input, { target: { files: [goodFile] } });

    await waitFor(() => {
      expect(putSpy).not.toHaveBeenCalled();
      expect(setValue).toHaveBeenCalledWith(id, "https://example.com/mock-only.png", {
        shouldValidate: true,
      });
    });

    (getCoverImageUrlMock as any).mockResolvedValue({
      presignedUrl: "https://s3/upload",
      coverImageUrl: "https://cdn/image.jpg",
    });
  });

  it("deletes uploaded image and clears value", () => {
    // Simulate existing uploaded image via watch
    valueStore[id] = "https://cdn/image.jpg";
    render(
      <FileUpload id={id} formMethods={makeFormMethods()} isMandatory={false} label="Cover" />,
    );

    const deleteBtn = screen.getByTestId("trash-icon").closest("button") as HTMLButtonElement;
    fireEvent.click(deleteBtn);
    expect(setValue).toHaveBeenCalledWith(id, null);
  });
});
