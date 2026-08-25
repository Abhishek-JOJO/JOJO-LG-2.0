import { jsPDF } from "jspdf";
import { InvoiceDetails } from "@/lib/api/download-invoice";

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

const formatDateDDMMYYYY = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "N/A";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Normalizes currency symbols to prevent Unicode font encoding issues in jsPDF standard fonts.
 */
const getCurrencySymbolText = (currency?: string, symbol?: string): string => {
  const code = (currency || "").trim().toUpperCase();
  const sym = (symbol || "").trim();

  if (code === "INR" || sym === "₹" || sym === "\u20B9") return "Rs. ";
  if (code === "USD" || sym === "$") return "$ ";
  if (code === "EUR" || sym === "€" || sym === "\u20AC") return "EUR ";
  if (code === "GBP" || sym === "£" || sym === "\u00A3") return "GBP ";
  if (code === "JPY" || sym === "¥" || sym === "\u00A5") return "JPY ";
  if (code === "AED") return "AED ";
  if (code === "SAR") return "SAR ";
  if (code === "CAD") return "CAD ";
  if (code === "AUD") return "AUD ";
  if (code === "SGD") return "SGD ";

  // Fallback check if symbol is simple ASCII (e.g. $)
  if (sym && /^[\x00-\x7F]+$/.test(sym)) {
    return `${sym} `;
  }

  return code ? `${code} ` : "Rs. ";
};

const formatAmount = (val?: number, currency?: string, symbol?: string): string => {
  const prefix = getCurrencySymbolText(currency, symbol);
  if (val === undefined || val === null) return `${prefix}0.00`;
  return `${prefix}${val.toFixed(2)}`;
};

