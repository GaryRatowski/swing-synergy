import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ProgressReport, ReportData } from "@/hooks/useProgressReports";

function getScoreInterpretation(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Improvement";
}

export async function generateProgressReportPdf(
  report: ProgressReport,
  clientName: string
): Promise<void> {
  const doc = new jsPDF();
  const data = report.report_data;

  // Colors
  const primaryColor: [number, number, number] = [26, 60, 52]; // Golf green
  const textColor: [number, number, number] = [30, 30, 30];
  const mutedColor: [number, number, number] = [100, 100, 100];

  let yPos = 20;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 50, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Progress Report", 105, 25, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(report.period_start), "MMMM yyyy"), 105, 35, { align: "center" });

  doc.setFontSize(12);
  doc.text(clientName, 105, 45, { align: "center" });

  yPos = 60;

  // Report period
  doc.setTextColor(...mutedColor);
  doc.setFontSize(10);
  doc.text(
    `Report Period: ${format(new Date(report.period_start), "MMM d")} - ${format(new Date(report.period_end), "MMM d, yyyy")}`,
    105,
    yPos,
    { align: "center" }
  );

  yPos += 15;

  // Summary Stats
  doc.setTextColor(...textColor);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 20, yPos);
  yPos += 10;

  const summaryData = [
    ["Sessions Completed", `${data.summary.total_sessions} / ${data.summary.expected_sessions}`],
    ["Compliance Rate", `${data.summary.compliance_rate.toFixed(0)}%`],
    ["Top Achievement", data.summary.top_achievement],
    ["Overall Rating", data.summary.overall_rating]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255]
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { cellWidth: 120 }
    }
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Performance Metrics
  if (data.metrics.length > 0) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Performance Metrics", 20, yPos);
    yPos += 10;

    const metricsData = data.metrics.map((metric) => [
      metric.metric_name,
      `${metric.start_value}${metric.unit}`,
      `${metric.end_value}${metric.unit}`,
      `${metric.change_percent > 0 ? "+" : ""}${metric.change_percent.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Start", "End", "Change"]],
      body: metricsData,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255]
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      didParseCell: (hookData) => {
        // Color the change column
        if (hookData.column.index === 3 && hookData.section === "body") {
          const value = parseFloat(hookData.cell.text[0]);
          if (value > 0) {
            hookData.cell.styles.textColor = [34, 197, 94]; // Green
          } else if (value < 0) {
            hookData.cell.styles.textColor = [239, 68, 68]; // Red
          }
        }
      }
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Weekly Compliance
  if (data.compliance.weekly_breakdown.length > 0) {
    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Weekly Compliance", 20, yPos);
    yPos += 10;

    const weeklyData = data.compliance.weekly_breakdown.map((week) => [
      `Week ${week.week_number}`,
      `${week.completed} / ${week.expected}`,
      `${((week.completed / Math.max(week.expected, 1)) * 100).toFixed(0)}%`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Week", "Sessions", "Completion"]],
      body: weeklyData,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255]
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      }
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Achievements
  if (data.achievements.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("🏆 Achievements", 20, yPos);
    yPos += 10;

    data.achievements.forEach((achievement) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(`• ${achievement.title}`, 25, yPos);
      yPos += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedColor);
      doc.text(achievement.description, 30, yPos);
      yPos += 8;
    });

    yPos += 5;
  }

  // Coach Notes
  if (data.coach_notes) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text("Coach Notes", 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);

    const splitNotes = doc.splitTextToSize(data.coach_notes, 170);
    doc.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 5 + 10;
  }

  // Goals
  if (data.next_month_goals.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text("Goals for Next Month", 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);

    data.next_month_goals.forEach((goal) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`→ ${goal}`, 25, yPos);
      yPos += 6;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(
      `Generated on ${format(new Date(), "MMM d, yyyy")} | Page ${i} of ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }

  // Save
  const fileName = `progress-report-${clientName.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(report.period_end), "yyyy-MM")}.pdf`;
  doc.save(fileName);
}
