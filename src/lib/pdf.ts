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

// Proofo brand colors
const COLORS = {
  primary: "#6366f1", // Indigo-500
  primaryDark: "#4f46e5", // Indigo-600
  text: "#1f2937", // Gray-800
  textLight: "#6b7280", // Gray-500
  border: "#e5e7eb", // Gray-200
  success: "#10b981", // Emerald-500
  background: "#f9fafb", // Gray-50
};

// PDF dimensions and margins (A4 in mm)
const PAGE = {
  width: 210,
  height: 297,
  margin: 20,
  contentWidth: 170, // 210 - 2 * 20
};

interface GeneratePDFOptions {
  deal: Deal;
  signatureDataUrl?: string;
  isPro?: boolean;
  verificationUrl?: string;
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
  const { deal, signatureDataUrl, isPro = false, verificationUrl } = options;

  // Create new PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPosition = PAGE.margin;

  // === HEADER SECTION ===
  yPosition = drawHeader(doc, yPosition, isPro);

  // === DEAL TITLE SECTION ===
  yPosition = drawDealTitle(doc, yPosition, deal);

  // === PARTIES SECTION ===
  yPosition = drawPartiesSection(doc, yPosition, deal);

  // === TERMS SECTION ===
  yPosition = drawTermsSection(doc, yPosition, deal);

  // === SIGNATURE SECTION ===
  if (signatureDataUrl || deal.signatureUrl) {
    yPosition = await drawSignatureSection(
      doc,
      yPosition,
      signatureDataUrl || deal.signatureUrl || ""
    );
  }

  // === SEAL & VERIFICATION SECTION ===
  // Note: yPosition is updated but not used after this; this is intentional
  // as the footer uses fixed positioning
  void drawSealSection(doc, yPosition, deal, verificationUrl);

  // === FOOTER SECTION ===
  drawFooter(doc, deal, isPro);

  // Generate outputs
  const pdfBlob = doc.output("blob");
  const pdfBase64 = doc.output("datauristring");

  return { pdfBlob, pdfBase64 };
}

/**
 * Draw the header with Proofo branding
 */
function drawHeader(doc: jsPDF, y: number, isPro: boolean): number {
  // Draw header background
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, PAGE.width, 40, "F");

  // Proofo Logo (text-based for simplicity)
  doc.setTextColor("#ffffff");
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("Proofo", PAGE.margin, 22);

  // Tagline
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Evidence that holds up", PAGE.margin, 30);

  // Document type label
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SEALED AGREEMENT", PAGE.width - PAGE.margin, 22, { align: "right" });

  // Pro badge or watermark notice
  if (isPro) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("PRO", PAGE.width - PAGE.margin, 30, { align: "right" });
  }

  return 50; // Return new Y position after header
}

/**
 * Draw the deal title section
 */
function drawDealTitle(doc: jsPDF, y: number, deal: Deal): number {
  doc.setTextColor(COLORS.text);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(deal.title, PAGE.margin, y);
  y += 8;

  if (deal.description) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.textLight);
    const descLines = doc.splitTextToSize(deal.description, PAGE.contentWidth);
    doc.text(descLines, PAGE.margin, y);
    y += descLines.length * 5 + 5;
  }

  // Deal ID badge
  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  doc.text(`Deal ID: ${deal.publicId}`, PAGE.margin, y);
  y += 10;

  // Horizontal line
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
  y += 10;

  return y;
}

/**
 * Draw the parties section
 */
function drawPartiesSection(doc: jsPDF, y: number, deal: Deal): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text);
  doc.text("Parties Involved", PAGE.margin, y);
  y += 8;

  // Creator info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textLight);
  doc.text("Creator:", PAGE.margin, y);
  doc.setTextColor(COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text(deal.creatorName, PAGE.margin + 25, y);
  y += 6;

  // Recipient info
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textLight);
  doc.text("Recipient:", PAGE.margin, y);
  doc.setTextColor(COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text(deal.recipientName || "Recipient", PAGE.margin + 25, y);
  y += 10;

  // Horizontal line
  doc.setDrawColor(COLORS.border);
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
  y += 10;

  return y;
}

/**
 * Draw the terms section
 */
function drawTermsSection(doc: jsPDF, y: number, deal: Deal): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text);
  doc.text("Agreement Terms", PAGE.margin, y);
  y += 10;

  // Draw terms in a table-like format
  const termStartX = PAGE.margin;
  const valueStartX = PAGE.margin + 60;
  const maxValueWidth = PAGE.contentWidth - 60;

  deal.terms.forEach((term, index) => {
    // Check if we need a new page
    if (y > PAGE.height - 60) {
      doc.addPage();
      y = PAGE.margin;
    }

    // Alternating background for better readability
    if (index % 2 === 0) {
      doc.setFillColor(COLORS.background);
      doc.rect(PAGE.margin - 2, y - 4, PAGE.contentWidth + 4, 10, "F");
    }

    // Term label
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.textLight);
    doc.text(term.label + ":", termStartX, y);

    // Term value
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.text);
    const valueLines = doc.splitTextToSize(term.value, maxValueWidth);
    doc.text(valueLines, valueStartX, y);
    y += Math.max(valueLines.length * 5, 8) + 2;
  });

  y += 5;

  // Horizontal line
  doc.setDrawColor(COLORS.border);
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
  y += 10;

  return y;
}

