// ── DMS — PDF Generator Utility ───────────────────────────────────────────────
// Uses the jsPDF CDN script (already loaded via <script> in index.html for BOS).
// In the React app, we inject the script dynamically and use the global jsPDF.

import type { DmsDocument, DmsCompany } from '../types/dms';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jspdf: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    QRCode: any;
  }
}

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const QRCODE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

async function loadScript(src: string): Promise<void> {
  if (document.querySelector(`script[src="${src}"]`)) return;
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureLibs() {
  await Promise.all([loadScript(JSPDF_CDN), loadScript(QRCODE_CDN)]);
}

function generateQrDataUrl(text: string): Promise<string> {
  return new Promise(resolve => {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(div);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qr = new (window.QRCode as any)(div, {
        text,
        width: 80,
        height: 80,
        colorDark: '#000',
        colorLight: '#fff',
        correctLevel: window.QRCode.CorrectLevel.M,
      });
      setTimeout(() => {
        const canvas = div.querySelector('canvas');
        const dataUrl = canvas?.toDataURL('image/png') ?? '';
        document.body.removeChild(div);
        qr._oDrawing = null;
        resolve(dataUrl);
      }, 200);
    } catch {
      document.body.removeChild(div);
      resolve('');
    }
  });
}

export interface PdfOptions {
  doc: DmsDocument;
  company: DmsCompany;
}

