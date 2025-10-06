import React from "react";

import { render } from "@testing-library/react";
import jsPDF from "jspdf";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import { useFileExport } from "../usePDF";

vi.mock("jspdf", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      splitTextToSize: vi.fn(() => ["line1", "line2"]),
      addPage: vi.fn(),
      text: vi.fn(),
      save: vi.fn(),
    })),
  };
});

const Harness = ({ onReady }: { onReady: (api: ReturnType<typeof useFileExport>) => void }) => {
  const api = useFileExport();
  React.useEffect(() => {
    onReady(api);
    return () => {};
  }, [api, onReady]);
  return null;
};

describe("useFileExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure URL helpers exist in JSDOM
    (URL as any).createObjectURL = (URL as any).createObjectURL || vi.fn(() => "blob:xyz");
    (URL as any).revokeObjectURL = (URL as any).revokeObjectURL || vi.fn();
  });

  it("exports PDF using jsPDF and calls save", () => {
    let api!: ReturnType<typeof useFileExport>;
    render(<Harness onReady={a => (api = a)} />);

    api.exportPDFFromText("hello world", "file.pdf");

    const jsPDFMock = jsPDF as unknown as Mock;
    const instance = jsPDFMock.mock.results[0].value;
    expect(instance.setFont).toHaveBeenCalled();
    expect(instance.text).toHaveBeenCalled();
    expect(instance.save).toHaveBeenCalledWith("file.pdf");
  });

  it("exports TXT by creating a blob and link", () => {
    const createObjectURLSpy = vi.spyOn(URL as any, "createObjectURL");
    const revokeSpy = vi.spyOn(URL as any, "revokeObjectURL");

    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");

    const anchor = document.createElement("a");
    const clickSpy = vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor as any);

    let api!: ReturnType<typeof useFileExport>;
    render(<Harness onReady={a => (api = a)} />);

    api.exportTxtFromText("content", "report");

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();
  });
});
