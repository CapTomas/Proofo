import { jsPDF } from "jspdf";
import { Deal } from "@/types";
import { formatDateTime } from "./crypto";

/**
 * PDF Generation utility for Proofo deal receipts
 * Creates professional legal-grade PDF documents with:
 * - Proofo branding header
 * - Deal terms formatted nicely
 * - Signature image embedded
 * - Cryptographic seal (SHA-256 hash)
 * - Verification link with QR placeholder
 * - Timestamp and metadata
 */

type ThemeType = "light" | "dark";

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  success: string;
}

const THEMES: Record<ThemeType, ThemeColors> = {
  light: {
    background: "#f9f9f9",
    card: "#ffffff",
    text: "#111111",
    textSecondary: "#444444",
    textMuted: "#888888",
    border: "#e1e1e1",
    primary: "#111111",
    success: "#10b981",
  },
  dark: {
    background: "#0a0a0a",
    card: "#121212",
    text: "#ededed",
    textSecondary: "#bcbcbc",
    textMuted: "#666666",
    border: "#262626",
    primary: "#ededed", // In dark mode, primary text is white/light
    success: "#059669",
  },
};

// PDF dimensions and margins (A4 in mm)
const PAGE = {
  width: 210,
  height: 297,
  margin: 20,
  contentWidth: 170, // 210 - 2 * 20
};

// Typography constants
const FONTS = {
  header: {
    size: 24,
    style: "bold",
  },
  title: {
    size: 16,
    style: "bold",
  },
  subtitle: {
    size: 10,
    style: "normal",
  },
  body: {
    size: 10,
    style: "normal",
  },
  bodyBold: {
    size: 10,
    style: "bold",
  },
  small: {
    size: 8,
    style: "normal",
  },
};

interface GeneratePDFOptions {
  deal: Deal;
  signatureDataUrl?: string;
  isPro?: boolean;
  verificationUrl?: string;
  theme?: ThemeType;
}

/**
 * Generate a PDF receipt for a sealed deal
 * @param options - Configuration options for PDF generation
 * @returns Base64 encoded PDF data or blob URL
 */
export async function generateDealPDF(options: GeneratePDFOptions): Promise<{
  pdfBlob: Blob;
  pdfBase64: string;
}> {
  const {
    deal,
    signatureDataUrl,
    isPro = false,
    verificationUrl,
    theme = "light",
  } = options;

  const colors = THEMES[theme];

  // Create new PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set background color
  doc.setFillColor(colors.background);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  let yPosition = PAGE.margin;

  // === HEADER SECTION ===
  yPosition = drawHeader(doc, yPosition, isPro, colors);

  // === DEAL CARD ===
  yPosition = drawDealCard(doc, yPosition, deal, colors);

  // === TERMS CARD ===
  // Check if we need a new page for terms
  if (yPosition > PAGE.height - 100) {
    doc.addPage();
    doc.setFillColor(colors.background);
    doc.rect(0, 0, PAGE.width, PAGE.height, "F");
    yPosition = PAGE.margin;
  }
  yPosition = drawTermsCard(doc, yPosition, deal, colors);

  // === SIGNATURE CARD ===
  if (signatureDataUrl || deal.signatureUrl) {
    // Check page break
    if (yPosition > PAGE.height - 60) {
      doc.addPage();
      doc.setFillColor(colors.background);
      doc.rect(0, 0, PAGE.width, PAGE.height, "F");
      yPosition = PAGE.margin;
    }

    yPosition = await drawSignatureCard(
      doc,
      yPosition,
      signatureDataUrl || deal.signatureUrl || "",
      colors
    );
  }

  // === SEAL & FOOTER ===
  drawSealAndFooter(doc, deal, verificationUrl, isPro, colors);

  // Generate outputs
  const pdfBlob = doc.output("blob");
  const pdfBase64 = doc.output("datauristring");

  return { pdfBlob, pdfBase64 };
}

/**
 * Draw the minimal header
 */
function drawHeader(
  doc: jsPDF,
  y: number,
  isPro: boolean,
  colors: ThemeColors
): number {
  // Logo / Brand Name
  doc.setTextColor(colors.primary);
  doc.setFontSize(FONTS.header.size);
  doc.setFont("helvetica", "bold");
  doc.text("Proofo.", PAGE.margin, y + 8);

  // Document Label
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.textMuted);
  doc.text("SEALED AGREEMENT", PAGE.width - PAGE.margin, y + 8, {
    align: "right",
  });

  return y + 25;
}