export async function generateDocumentPdf({ doc, company }: PdfOptions): Promise<void> {
  await ensureLibs();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { jsPDF } = window.jspdf as any;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const W = 210;
  const MARGIN = 18;
  const col1 = MARGIN;
  const textW = W - MARGIN * 2;
  let y = 0;

  const c1 = company.color1 || '#D4A017';
  const c2 = company.color2 || '#8B5E00';

  // ── Top color bar ─────────────────────────────────────────────────────────
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };
  const rgb1 = hexToRgb(c1.startsWith('#') ? c1 : '#D4A017');
  const rgb2 = hexToRgb(c2.startsWith('#') ? c2 : '#8B5E00');

  pdf.setFillColor(rgb1.r, rgb1.g, rgb1.b);
  pdf.rect(0, 0, W, 4, 'F');
  y = 4;

  // ── Right side accent bar ─────────────────────────────────────────────────
  pdf.setFillColor(rgb2.r, rgb2.g, rgb2.b);
  pdf.rect(W - 4, 0, 4, 297, 'F');

  // ── Header ────────────────────────────────────────────────────────────────
  y = 12;

  // Logo handling
  let logoData = company.logo;
  if (!logoData || !logoData.startsWith('data:image')) {
    try {
      const resp = await fetch('/images/logo.png');
      const blob = await resp.blob();
      logoData = await new Promise((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      logoData = null;
    }
  }

  if (logoData && logoData.startsWith('data:image')) {
    try {
      // Pass 'PNG' assuming our fallback is a PNG, and user uploads are usually PNG/JPEG
      pdf.addImage(logoData, 'PNG', col1, y - 4, 18, 18);
    } catch { /* skip bad image */ }
  }

  const nameX = logoData ? col1 + 22 : col1;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(20, 20, 20);
  pdf.text(company.name || 'SRIVRIDDHI Enterprise', nameX, y + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 100, 100);
  pdf.text('ENTERPRISE', nameX, y + 7);

  // Address block (right aligned)
  const lines = [
    company.addr1,
    company.addr2,
    company.phone ? `Ph: ${company.phone}` : null,
    company.email,
    company.website,
    company.gst ? `GSTIN: ${company.gst}` : null,
  ].filter(Boolean) as string[];

  pdf.setFontSize(7.5);
  pdf.setTextColor(90, 90, 90);
  lines.forEach((line, i) => {
    pdf.text(line, W - MARGIN - 4, y + i * 4.2, { align: 'right' });
  });

  y += Math.max(18, lines.length * 4.2) + 4;

  // Divider
  pdf.setDrawColor(rgb1.r, rgb1.g, rgb1.b);
  pdf.setLineWidth(0.5);
  pdf.line(col1, y, W - MARGIN - 4, y);
  y += 5;

  // ── Document Meta bar ─────────────────────────────────────────────────────
  const rgb1_20 = `rgb(${rgb1.r},${rgb1.g},${rgb1.b})`;
  pdf.setFillColor(248, 246, 240);
  pdf.roundedRect(col1, y, textW - 4, 18, 2, 2, 'F');
  pdf.setDrawColor(220, 200, 160);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(col1, y, textW - 4, 18, 2, 2, 'D');

  const metaItems = [
    { label: 'DOC NO.', value: doc.id },
    { label: 'DATE', value: doc.date ? new Date(doc.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
    { label: 'TYPE', value: doc.type },
    { label: 'PRIORITY', value: doc.priority },
    ...(doc.ref_no ? [{ label: 'REF', value: doc.ref_no }] : []),
  ];

  const metaW = (textW - 4) / metaItems.length;
  metaItems.forEach((item, i) => {
    const mx = col1 + i * metaW + 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 100, 60);
    pdf.text(item.label, mx, y + 6);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(20, 20, 20);
    pdf.text(item.value, mx, y + 13);
  });
  y += 24;

  // ── To / Recipient ─────────────────────────────────────────────────────────
  if (doc.to_name) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    pdf.text('To,', col1, y);
    y += 4.5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);
    pdf.text(doc.to_name, col1, y);
    y += 5;
    if (doc.to_company) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(doc.to_company, col1, y);
      y += 4.5;
    }
    if (doc.to_address) {
      pdf.text(doc.to_address, col1, y);
      y += 4.5;
    }
    if (doc.to_city) {
      pdf.text(doc.to_city, col1, y);
      y += 4.5;
    }
    y += 4;
  }

  // ── Subject ───────────────────────────────────────────────────────────────
  pdf.setDrawColor(rgb1.r, rgb1.g, rgb1.b);
  pdf.setLineWidth(0.4);
  pdf.line(col1, y, W - MARGIN - 4, y);
  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(20, 20, 20);
  pdf.text(`Sub: ${doc.subject}`, col1, y);
  pdf.line(col1, y + 1.5, W - MARGIN - 4, y + 1.5);
  y += 8;

  // ── Salutation ────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(30, 30, 30);
  pdf.text(doc.salutation, col1, y);
  y += 7;

  // ── Body ──────────────────────────────────────────────────────────────────
  pdf.setFontSize(9.5);
  const bodyLines = pdf.splitTextToSize(doc.content || '', textW - 4);
  pdf.text(bodyLines, col1, y);
  y += bodyLines.length * 5.5 + 5;

  // ── Closing ───────────────────────────────────────────────────────────────
  if (doc.closing) {
    pdf.setFontSize(9.5);
    pdf.text(doc.closing, col1, y);
    y += 6;
  }

  // ── Signatory ─────────────────────────────────────────────────────────────
  y += 8;
  if (company.signature && company.signature.startsWith('data:image')) {
    try {
      pdf.addImage(company.signature, 'PNG', col1, y, 36, 14);
      y += 16;
    } catch { y += 4; }
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(20, 20, 20);
  pdf.text(doc.issued_by, col1, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text(doc.designation || '', col1, y);
  pdf.text(company.name, col1, y + 4.5);

  // ── QR Code ───────────────────────────────────────────────────────────────
  if (company.qr_on && company.verify_url) {
    try {
      const qrUrl = `${company.verify_url}?id=${encodeURIComponent(doc.id)}`;
      const qrDataUrl = await generateQrDataUrl(qrUrl);
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, 'PNG', W - MARGIN - 24, 297 - 34, 20, 20);
        pdf.setFontSize(6);
        pdf.setTextColor(140, 140, 140);
        pdf.text('Scan to verify', W - MARGIN - 24, 297 - 12, { align: 'left' });
      }
    } catch { /* skip QR if error */ }
  }

  // ── Watermark ─────────────────────────────────────────────────────────────
  if (company.watermark_on && company.watermark_text) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(52);
    pdf.setTextColor(220, 210, 190);
    pdf.text(company.watermark_text, W / 2, 148, { align: 'center', angle: 35 });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  pdf.setFillColor(rgb1.r, rgb1.g, rgb1.b);
  pdf.rect(0, 293, W, 4, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(255, 255, 255);
  const footerText = company.footer_text || `${company.name} | ${company.addr1 || ''} | ${company.phone || ''}`;
  pdf.text(footerText, W / 2, 296, { align: 'center' });

  // ── Save ──────────────────────────────────────────────────────────────────
  void rgb1_20; // suppress unused warning
  pdf.save(`${doc.id}.pdf`);
}
