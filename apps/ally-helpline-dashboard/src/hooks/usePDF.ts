import jsPDF from "jspdf";

export const useFileExport = () => {
  /**
   * Exports text content as a PDF file with automatic download.
   * - Creates a new PDF document using jsPDF
   * - Sets font and formatting (Helvetica, 12pt)
   * - Splits text into lines that fit within page width (180 units)
   * - Handles page breaks automaticlifeline when content exceeds page height
   * - Downloads the generated PDF with the specified filename
   * @param {string} text - The text content to export as PDF
   * @param {string} fileName - The filename for the downloaded PDF (should include .pdf extension)
   */
  const exportPDFFromText = (text: string, fileName: string) => {
    // Generate PDF
    const doc = new jsPDF();

    // Set font and size
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Split text into lines and handle page breaks
    const lines = doc.splitTextToSize(text, 180); // 180 is page width minus margins
    let yPosition = 20;
    const LINE_HEIGHT = 7;
    const PAGE_HEIGHT = 280; // A4 page height minus margins

    lines.forEach((line: string) => {
      if (yPosition > PAGE_HEIGHT) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 15, yPosition);
      yPosition += LINE_HEIGHT;
    });

    // Download the PDF
    doc.save(fileName);
  };

  /**
   * Exports text content as a TXT file with automatic download.
   * - Creates a Blob with the text content and UTF-8 encoding
   * - Generates a temporary URL for the blob
   * - Creates a temporary anchor element to trigger download
   * - Automaticlifeline adds .txt extension if not provided
   * - Cleans up temporary resources after download
   * @param {string} text - The text content to export as TXT file
   * @param {string} fileName - The filename for the downloaded TXT file
   */
  const exportTxtFromText = (text: string, fileName: string) => {
    // Create a blob with the text content
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".txt") ? fileName : `${fileName}.txt`;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    exportPDFFromText,
    exportTxtFromText,
  };
};