/**
 * Draw the Deal Overview Card
 */
function drawDealCard(
  doc: jsPDF,
  y: number,
  deal: Deal,
  colors: ThemeColors
): number {
  const cardStart = y;

  // Title Label
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.textMuted);
  doc.text("DEAL OVERVIEW", PAGE.margin, y);
  y += 5;

  // Draw Card Background (placeholder height, will redraw)
  // We'll calculate height after content
  const contentStartY = y;
  let currentY = contentStartY + 10;

  // --- Content Calculation ---

  // Deal Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.text);
  doc.text(deal.title, PAGE.margin + 6, currentY);
  currentY += 8;

  // Deal Description
  if (deal.description) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.textSecondary);
    const descLines = doc.splitTextToSize(deal.description, PAGE.contentWidth - 12);
    doc.text(descLines, PAGE.margin + 6, currentY);
    currentY += descLines.length * 4 + 6;
  } else {
    currentY += 4;
  }

  // Divider
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.2);
  doc.line(PAGE.margin + 6, currentY, PAGE.width - PAGE.margin - 6, currentY);
  currentY += 8;

  // Parties Grid (Simple 2-column)
  const colWidth = (PAGE.contentWidth - 12) / 2;

  // Key: Creator
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.textMuted);
  doc.text("CREATOR", PAGE.margin + 6, currentY);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.text);
  doc.text(deal.creatorName, PAGE.margin + 6, currentY + 6);

  // Key: Recipient
  doc.text("RECIPIENT", PAGE.margin + 6 + colWidth, currentY);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.text);
  doc.text(deal.recipientName || "—", PAGE.margin + 6 + colWidth, currentY + 6);

  currentY += 16;


  // --- Draw Card Rect ---
  const cardHeight = currentY - contentStartY;
  doc.setFillColor(colors.card);
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.3); // Subtle border

  // We draw the rect BEHIND the text by moving up the logic or just redrawing (painful in jsPDF).
  // Better approach: calculate height first then draw.
  // Since we already calculated 'currentY', let's draw the rect now at z-index -1 logic...
  // jsPDF paints painter's algorithm. So we must draw rect FIRST.
  // Re-running the paint logic is safest.

  // Reset Y for drawing
  const cardY = contentStartY;
  doc.roundedRect(PAGE.margin, cardY, PAGE.contentWidth, cardHeight, 3, 3, "FD");

  // Re-draw Text (Yes, duplicate code, but cleaner than complex layout engines for raw jsPDF)
  let drawY = cardY + 10;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.text);
  doc.text(deal.title, PAGE.margin + 6, drawY);
  drawY += 8;

  // Description
  if (deal.description) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.textSecondary);
    const descLines = doc.splitTextToSize(deal.description, PAGE.contentWidth - 12);
    doc.text(descLines, PAGE.margin + 6, drawY);
    drawY += descLines.length * 4 + 6;
  } else {
    drawY += 4;
  }

  // Divider
  doc.setDrawColor(colors.border);
  doc.line(PAGE.margin + 6, drawY, PAGE.width - PAGE.margin - 6, drawY);
  drawY += 8;

  // Parties
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.textMuted);
  doc.text("CREATOR", PAGE.margin + 6, drawY);
  doc.text("RECIPIENT", PAGE.margin + 6 + colWidth, drawY);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.text);
  doc.text(deal.creatorName, PAGE.margin + 6, drawY + 6);
  doc.text(deal.recipientName || "—", PAGE.margin + 6 + colWidth, drawY + 6);

  return cardY + cardHeight + 12; // Return bottom + gap
}

/**
 * Draw Terms Card
 */
