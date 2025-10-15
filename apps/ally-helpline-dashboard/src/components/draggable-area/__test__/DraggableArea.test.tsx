import { render, screen } from "@testing-library/react";
import { useDropzone, Accept, FileRejection } from "react-dropzone";
import { describe, it, expect, vi, beforeEach } from "vitest";

import DraggableArea from "../DraggableArea";
import { DraggableAreaProps } from "../types";

vi.mock("@assets", () => ({
  FileUpload: () => <div data-testid="file-upload-icon">Mock FileUpload Icon</div>,
}));

vi.mock("@utils", () => ({
  formatSizeByByteSize: vi.fn((size: number) => {
    if (size === 10485760) return "10 MB";
    return `${Math.round(size / 1024 / 1024)} MB`;
  }),
  getErrorToastMessageForFileUpload: vi.fn(),
}));

let capturedOnDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
const mockOpen = vi.fn();
const mockGetRootProps = vi.fn((props = {}) => ({ ...props, "data-testid": "root-dropzone" }));
const mockGetInputProps = vi.fn(() => ({}));

vi.mock("react-dropzone", () => ({
  useDropzone: vi.fn((options: any) => {
    // Capture the onDrop function passed by the component to simulate a drop
    capturedOnDrop = options.onDrop;
    return {
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: false, // Default state for testing rendering
      open: mockOpen,
    };
  }),
  // Export required types from the actual module
  Accept: {} as Accept,
  FileRejection: {} as FileRejection,
}));

const getAllowedUniqueExtensionsDisplay = (accept: Accept): string => {
  const extensions = Object.values(accept)
    .flat()
    .map(ext => ext.replace(/^\./, "").toUpperCase())
    .filter((ext, index, self) => self.indexOf(ext) === index);

  if (extensions.length === 0) return "";
  if (extensions.length === 1) return extensions[0];
  return `${extensions.slice(0, -1).join(", ")} or ${extensions[extensions.length - 1]}`;
};

const mockAccept: Accept = {
  "image/jpeg": [".jpg", ".jpeg"],
  "application/pdf": [".pdf"],
  "text/csv": [".csv"],
};
const mockSize = 10485760; // 10MB
const mockOnDropAccepted = vi.fn();
const mockOnDropRejected = vi.fn();

const defaultProps: DraggableAreaProps = {
  supportedExtensions: mockAccept,
  sizeInBytes: mockSize,
  onDropAccepted: mockOnDropAccepted,
  onDropRejected: mockOnDropRejected,
  allowMultiple: false,
};

// --- TEST SUITE ---

describe("DraggableArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllowedUniqueExtensionsDisplay utility function", () => {
    it('should correctly format multiple unique extensions, using "or" for the last one', () => {
      expect(getAllowedUniqueExtensionsDisplay(mockAccept)).toBe("JPG, JPEG, PDF or CSV");
    });

    it("should return an empty string for an empty accept object", () => {
      expect(getAllowedUniqueExtensionsDisplay({})).toBe("");
    });
  });

  describe("Component Rendering and Prop Passing", () => {
    it("should render the correct descriptive text using formatted extensions and size", () => {
      render(<DraggableArea {...defaultProps} />);

      // Expected text calculation:
      // Extensions: JPG, JPEG, PDF or CSV (from mockAccept)
      // Size: 10 MB (from mocked formatSizeByByteSize)
      const expectedText = "Drag & drop or choose a JPG, JPEG, PDF or CSV file under 10 MB";

      // Check for the descriptive text content
      expect(screen.getByText(/Drag & drop or/)).toHaveTextContent(expectedText);
      expect(screen.getByTestId("file-upload-icon")).toBeInTheDocument();
      // Check for the hidden file input
      expect(screen.getByRole("textbox", { hidden: true })).toBeInTheDocument();
    });

    it("should pass correct options to useDropzone, including maximum size and accept", () => {
      render(<DraggableArea {...defaultProps} allowMultiple={true} />);

      // Check if useDropzone was called with the correct configuration
      expect(useDropzone).toHaveBeenCalledWith({
        noKeyboard: true,
        multiple: true, // Should be true
        onDrop: expect.any(Function),
        accept: mockAccept,
        maxSize: mockSize,
      });

      // Test when allowMultiple is false
      vi.clearAllMocks();
      render(<DraggableArea {...defaultProps} allowMultiple={false} />);

      expect(useDropzone).toHaveBeenCalledWith(
        expect.objectContaining({
          multiple: false,
        }),
      );
    });

    it("should correctly apply useDropzone props to the root and input elements", () => {
      render(<DraggableArea {...defaultProps} />);

      expect(mockGetRootProps).toHaveBeenCalled();
      expect(mockGetInputProps).toHaveBeenCalled();
      expect(screen.getByTestId("root-dropzone")).toBeInTheDocument();
    });
  });

  describe("Drop Handling Logic (onDrop callback)", () => {
    // Helper to create a mock File object
    const mockFile = (name: string, type: string, size: number): File =>
      ({
        name,
        type,
        size,
        lastModified: Date.now(),
        arrayBuffer: vi.fn(),
        slice: vi.fn(),
        stream: vi.fn(),
        text: vi.fn(),
      }) as unknown as File;

    it("should call onDropAccepted with acceptedFiles when they are present", () => {
      render(<DraggableArea {...defaultProps} />);

      const acceptedFiles = [mockFile("document.pdf", "application/pdf", 500000)];
      const rejectedFiles: FileRejection[] = [];

      // Manually invoke the captured onDrop function
      capturedOnDrop(acceptedFiles, rejectedFiles);

      // Assert the accepted handler was called with the correct files
      expect(mockOnDropAccepted).toHaveBeenCalledTimes(1);
      expect(mockOnDropAccepted).toHaveBeenCalledWith(acceptedFiles);
      expect(mockOnDropRejected).not.toHaveBeenCalled();
    });

    it("should NOT call onDropAccepted when acceptedFiles array is empty", () => {
      render(<DraggableArea {...defaultProps} />);

      const acceptedFiles: File[] = [];
      const rejectedFiles: FileRejection[] = [
        {
          file: mockFile("large_file.zip", "application/zip", mockSize + 1),
          errors: [{ code: "file-too-large", message: "File is too large" }],
        },
      ];

      // Manually invoke the captured onDrop function
      capturedOnDrop(acceptedFiles, rejectedFiles);

      // Assert the accepted handler was NOT called
      expect(mockOnDropAccepted).not.toHaveBeenCalled();
      // The component's logic does not explicitly call onDropRejected, only onDropAccepted.
    });
  });
});