/**
 * Draw the signature section with embedded image
 */
async function drawSignatureSection(
  doc: jsPDF,
  y: number,
  signatureUrl: string
): Promise<number> {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text);
  doc.text("Recipient Signature", PAGE.margin, y);
  y += 8;

  // Draw signature box
  const boxWidth = 80;
  const boxHeight = 30;
  const boxX = PAGE.margin;

  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(1);
  doc.rect(boxX, y, boxWidth, boxHeight);

  // Try to embed signature image
  try {
    let imageData = signatureUrl;

    // If it's a URL (not base64), we need to handle it differently
    // For server-side storage URLs, we'll display a placeholder
    if (signatureUrl.startsWith("http")) {
      // For remote URLs, show a text placeholder
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(COLORS.textLight);
      doc.text("Signature on file", boxX + boxWidth / 2, y + boxHeight / 2, {
        align: "center",
      });
    } else if (signatureUrl.startsWith("data:image")) {
      // Base64 image - embed directly
      imageData = signatureUrl;
      doc.addImage(imageData, "PNG", boxX + 2, y + 2, boxWidth - 4, boxHeight - 4);
    }
  } catch (error) {
    // Fallback: show placeholder text
    console.warn("Could not embed signature image:", error);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(COLORS.textLight);
    doc.text("Signature on file", boxX + boxWidth / 2, y + boxHeight / 2, {
      align: "center",
    });
  }

  y += boxHeight + 10;

  // Horizontal line
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
  y += 10;

  return y;
}

/**
 * Draw the cryptographic seal and verification section
 */
function drawSealSection(
  doc: jsPDF,
  y: number,
  deal: Deal,
  verificationUrl?: string
): number {
  // Check if we need a new page
  if (y > PAGE.height - 80) {
    doc.addPage();
    y = PAGE.margin;
  }

  // Section title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text);
  doc.text("Cryptographic Verification", PAGE.margin, y);
  y += 10;

  // Verification badge
  doc.setFillColor(COLORS.success);
  doc.roundedRect(PAGE.margin, y - 3, 80, 10, 2, 2, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("✓ CRYPTOGRAPHICALLY SEALED", PAGE.margin + 3, y + 3.5);
  y += 15;

  // Timestamps
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textLight);

  doc.text("Created:", PAGE.margin, y);
  doc.setTextColor(COLORS.text);
  doc.text(formatDateTime(deal.createdAt), PAGE.margin + 25, y);
  y += 5;

  if (deal.confirmedAt) {
    doc.setTextColor(COLORS.textLight);
    doc.text("Sealed:", PAGE.margin, y);
    doc.setTextColor(COLORS.text);
    doc.text(formatDateTime(deal.confirmedAt), PAGE.margin + 25, y);
    y += 5;
  }
  y += 5;

  // SHA-256 Hash
  if (deal.dealSeal) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.text);
    doc.text("SHA-256 Seal:", PAGE.margin, y);
    y += 5;

    // Draw hash in a monospace style box
    doc.setFillColor(COLORS.background);
    doc.rect(PAGE.margin, y - 3, PAGE.contentWidth, 12, "F");
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    doc.setTextColor(COLORS.textLight);
    // Split hash for better display
    const hash = deal.dealSeal;
    doc.text(hash, PAGE.margin + 2, y + 3);
    y += 15;
  }

  // Verification URL
  const verifyUrl =
    verificationUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/verify?id=${deal.publicId}`
      : `https://proofo.app/verify?id=${deal.publicId}`);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textLight);
  doc.text("Verify this document:", PAGE.margin, y);
  y += 5;
  doc.setTextColor(COLORS.primary);
  doc.textWithLink(verifyUrl, PAGE.margin, y, { url: verifyUrl });
  y += 10;

  return y;
}

/**
 * Draw the footer section
 */
function drawFooter(doc: jsPDF, deal: Deal, isPro: boolean): void {
  const footerY = PAGE.height - 15;

  // Footer line
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(PAGE.margin, footerY - 5, PAGE.width - PAGE.margin, footerY - 5);

  // Footer text
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textLight);

  // Left side - Proofo branding
  const footerText = isPro
    ? "Generated by Proofo"
    : "Generated by Proofo | proofo.app";
  doc.text(footerText, PAGE.margin, footerY);

  // Right side - timestamp and deal ID
  const rightText = `${deal.publicId} | ${new Date().toISOString().split("T")[0]}`;
  doc.text(rightText, PAGE.width - PAGE.margin, footerY, { align: "right" });

  // Watermark for non-Pro users
  if (!isPro) {
    doc.setFontSize(40);
    doc.setTextColor(240, 240, 240);
    doc.setFont("helvetica", "bold");
    // Diagonal watermark
    doc.text("PROOFO", PAGE.width / 2, PAGE.height / 2, {
      align: "center",
      angle: 45,
    });
  }
}

/**
 * Download the PDF file directly in the browser
 */
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

/**
 * Generate a filename for the PDF
 */
export function generatePDFFilename(deal: Deal): string {
  const sanitizedTitle = deal.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  const date = new Date().toISOString().split("T")[0];
  return `proofo-${sanitizedTitle}-${date}.pdf`;
}

/**
 * Convert PDF blob to base64 string for email attachment
 */
export async function pdfBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix to get pure base64
      const base64 = base64String.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