export const generateInvoicePDF = async (invoiceData: InvoiceDetails): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Evaluate Regional Status (Domestic India vs Overseas)
  const regionUpper = (invoiceData.sRegion || "").trim().toUpperCase();
  const currencyUpper = (invoiceData.sCurrency || "").trim().toUpperCase();
  const countryUpper = (invoiceData.sCountryName || "").trim().toUpperCase();

  const isIndia =
    (regionUpper === "IN" || countryUpper === "INDIA" || countryUpper === "IN") &&
    currencyUpper !== "USD" &&
    currencyUpper !== "EUR" &&
    currencyUpper !== "GBP";
  const isOverseas = !isIndia;

  // 1. Draw Sidebar Background (Beige/Peach)
  doc.setFillColor(255, 244, 233); // Soft warm peach hue (#FFF4E9)
  doc.rect(0, 0, 80, 297, "F");

  // 2. Draw Logo in Sidebar
  try {
    const logoImg = await loadImage("/logos/JOJO_LIMITED_LOGO.png");
    const origWidth = logoImg.naturalWidth || logoImg.width || 376;
    const origHeight = logoImg.naturalHeight || logoImg.height || 48;

    let imageSource: HTMLImageElement | string = logoImg;
    let imgW = origWidth;
    let imgH = origHeight;

    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const padY = Math.max(6, Math.ceil(origHeight * 0.1));
      const padX = Math.max(6, Math.ceil(origWidth * 0.04));

      canvas.width = origWidth + padX * 2;
      canvas.height = origHeight + padY * 2;

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(logoImg, padX, padY, origWidth, origHeight);
        imageSource = canvas.toDataURL("image/png");
        imgW = canvas.width;
        imgH = canvas.height;
      }
    }

    const aspectRatio = imgW / imgH;
    const maxWidth = 48;
    const maxHeight = 16;

    let renderWidth = maxWidth;
    let renderHeight = renderWidth / aspectRatio;

    if (renderHeight > maxHeight) {
      renderHeight = maxHeight;
      renderWidth = renderHeight * aspectRatio;
    }

    doc.addImage(imageSource, "PNG", 12, 18, renderWidth, renderHeight);
  } catch (err) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(229, 9, 20); // JOJO Red
    doc.text("JOJO", 12, 24);
  }

  // 3. Draw Company Details in Sidebar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(34, 34, 34); // Dark gray
  doc.text("JOJO Limited", 12, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(85, 85, 85); // Muted gray
  const companyAddress = [
    "12, Anand Mangal 3, Opp Core House NF,",
    "Hirabag Nr Rajnagar Club, Ambavadi,",
    "Ahmedabad, Gujarat, 380015",
  ].join("\n");
  doc.text(companyAddress, 12, 51, { lineHeightFactor: 1.35 });

  let sidebarY = 68;
  doc.setFont("helvetica", "bold");
  doc.text("GST: 24AACCT3820A2Z0", 12, sidebarY);
  sidebarY += 6;

  // Draw Overseas LUT Number Header if subscriber is international
  if (isOverseas) {
    doc.setFont("helvetica", "bold");
    doc.text("LUT: AD240325046748W", 12, sidebarY);
    sidebarY += 6;
  }

  // 4. Draw Billed To Section in Sidebar (Dynamic Y Position)
  sidebarY = Math.max(sidebarY + 15, 95);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(102, 102, 102);
  doc.text("BILLED TO", 12, sidebarY);
  sidebarY += 7;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 34, 34);
  doc.text(invoiceData.sName || "Customer", 12, sidebarY);
  sidebarY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(85, 85, 85);
  doc.text(`E-Mail ID: ${invoiceData.sEmail || "N/A"}`, 12, sidebarY);
  sidebarY += 6;

  // Resolve Place of Supply and Country Name smartly
  let placeOfSupply = "Gujarat";
  let countryName = "India";

  if (isOverseas) {
    placeOfSupply =
      invoiceData.sState ||
      invoiceData.sCountryName ||
      (invoiceData.sRegion && invoiceData.sRegion !== "IN" ? invoiceData.sRegion : "Overseas");
    countryName =
      invoiceData.sCountryName ||
      (invoiceData.sRegion && invoiceData.sRegion !== "IN" ? invoiceData.sRegion : "International");
  } else {
    placeOfSupply = invoiceData.sState || invoiceData.sRegion || "Gujarat";
    countryName = invoiceData.sCountryName || "India";
  }

  doc.text(`Place of Supply: ${placeOfSupply}`, 12, sidebarY);
  sidebarY += 6;
  doc.text(`Country: ${countryName}`, 12, sidebarY);
  sidebarY += 6;

  // 5. Draw Payment Information in Sidebar (Dynamic Y Position)
  sidebarY = Math.max(sidebarY + 15, 145);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(102, 102, 102);
  doc.text("PAYMENT INFORMATION", 12, sidebarY);
  sidebarY += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(85, 85, 85);
  const paymentMode = invoiceData.sPaymentMethod || (isOverseas ? "Stripe / Card" : "Razorpay");
  doc.text(`Payment Mode: ${paymentMode}`, 12, sidebarY);
  sidebarY += 6;

  const maskedId = invoiceData.sMaskedId || "N/A";
  const isUpi =
    (invoiceData.sPaymentMethod || "").toUpperCase().includes("UPI") ||
    (invoiceData.sPaymentMode || "").toUpperCase().includes("UPI");
  const maskedLabel = isUpi ? "UPI ID:" : "Payment ID:";
  doc.text(`${maskedLabel} ${maskedId}`, 12, sidebarY);
  sidebarY += 6;

  doc.text(`Transaction ID: ${invoiceData.sOrderId || "N/A"}`, 12, sidebarY);
  sidebarY += 6;
  doc.text(`Payment Date: ${formatDateDDMMYYYY(invoiceData.dCreatedAt)}`, 12, sidebarY);

  // 6. Draw Website URL in Sidebar Bottom
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(102, 102, 102);
  doc.text("Website: www.jojoapp.in", 12, 284);

  // 7. Right Side: TAX INVOICE Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(34, 34, 34);
  doc.text("TAX INVOICE", 198, 25, { align: "right" });

  // 8. Right Side: Invoice Metadata Line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(`Invoice No.: ${invoiceData.sInvoiceNumber}`, 90, 62);
  doc.text(`HSN Code: ${invoiceData.sHSNCode || "99843"}`, 198, 62, { align: "right" });

  // 9. Horizontal Separator Line 1
  doc.setDrawColor(187, 187, 187); // #BBBBBB
  doc.setLineWidth(0.3);
  doc.line(90, 68, 198, 68);

  // 10. Details Table Layout (Descriptions and Values)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(85, 85, 85);

  // Row 1: Description
  doc.text("Description", 90, 76);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 34, 34);
  doc.text("Streaming Service", 198, 76, { align: "right" });

  // Row 2: Plan
  doc.setFont("helvetica", "normal");
  doc.setTextColor(85, 85, 85);
  doc.text("Plan", 90, 84);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 34, 34);
  doc.text(invoiceData.sPlanName || "Subscription", 198, 84, { align: "right" });

  // Row 3: Subscription Period
  doc.setFont("helvetica", "normal");
  doc.setTextColor(85, 85, 85);
  doc.text("Subscription Period", 90, 92);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 34, 34);
  const subPeriod = `${formatDateDDMMYYYY(invoiceData.dCreatedAt)} - ${formatDateDDMMYYYY(invoiceData.dEndDate)}`;
  doc.text(subPeriod, 198, 92, { align: "right" });

  // Row 4: Amount
  doc.setFont("helvetica", "normal");
  doc.setTextColor(85, 85, 85);
  doc.text("Amount", 90, 100);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 34, 34);
  doc.text(
    formatAmount(invoiceData.nSubTotalAmount, invoiceData.sCurrency, invoiceData.sCurrencySymbol),
    198,
    100,
    { align: "right" }
  );

  // 11. Horizontal Separator Line 2
  doc.line(90, 106, 198, 106);

  // 12. Right Side: Taxes Block
  let nextY = 114;

  if (invoiceData.nIgstAmount > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 85, 85);
    doc.text("IGST (18%)", 90, nextY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 34, 34);
    doc.text(
      formatAmount(invoiceData.nIgstAmount, invoiceData.sCurrency, invoiceData.sCurrencySymbol),
      198,
      nextY,
      { align: "right" }
    );
    nextY += 8;
  } else {
    if (invoiceData.nCgstAmount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(85, 85, 85);
      doc.text("CGST (9%)", 90, nextY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 34, 34);
      doc.text(
        formatAmount(invoiceData.nCgstAmount, invoiceData.sCurrency, invoiceData.sCurrencySymbol),
        198,
        nextY,
        { align: "right" }
      );
      nextY += 8;
    }
    if (invoiceData.nSgstAmount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(85, 85, 85);
      doc.text("SGST (9%)", 90, nextY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 34, 34);
      doc.text(
        formatAmount(invoiceData.nSgstAmount, invoiceData.sCurrency, invoiceData.sCurrencySymbol),
        198,
        nextY,
        { align: "right" }
      );
      nextY += 8;
    }
  }

  // Row: Total
  doc.setFont("helvetica", "normal");
  doc.setTextColor(85, 85, 85);
  doc.text("Total", 90, nextY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 34, 34);
  doc.text(
    formatAmount(invoiceData.nTotal, invoiceData.sCurrency, invoiceData.sCurrencySymbol),
    198,
    nextY,
    { align: "right" }
  );
  nextY += 8;

  // 13. Horizontal Separator Line 3
  doc.line(90, nextY - 2, 198, nextY - 2);

  // 14. Right Side: Subtotal / Tax Summaries
  doc.setFont("helvetica", "bold");
  doc.setTextColor(85, 85, 85);
  doc.text("SUBTOTAL", 90, nextY + 6);
  doc.text(
    formatAmount(invoiceData.nSubTotalAmount, invoiceData.sCurrency, invoiceData.sCurrencySymbol),
    198,
    nextY + 6,
    { align: "right" }
  );

  doc.text("TOTAL TAX", 90, nextY + 14);
  doc.text(
    formatAmount(invoiceData.nTotalTaxAmount, invoiceData.sCurrency, invoiceData.sCurrencySymbol),
    198,
    nextY + 14,
    { align: "right" }
  );

  // 15. Horizontal Separator Line 4
  doc.line(90, nextY + 20, 198, nextY + 20);

  // 16. Right Side: GRAND TOTAL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(34, 34, 34);
  doc.text("TOTAL", 90, nextY + 28);
  doc.text(
    formatAmount(invoiceData.nTotal, invoiceData.sCurrency, invoiceData.sCurrencySymbol),
    198,
    nextY + 28,
    { align: "right" }
  );

  // 17. Right Side Bottom Statutory Export Notice (for Overseas)
  if (isOverseas) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(102, 102, 102);

    const exportNotice = [
      "LUT: AD240325046748W",
      "Supply meant for Export/Supply to SEZ Unit or SEZ Developer for",
      "Authorised Operations under Bond or Letter of Undertaking without payment of IGST.",
    ].join("\n");

    doc.text(exportNotice, 90, 264, { lineHeightFactor: 1.3 });
  }

  // 18. Right Side Bottom Footnotes
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(119, 119, 119); // Muted gray
  doc.text("This is computer generated invoice and does not require a signature/stamp", 90, 280);

  doc.setFont("helvetica", "normal");
  doc.text(`© ${new Date().getFullYear()} JOJO LTD. All Rights Reserved.`, 90, 284);

  return doc;
};

const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const generateAndDownloadInvoice = async (invoiceData: InvoiceDetails, filename?: string) => {
  try {
    const doc = await generateInvoicePDF(invoiceData);
    const pdfFilename = filename || `Invoice_${invoiceData.sInvoiceNumber || "Unknown"}.pdf`;
    downloadPDF(doc, pdfFilename);
  } catch (downloadError) {
    throw downloadError;
  }
};
