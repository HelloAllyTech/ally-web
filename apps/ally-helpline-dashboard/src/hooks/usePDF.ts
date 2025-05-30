import jsPDF from "jspdf";

const useFileExport = () => {
  const exportPDFFromText = (text: string, fileName: string) => {
    // Generate PDF
    const doc = new jsPDF();

    // Set font and size
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Split text into lines and handle page breaks
    const lines = doc.splitTextToSize(text, 180); // 180 is page width minus margins
    let yPosition = 20;
    const lineHeight = 7;
    const pageHeight = 280; // A4 page height minus margins

    lines.forEach((line: string) => {
      if (yPosition > pageHeight) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 15, yPosition);
      yPosition += lineHeight;
    });

    // Download the PDF
    doc.save(fileName);
  };

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

export default useFileExport;
