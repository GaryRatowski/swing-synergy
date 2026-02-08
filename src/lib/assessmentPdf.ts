import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { getScoreInterpretation, type ScoringThresholds } from "./assessmentScoring";

interface ChecklistItem {
  name: string;
  type: string;
  unit?: string;
}

interface AssessmentData {
  templateName: string;
  clientName: string;
  assessedDate: string;
  assessorName: string;
  results: Record<string, any>;
  calculatedScores: Record<string, number>;
  notes: string | null;
  checklistItems: ChecklistItem[];
  scoringThresholds?: ScoringThresholds;
}

export async function generateAssessmentPdf(data: AssessmentData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Assessment Report", pageWidth / 2, 25, { align: "center" });

  // Template name
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(data.templateName, pageWidth / 2, 35, { align: "center" });

  // Client and date info
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Client: ${data.clientName}`, 20, 50);
  doc.text(`Date: ${format(new Date(data.assessedDate), "MMMM d, yyyy")}`, 20, 57);
  doc.text(`Assessed by: ${data.assessorName}`, 20, 64);

  let currentY = 75;

  // Calculated Scores Section
  if (Object.keys(data.calculatedScores).length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Scores Summary", 20, currentY);
    currentY += 8;

    const thresholds = data.scoringThresholds || { poor: 40, fair: 60, good: 80 };
    const scoreData = Object.entries(data.calculatedScores).map(([key, value]) => {
      const interpretation = getScoreInterpretation(value, thresholds);
      return [
        key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        String(value),
        interpretation.label,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Category", "Score", "Rating"]],
      body: scoreData,
      theme: "grid",
      headStyles: { fillColor: [34, 139, 34] },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "center" },
      },
      margin: { left: 20, right: 20 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Detailed Results Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Detailed Results", 20, currentY);
  currentY += 8;

  const resultData = data.checklistItems.map((item) => {
    let value = data.results[item.name];
    
    // Format value for display
    if (value === "pass") {
      value = "✓ Pass";
    } else if (value === "fail") {
      value = "✗ Fail";
    } else if (typeof value === "string" && value.includes("/")) {
      // File path
      value = "📎 File attached";
    } else if (value === undefined || value === null) {
      value = "—";
    } else if (item.unit) {
      value = `${value} ${item.unit}`;
    }

    return [item.name, String(value)];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Assessment Item", "Result"]],
    body: resultData,
    theme: "striped",
    headStyles: { fillColor: [34, 139, 34] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 100 },
    },
    margin: { left: 20, right: 20 },
    styles: {
      cellPadding: 5,
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Notes Section
  if (data.notes) {
    // Check if we need a new page
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Notes & Recommendations", 20, currentY);
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);

    // Split notes into lines that fit the page width
    const maxWidth = pageWidth - 40;
    const lines = doc.splitTextToSize(data.notes, maxWidth);
    doc.text(lines, 20, currentY);
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${format(new Date(), "MMM d, yyyy 'at' h:mm a")} • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const fileName = `assessment-${data.clientName.replace(/\s+/g, "-")}-${format(
    new Date(data.assessedDate),
    "yyyy-MM-dd"
  )}.pdf`;
  doc.save(fileName);
}
