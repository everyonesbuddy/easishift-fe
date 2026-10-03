import { jsPDF } from "jspdf";
import { trackEvent } from "../../utils/analytics";

const COLORS = {
  navy: [15, 23, 42],
  blue: [37, 99, 235],
  teal: [15, 118, 110],
  paleBlue: [239, 246, 255],
  paleGreen: [236, 253, 245],
  ink: [15, 23, 42],
  muted: [71, 85, 105],
  rule: [203, 213, 225],
  white: [255, 255, 255],
};

const drawSectionTitle = (doc, title, x, y) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  doc.text(title, x, y);
};

const drawTwoColumnRows = (doc, rows, x, y, width) => {
  const columnGap = 18;
  const columnWidth = (width - columnGap) / 2;
  const rowHeight = 22;

  rows.forEach(([label, value], index) => {
    const column = Math.floor(index / Math.ceil(rows.length / 2));
    const row = index % Math.ceil(rows.length / 2);
    const cellX = x + column * (columnWidth + columnGap);
    const rowY = y + row * rowHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      doc.splitTextToSize(String(label), columnWidth * 0.58)[0],
      cellX,
      rowY,
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.ink);
    doc.text(
      doc.splitTextToSize(String(value), columnWidth * 0.38)[0],
      cellX + columnWidth,
      rowY,
      { align: "right" },
    );
  });

  return y + Math.ceil(rows.length / 2) * rowHeight;
};

const drawFullWidthRows = (doc, rows, x, y, width) => {
  const rowHeight = 19;

  rows.forEach(([label, value], index) => {
    const rowY = y + index * rowHeight;
    doc.setFont("helvetica", index === rows.length - 1 ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(String(label), x, rowY);
    doc.setTextColor(...COLORS.ink);
    doc.text(String(value), x + width, rowY, { align: "right" });
    if (index < rows.length - 1) {
      doc.setDrawColor(...COLORS.rule);
      doc.setLineWidth(0.5);
      doc.line(x, rowY + 5, x + width, rowY + 5);
    }
  });

  return y + rows.length * rowHeight;
};

const safeFilePart = (value) =>
  String(value || "facility")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "facility";

export const downloadCalculatorPdf = ({
  calculatorTitle,
  filePrefix,
  companyName,
  costLabel,
  totalCost,
  potentialSavings,
  reductionPercent,
  inputs,
  costs,
  featureSummary,
  calculatorUrl,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;

  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 140, "F");
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(margin, 29, 5, 21, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text("WiserShifts", margin + 14, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254);
  doc.text("WORKFORCE COST BRIEF", pageWidth - margin, 43, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.white);
  doc.text(calculatorTitle, margin, 83);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(
    companyName?.trim()
      ? `Prepared for ${companyName.trim()}`
      : "Prepared for your facility",
    margin,
    111,
  );
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pageWidth - margin,
    111,
    { align: "right" },
  );

  doc.setFillColor(...COLORS.paleBlue);
  doc.roundedRect(margin, 158, contentWidth, 92, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.blue);
  doc.text("WHAT YOU COULD SAVE WITH WISERSHIFTS", margin + 18, 181);
  doc.setFontSize(29);
  doc.setTextColor(...COLORS.navy);
  doc.text(potentialSavings, margin + 18, 218);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `Illustrative scenario: ${reductionPercent}% modeled reduction in addressable costs`,
    margin + 18,
    237,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(costLabel, pageWidth - margin - 18, 188, {
    align: "right",
    maxWidth: 165,
  });
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.ink);
  doc.text(totalCost, pageWidth - margin - 18, 211, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("Current estimated annual cost", pageWidth - margin - 18, 229, {
    align: "right",
  });

  let y = 278;
  drawSectionTitle(doc, "Scenario inputs", margin, y);
  y = drawTwoColumnRows(doc, inputs, margin, y + 21, contentWidth) + 8;

  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 23;
  drawSectionTitle(doc, "Annual cost breakdown", margin, y);
  y = drawFullWidthRows(doc, costs, margin, y + 21, contentWidth) + 13;

  const featureLines = doc.splitTextToSize(featureSummary, contentWidth - 34);
  const featureHeight = Math.max(73, 38 + featureLines.length * 13);
  doc.setFillColor(...COLORS.paleGreen);
  doc.roundedRect(margin, y, contentWidth, featureHeight, 7, 7, "F");
  doc.setFillColor(...COLORS.teal);
  doc.rect(margin, y, 4, featureHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.teal);
  doc.text("HOW WISERSHIFTS HELPS", margin + 17, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  doc.text(featureLines, margin + 17, y + 39);
  y += featureHeight + 17;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.navy);
  doc.text("Build a schedule your team can act on.", margin, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.blue);
  const ctaText = "Explore WiserShifts and book your free scheduling audit";
  doc.textWithLink(ctaText, margin, y + 28, { url: calculatorUrl });
  y += 48;

  const disclaimer =
    "Savings are an illustrative scenario based on the assumptions shown, not a guarantee or a verified customer outcome. Actual results depend on staffing, adoption, and coverage needs. WiserShifts supports scheduling and shift coverage; it does not eliminate the need for staff.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(disclaimerLines, margin, y + 8);

  doc.setDrawColor(...COLORS.rule);
  doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    "WiserShifts | Clearer schedules. Faster coverage.",
    margin,
    pageHeight - 21,
  );

  doc.save(
    `${safeFilePart(companyName)}-${safeFilePart(filePrefix)}-summary.pdf`,
  );
  const calculatorTypes = {
    "call-out-cost": "call_out_cost",
    "overtime-cost": "overtime_cost",
    "payroll-accuracy": "time_clock_accuracy",
  };
  trackEvent("file_download", {
    asset_type: "calculator_report",
    file_extension: "pdf",
    calculator_type: calculatorTypes[filePrefix] || "other",
  });
};