function drawTermsCard(
  doc: jsPDF,
  y: number,
  deal: Deal,
  colors: ThemeColors
): number {
  // Label area
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.textMuted);
  doc.text("TERMS AND CONDITIONS", PAGE.margin, y);
  y += 5;

  if (deal.terms.length === 0) return y;

  const cardStartY = y;
  let currentY = cardStartY + 8;
  const termLabelWidth = 60;
  const termValueWidth = PAGE.contentWidth - 12 - termLabelWidth;

  // Pre-calculate height
  let totalHeight = 16; // Padding top/bottom
  const lineHeights: number[] = [];

  deal.terms.forEach((term) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const valueLines = doc.splitTextToSize(term.value, termValueWidth);
    const h = Math.max(valueLines.length * 5, 6) + 6; // +6 for padding
    lineHeights.push(h);
    totalHeight += h;
  });

  // Draw Background
  doc.setFillColor(colors.card);
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE.margin, cardStartY, PAGE.contentWidth, totalHeight - 8, 3, 3, "FD"); // -8 adjustment

  // Draw Content
  currentY = cardStartY + 8;
  deal.terms.forEach((term, idx) => {
    const h = lineHeights[idx];

    // Label
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.textMuted);
    doc.text(term.label, PAGE.margin + 6, currentY + 4);

    // Value
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold"); // Bold for premium feel on values
    doc.setTextColor(colors.text);
    const valueLines = doc.splitTextToSize(term.value, termValueWidth);
    doc.text(valueLines, PAGE.margin + 6 + termLabelWidth, currentY + 4);

    // Divider line below (unless last)
    if (idx < deal.terms.length - 1) {
       doc.setDrawColor(colors.border);
       doc.setLineWidth(0.1);
       //  doc.line(PAGE.margin + 6, currentY + h - 3, PAGE.width - PAGE.margin - 6, currentY + h - 3);
    }

    currentY += h;
  });

  return currentY + 8;
}

/**
 * Draw Signature Section
 */
async function drawSignatureCard(
  doc: jsPDF,
  y: number,
  signatureUrl: string,
  colors: ThemeColors
): Promise<number> {
  // Label
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.textMuted);
  doc.text("SIGNATURE", PAGE.margin, y);
  y += 5;

  const cardHeight = 50;

  // Card BG
  doc.setFillColor(colors.card);
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE.margin, y, PAGE.contentWidth, cardHeight, 3, 3, "FD");

  // Signature Content
  const boxX = PAGE.margin + 6;
  const boxY = y + 6;
  const boxW = PAGE.contentWidth - 12;
  const boxH = cardHeight - 12;

  try {
    if (signatureUrl.startsWith("data:image")) {
       // Embed image
       doc.addImage(signatureUrl, "PNG", boxX, boxY, boxW < 100 ? boxW : 100, boxH, undefined, "FAST");
    } else if (signatureUrl) {
       // URL or placeholder
       doc.setFontSize(9);
       doc.setFont("helvetica", "italic");
       doc.setTextColor(colors.textMuted);
       doc.text("Digital Signature Recorded", boxX, boxY + 10);
    }
  } catch (e) {
      console.warn("Signature embed error", e);
  }

  return y + cardHeight + 12;
}


/**
 * Draw Bottom Seal & Footer
 */
function drawSealAndFooter(
  doc: jsPDF,
  deal: Deal,
  verificationUrl: string | undefined,
  isPro: boolean,
  colors: ThemeColors
): void {
  const footerH = 35;
  const footerY = PAGE.height - PAGE.margin - footerH;

  // If we are overlapping content, add a page
  // (Caller logic handles basic flow, but footer is absolute)

  // Seal Badge - Right aligned, floating above footer
  doc.setDrawColor(colors.success);
  doc.setFillColor(colors.success);
  doc.setLineWidth(0.5);
  // doc.roundedRect(PAGE.width - PAGE.margin - 40, footerY - 10, 40, 10, 5, 5, "F");

  // Draw detailed seal info
  const startX = PAGE.margin;

  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.setTextColor(colors.textMuted);
  doc.text(`ID: ${deal.publicId}`, startX, footerY);

  if (deal.dealSeal) {
      doc.text(`HASH: ${deal.dealSeal.substring(0, 32)}...`, startX, footerY + 4);
  }

  const dateStr = deal.confirmedAt
    ? formatDateTime(deal.confirmedAt)
    : formatDateTime(deal.createdAt);

  doc.text(`TIMESTAMP: ${dateStr}`, startX, footerY + 8);

  const verifyUrl = verificationUrl || `https://proofo.app/verify?id=${deal.publicId}`;
  doc.setTextColor(colors.primary);
  doc.textWithLink("VERIFY DOCUMENT ->", startX, footerY + 14, { url: verifyUrl });


  // Big PROOFO watermark if not pro
  if (!isPro) {
      // center page
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
      doc.setFontSize(60);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text);
      doc.text("PROOFO FREE", PAGE.width/2, PAGE.height/2, { align: 'center', angle: 45 });
      doc.restoreGraphicsState();
  }
}


export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generatePDFFilename(deal: Deal): string {
  const sanitizedTitle = deal.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  const date = new Date().toISOString().split("T")[0];
  return `proofo-${sanitizedTitle}-${date}.pdf`;
}

export async function pdfBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
