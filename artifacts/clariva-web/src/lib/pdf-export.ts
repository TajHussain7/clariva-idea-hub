import jsPDF from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
// BRAND PALETTE — mirrors Clariva's design system exactly
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  // Primary brand
  indigo:      [53,  37,  205] as const,   // HSL ~242 65% 47%
  indigoMid:   [87,  68,  255] as const,   // lighter variant
  indigoPale:  [237, 233, 254] as const,   // chip background
  indigoBorder:[196, 181, 253] as const,   // chip border

  // Dark backgrounds
  darkest:     [10,  9,   28]  as const,   // cover bg
  dark:        [18,  17,  43]  as const,   // body text
  darkCard:    [22,  21,  52]  as const,   // dark card bg

  // Semantic
  emerald:     [5,   150, 105] as const,
  emeraldPale: [209, 250, 229] as const,
  amber:       [217, 119, 6]   as const,
  amberPale:   [254, 243, 199] as const,
  red:         [220, 38,  38]  as const,
  redPale:     [254, 226, 226] as const,
  purple:      [126, 34,  206] as const,
  purplePale:  [243, 232, 255] as const,

  // Neutral
  muted:       [100, 116, 139] as const,
  border:      [226, 232, 240] as const,
  bg:          [248, 250, 252] as const,
  bgAlt:       [241, 245, 249] as const,
  white:       [255, 255, 255] as const,
  black:       [0,   0,   0]   as const,

  // Accent cyan (matches Clariva logo accent)
  cyan:        [87,  223, 254] as const,
  cyanDark:    [14,  165, 233] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE GEOMETRY (A4 in mm)
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_W        = 210;
const PAGE_H        = 297;
const MARGIN        = 16;
const CONTENT_W     = PAGE_W - MARGIN * 2;
const HEADER_H      = 13;
const FOOTER_H      = 11;
const CONTENT_TOP   = MARGIN + HEADER_H + 5;
const CONTENT_BOTTOM= PAGE_H - FOOTER_H - 4;

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function rgb(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function fill(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function stroke(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function lw(doc: jsPDF, w: number) {
  doc.setLineWidth(w);
}

function wrapText(doc: jsPDF, text: string, maxW: number): string[] {
  return doc.splitTextToSize(String(text ?? ""), maxW);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE SEMANTICS
// ─────────────────────────────────────────────────────────────────────────────
function scoreColor(s: number): readonly [number, number, number] {
  if (s >= 80) return C.emerald;
  if (s >= 60) return C.indigo;
  if (s >= 40) return C.amber;
  return C.red;
}
function scorePale(s: number): readonly [number, number, number] {
  if (s >= 80) return C.emeraldPale;
  if (s >= 60) return C.indigoPale;
  if (s >= 40) return C.amberPale;
  return C.redPale;
}
function scoreLabel(s: number): string {
  if (s >= 80) return "EXCELLENT";
  if (s >= 60) return "GOOD";
  if (s >= 40) return "FAIR";
  return "NEEDS WORK";
}
function scoreTier(s: number): string {
  if (s >= 80) return "★★★★★";
  if (s >= 60) return "★★★★";
  if (s >= 40) return "★★★";
  return "★★";
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CHROME — HEADER
// ─────────────────────────────────────────────────────────────────────────────
function drawPageHeader(doc: jsPDF, pageNum: number, totalPages: number) {
  // Full-width brand bar with gradient effect (two rect blocks)
  fill(doc, C.darkest);
  doc.rect(0, 0, PAGE_W * 0.55, HEADER_H, "F");
  fill(doc, C.dark);
  doc.rect(PAGE_W * 0.55, 0, PAGE_W * 0.45, HEADER_H, "F");

  // Cyan accent strip (left edge)
  fill(doc, C.cyan);
  doc.rect(0, 0, 2.5, HEADER_H, "F");

  // Logo mark — filled square with star symbol
  fill(doc, C.cyan);
  doc.roundedRect(MARGIN, 2, 9, 9, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  rgb(doc, C.darkest);
  doc.text("✦", MARGIN + 4.5, 7.8, { align: "center" });

  // "CLARIVA" wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  rgb(doc, C.white);
  doc.text("CLARIVA", MARGIN + 12, 8.2);

  // Report type label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  rgb(doc, C.cyan);
  doc.text("IDEA ANALYSIS REPORT", MARGIN + 12, 11.5);

  // Right — page counter
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  rgb(doc, [160, 170, 200]);
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, 8.2, { align: "right" });

  // Right — confidential watermark
  doc.setFontSize(6);
  rgb(doc, [80, 90, 130]);
  doc.text("CONFIDENTIAL · CLARIVA PLATFORM", PAGE_W - MARGIN, 11.5, { align: "right" });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CHROME — FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function drawPageFooter(doc: jsPDF, ideaTitle: string, exportDate: string) {
  const y = PAGE_H - FOOTER_H;

  // Thin border line
  stroke(doc, C.border);
  lw(doc, 0.25);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

  // Left — truncated idea title
  const truncated = ideaTitle.length > 52 ? ideaTitle.slice(0, 49) + "…" : ideaTitle;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  rgb(doc, C.muted);
  doc.text(truncated, MARGIN, y + 4.5);

  // Centre — branding
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6);
  rgb(doc, [180, 190, 210]);
  doc.text("Generated by Clariva · clariva.app", PAGE_W / 2, y + 4.5, { align: "center" });

  // Right — export date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  rgb(doc, C.muted);
  doc.text(exportDate, PAGE_W - MARGIN, y + 4.5, { align: "right" });
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER PAGE (Page 1 full-splash)
// ─────────────────────────────────────────────────────────────────────────────
function drawCoverPage(doc: jsPDF, idea: PdfExportIdea) {
  const a = idea.analysis;
  const overallScore = a.overallScore ?? 0;

  // ── Dark background ──────────────────────────────────────────────────────
  fill(doc, C.darkest);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // ── Decorative geometric accent (top-right) ──────────────────────────────
  fill(doc, [20, 18, 55]);
  doc.circle(PAGE_W + 10, -10, 70, "F");

  // ── Cyan accent left stripe ──────────────────────────────────────────────
  fill(doc, C.cyan);
  doc.rect(0, 0, 3, PAGE_H, "F");

  // ── Logo mark ─────────────────────────────────────────────────────────────
  fill(doc, C.cyan);
  doc.roundedRect(MARGIN, 24, 14, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  rgb(doc, C.darkest);
  doc.text("✦", MARGIN + 7, 32.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  rgb(doc, C.white);
  doc.text("CLARIVA", MARGIN + 18, 34);

  // ── Divider ───────────────────────────────────────────────────────────────
  fill(doc, C.cyan);
  doc.rect(MARGIN, 42, 40, 0.8, "F");

  // ── Report type ───────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  rgb(doc, C.cyan);
  doc.text("IDEA ANALYSIS REPORT", MARGIN, 50);

  // ── Idea title ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  rgb(doc, C.white);
  const titleLines = wrapText(doc, idea.title, CONTENT_W - 10);
  // Limit to 3 lines to avoid overflow
  const displayLines = titleLines.slice(0, 3);
  doc.text(displayLines, MARGIN, 68);
  const titleBottom = 68 + (displayLines.length - 1) * 10;

  // ── Domain badge ──────────────────────────────────────────────────────────
  const domain = (idea.domain || "General").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const domainW = doc.getTextWidth(domain) + 10;
  fill(doc, [40, 36, 100]);
  stroke(doc, C.indigoMid);
  lw(doc, 0.4);
  doc.roundedRect(MARGIN, titleBottom + 10, domainW, 7, 1.5, 1.5, "FD");
  rgb(doc, C.cyan);
  doc.text(domain, MARGIN + 5, titleBottom + 14.8);

  // ── Description ───────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  rgb(doc, [160, 170, 210]);
  const descLines = wrapText(doc, idea.description, CONTENT_W - 20);
  const descShort = descLines.slice(0, 4);
  doc.text(descShort, MARGIN, titleBottom + 26);

  // ── Large score display ───────────────────────────────────────────────────
  const scoreY = 170;

  // Score ring ring (outer circle)
  fill(doc, [20, 18, 55]);
  stroke(doc, scoreColor(overallScore));
  lw(doc, 1.5);
  doc.circle(PAGE_W / 2, scoreY, 28, "FD");

  // Score number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  rgb(doc, scoreColor(overallScore));
  doc.text(String(overallScore), PAGE_W / 2, scoreY + 6, { align: "center" });

  // "/100"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rgb(doc, [100, 110, 160]);
  doc.text("/100", PAGE_W / 2, scoreY + 14, { align: "center" });

  // Score label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  rgb(doc, scoreColor(overallScore));
  doc.text(scoreLabel(overallScore), PAGE_W / 2, scoreY + 35, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  rgb(doc, [100, 110, 160]);
  doc.text("OVERALL SCORE", PAGE_W / 2, scoreY + 41, { align: "center" });

  // ── Sub-score row ─────────────────────────────────────────────────────────
  const subScores = [
    { label: "Feasibility",  val: a.feasibilityScore  ?? 0 },
    { label: "Uniqueness",   val: a.uniquenessScore   ?? 0 },
    { label: "Impact",       val: a.impactScore       ?? 0 },
    { label: "Innovation",   val: a.innovationScore   ?? 0 },
  ];
  const subW = CONTENT_W / subScores.length;
  let subX = MARGIN;
  const subY = scoreY + 54;

  fill(doc, [18, 16, 50]);
  stroke(doc, [40, 36, 100]);
  lw(doc, 0.3);
  doc.roundedRect(MARGIN, subY - 2, CONTENT_W, 20, 2, 2, "FD");

  for (const s of subScores) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    rgb(doc, scoreColor(s.val));
    doc.text(String(s.val), subX + subW / 2, subY + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    rgb(doc, [120, 130, 180]);
    doc.text(s.label.toUpperCase(), subX + subW / 2, subY + 14, { align: "center" });
    subX += subW;
  }

  // ── Submission info ───────────────────────────────────────────────────────
  const infoY = subY + 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  rgb(doc, [100, 110, 160]);
  const dateStr = new Date(idea.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const exportStr = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(`Submitted: ${dateStr}`, MARGIN, infoY);
  doc.text(`Exported: ${exportStr}`, PAGE_W - MARGIN, infoY, { align: "right" });

  // ── Bottom bar ────────────────────────────────────────────────────────────
  fill(doc, [15, 14, 40]);
  doc.rect(0, PAGE_H - 18, PAGE_W, 18, "F");
  fill(doc, C.cyan);
  doc.rect(0, PAGE_H - 18, 3, 18, "F");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  rgb(doc, [100, 110, 160]);
  doc.text(
    "This report was automatically generated by the Clariva AI platform. All analysis is for informational purposes only.",
    PAGE_W / 2, PAGE_H - 10, { align: "center", maxWidth: CONTENT_W },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER  (used on content pages)
// ─────────────────────────────────────────────────────────────────────────────
function drawSectionHeader(
  doc: jsPDF,
  title: string,
  y: number,
  icon?: string,
): number {
  const H = 9;

  // Light background band
  fill(doc, C.bgAlt);
  stroke(doc, C.border);
  lw(doc, 0.25);
  doc.roundedRect(MARGIN, y, CONTENT_W, H, 1, 1, "FD");

  // Left accent bar
  fill(doc, C.indigo);
  doc.roundedRect(MARGIN, y, 3, H, 1, 1, "F");

  // Title text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  rgb(doc, C.dark);
  const label = icon ? `${icon}  ${title}` : title;
  doc.text(label, MARGIN + 7, y + 6);

  return H + 5; // returns height consumed including gap below
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BAR (horizontal progress bar with label)
// ─────────────────────────────────────────────────────────────────────────────
function drawScoreBar(
  doc: jsPDF,
  label: string,
  score: number,
  x: number,
  y: number,
  barW: number,
): number {
  const ROW_H = 11;
  const BAR_H = 3.8;
  const BAR_Y = y + 6.5;
  const color = scoreColor(score);

  // Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  rgb(doc, C.dark);
  doc.text(label, x, y + 5);

  // Score value + label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  rgb(doc, color);
  doc.text(`${score}`, x + barW - 20, y + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  rgb(doc, color);
  doc.text(`/ 100`, x + barW, y + 5, { align: "right" });

  // Track
  fill(doc, C.border);
  stroke(doc, C.border);
  lw(doc, 0);
  doc.roundedRect(x, BAR_Y, barW, BAR_H, BAR_H / 2, BAR_H / 2, "F");

  // Filled portion
  const fillW = Math.max(BAR_H, (score / 100) * barW);
  fill(doc, color);
  doc.roundedRect(x, BAR_Y, fillW, BAR_H, BAR_H / 2, BAR_H / 2, "F");

  return ROW_H;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD BACKGROUND
// ─────────────────────────────────────────────────────────────────────────────
function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, opts?: {
  bg?: readonly [number, number, number];
  borderColor?: readonly [number, number, number];
  radius?: number;
}) {
  fill(doc, opts?.bg ?? C.bg);
  stroke(doc, opts?.borderColor ?? C.border);
  lw(doc, 0.3);
  const r = opts?.radius ?? 2;
  doc.roundedRect(x, y, w, h, r, r, "FD");
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHT LIST ITEM (with coloured dot, title, description)
// ─────────────────────────────────────────────────────────────────────────────
function drawInsightItem(
  doc: jsPDF,
  item: { title: string; desc: string },
  x: number,
  y: number,
  maxW: number,
  accentColor: readonly [number, number, number],
  paleBg: readonly [number, number, number],
): number {
  const INDENT = 8;
  const PAD_X = 4;
  const PAD_Y = 4;

  // Wrapped description
  const descLines = wrapText(doc, item.desc, maxW - INDENT - PAD_X * 2 - 2);
  const totalH = PAD_Y + 5.5 + descLines.length * 4.2 + PAD_Y + 2;

  // Background card
  drawCard(doc, x, y, maxW, totalH, { bg: paleBg, borderColor: accentColor, radius: 1.5 });

  // Accent left border
  fill(doc, accentColor);
  doc.roundedRect(x, y, 2.5, totalH, 1, 1, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  rgb(doc, C.dark);
  doc.text(item.title, x + INDENT, y + PAD_Y + 5);

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  rgb(doc, C.muted);
  doc.text(descLines, x + INDENT, y + PAD_Y + 10);

  return totalH + 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// PILL / CHIP (used for tech stack tags)
// ─────────────────────────────────────────────────────────────────────────────
function drawChip(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const chipW = doc.getTextWidth(label) + 10;
  const chipH = 6.5;
  fill(doc, C.indigoPale);
  stroke(doc, C.indigoBorder);
  lw(doc, 0.3);
  doc.roundedRect(x, y, chipW, chipH, chipH / 2, chipH / 2, "FD");
  rgb(doc, C.indigo);
  doc.text(label, x + 5, y + 4.6);
  return chipW;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
function drawDivider(doc: jsPDF, y: number): number {
  stroke(doc, C.border);
  lw(doc, 0.25);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineDashPattern([], 0);
  return 5;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC INTERFACE
// ─────────────────────────────────────────────────────────────────────────────
export interface PdfExportIdea {
  title: string;
  description: string;
  domain: string;
  createdAt: string;
  analysis: {
    overallScore?:      number | null;
    feasibilityScore?:  number | null;
    uniquenessScore?:   number | null;
    impactScore?:       number | null;
    innovationScore?:   number | null;
    verdictSummary?:    string | null;
    strengths?:         Array<{ title: string; desc: string }> | null;
    weaknesses?:        Array<{ title: string; desc: string }> | null;
    risks?:             Array<{ title: string; desc: string }> | null;
    suggestions?:       Array<{ title: string; desc: string }> | null;
    techStack?:         string[] | null;
    githubRepos?:       Array<{
      name: string; org: string; stars: number;
      desc: string; lang: string; url: string;
    }> | null;
    marketContext?:     string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export function exportIdeaAnalysisPdf(idea: PdfExportIdea): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const a = idea.analysis;

  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  // ─── Track current page index ─────────────────────────────────────────────
  let pageNum = 1;

  const newPage = (): number => {
    doc.addPage();
    pageNum++;
    return CONTENT_TOP;
  };

  const ensureSpace = (y: number, needed: number): number => {
    if (y + needed > CONTENT_BOTTOM) return newPage();
    return y;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 — COVER
  // ─────────────────────────────────────────────────────────────────────────
  drawCoverPage(doc, idea);

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2+ — CONTENT PAGES
  // ─────────────────────────────────────────────────────────────────────────
  let y = newPage(); // starts at CONTENT_TOP on page 2

  // ── Idea title recap (top of content page) ───────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  rgb(doc, C.dark);
  const titleLines = wrapText(doc, idea.title, CONTENT_W);
  doc.text(titleLines.slice(0, 2), MARGIN, y + 4);
  y += titleLines.slice(0, 2).length * 7 + 2;

  // Domain chip
  const domainText = (idea.domain || "General").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const domainW = doc.getTextWidth(domainText) + 10;
  fill(doc, C.indigoPale);
  stroke(doc, C.indigoBorder);
  lw(doc, 0.3);
  doc.roundedRect(MARGIN, y, domainW, 6, 3, 3, "FD");
  rgb(doc, C.indigo);
  doc.text(domainText, MARGIN + 5, y + 4.3);
  y += 10;

  y += drawDivider(doc, y);

  // ── Description ───────────────────────────────────────────────────────────
  const descLines = wrapText(doc, idea.description, CONTENT_W - 8);
  const descH = descLines.length * 4.5 + 10;
  y = ensureSpace(y, descH + 12);
  y += drawSectionHeader(doc, "Idea Description", y, "📋");
  drawCard(doc, MARGIN, y, CONTENT_W, descH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  rgb(doc, C.dark);
  doc.text(descLines, MARGIN + 5, y + 6);
  y += descH + 10;

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYSIS SCORES
  // ─────────────────────────────────────────────────────────────────────────
  y = ensureSpace(y, 70);
  y += drawSectionHeader(doc, "Analysis Scores", y, "📊");

  const overallScore = a.overallScore ?? 0;
  const sl = { label: scoreLabel(overallScore), color: scoreColor(overallScore) };
  const colW = (CONTENT_W - 8) / 2;

  // Overall score card
  const scoreCardH = 50;
  drawCard(doc, MARGIN, y, colW, scoreCardH, { bg: scorePale(overallScore) as readonly [number,number,number], borderColor: scoreColor(overallScore) });

  // Tier stars
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  rgb(doc, sl.color);
  doc.text(scoreTier(overallScore), MARGIN + colW / 2, y + 9, { align: "center" });

  // Big score number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  rgb(doc, sl.color);
  doc.text(String(overallScore), MARGIN + colW / 2, y + 27, { align: "center" });

  // /100
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  rgb(doc, C.muted);
  doc.text("/100", MARGIN + colW / 2 + 11, y + 25, { align: "left" });

  // Verdict label badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  rgb(doc, sl.color);
  doc.text(sl.label, MARGIN + colW / 2, y + 36, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  rgb(doc, C.muted);
  doc.text("OVERALL VERDICT", MARGIN + colW / 2, y + 41, { align: "center" });

  // Sub-scores card (right column)
  const barsX = MARGIN + colW + 8;
  const barsW = colW;
  drawCard(doc, barsX, y, barsW, scoreCardH);

  let barY = y + 4;
  const barInnerW = barsW - 8;

  const subScoreRows = [
    { label: "Feasibility",  val: a.feasibilityScore  },
    { label: "Uniqueness",   val: a.uniquenessScore   },
    { label: "Impact",       val: a.impactScore       },
    { label: "Innovation",   val: a.innovationScore   },
  ];
  for (const s of subScoreRows) {
    if (s.val != null) {
      barY += drawScoreBar(doc, s.label, s.val, barsX + 4, barY, barInnerW);
    }
  }

  y += scoreCardH + 10;

  // ─────────────────────────────────────────────────────────────────────────
  // ENGINE VERDICT SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  if (a.verdictSummary) {
    const vLines = wrapText(doc, a.verdictSummary, CONTENT_W - 12);
    const vH = vLines.length * 4.8 + 12;
    y = ensureSpace(y, vH + 18);
    y += drawSectionHeader(doc, "Engine Verdict", y, "🤖");
    drawCard(doc, MARGIN, y, CONTENT_W, vH, { bg: C.indigoPale as readonly [number,number,number], borderColor: C.indigoBorder });

    // Left quote bar
    fill(doc, C.indigo);
    doc.roundedRect(MARGIN, y, 3, vH, 1, 1, "F");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    rgb(doc, C.dark);
    doc.text(vLines, MARGIN + 7, y + 7);
    y += vH + 10;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INSIGHT SECTIONS — Strengths, Weaknesses, Risks, Suggestions
  // ─────────────────────────────────────────────────────────────────────────
  const insightGroups = [
    { title: "Strengths",         icon: "✅", items: a.strengths,   color: C.emerald, pale: C.emeraldPale },
    { title: "Weaknesses",        icon: "⚠️", items: a.weaknesses,  color: C.amber,   pale: C.amberPale   },
    { title: "Market Risks",      icon: "🚨", items: a.risks,       color: C.red,     pale: C.redPale     },
    { title: "Strategic Pivots",  icon: "💡", items: a.suggestions, color: C.purple,  pale: C.purplePale  },
  ] as const;

  for (const group of insightGroups) {
    if (!group.items || group.items.length === 0) continue;

    y = ensureSpace(y, 24);
    y += drawSectionHeader(doc, group.title, y, group.icon);

    for (const item of group.items) {
      // Estimate height before drawing to handle page breaks properly
      const descWrapped = wrapText(doc, item.desc, CONTENT_W - 14);
      const itemH = 4 + 5.5 + descWrapped.length * 4.2 + 4 + 2 + 3;
      y = ensureSpace(y, itemH);
      y += drawInsightItem(doc, item, MARGIN, y, CONTENT_W, group.color as readonly [number,number,number], group.pale as readonly [number,number,number]);
    }
    y += 6;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TECH STACK
  // ─────────────────────────────────────────────────────────────────────────
  if (a.techStack && a.techStack.length > 0) {
    y = ensureSpace(y, 30);
    y += drawSectionHeader(doc, "Recommended Tech Stack", y, "⚙️");

    let tagX = MARGIN;
    let tagRowY = y;
    const CHIP_H = 6.5;
    const CHIP_GAP_X = 3;
    const CHIP_GAP_Y = 4;
    let rowMaxH = CHIP_H;

    for (const tech of a.techStack) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const chipW = doc.getTextWidth(tech) + 10;

      if (tagX + chipW > PAGE_W - MARGIN) {
        tagX = MARGIN;
        tagRowY += rowMaxH + CHIP_GAP_Y;
        rowMaxH = CHIP_H;
        tagRowY = ensureSpace(tagRowY, CHIP_H + 4);
      }

      drawChip(doc, tech, tagX, tagRowY);
      tagX += chipW + CHIP_GAP_X;
    }

    y = tagRowY + rowMaxH + 12;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GITHUB PRIOR ART
  // ─────────────────────────────────────────────────────────────────────────
  if (a.githubRepos && a.githubRepos.length > 0) {
    y = ensureSpace(y, 30);
    y += drawSectionHeader(doc, "Relevant Prior Art (GitHub)", y, "🔗");

    for (const repo of a.githubRepos) {
      const repoDescLines = wrapText(doc, repo.desc || "", CONTENT_W - 10);
      const CARD_PAD = 5;
      // Layout: name row (7) + lang+stars row (6) + desc lines + padding
      const cardH = CARD_PAD + 7 + 1 + 5 + repoDescLines.length * 4.2 + CARD_PAD + 2;
      y = ensureSpace(y, cardH + 4);

      // Card background
      drawCard(doc, MARGIN, y, CONTENT_W, cardH);

      // Repo name (clickable link)
      const repoName = `${repo.org}/${repo.name}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      rgb(doc, C.indigo);
      doc.textWithLink(repoName, MARGIN + CARD_PAD, y + CARD_PAD + 5, { url: repo.url });

      // Stars (right-aligned)
      const starsStr = repo.stars >= 1000
        ? `★ ${(repo.stars / 1000).toFixed(1)}k`
        : `★ ${repo.stars}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      rgb(doc, C.amber);
      doc.text(starsStr, PAGE_W - MARGIN - CARD_PAD, y + CARD_PAD + 5, { align: "right" });

      // Thin separator line
      stroke(doc, C.border);
      lw(doc, 0.2);
      doc.line(MARGIN + CARD_PAD, y + CARD_PAD + 7, PAGE_W - MARGIN - CARD_PAD, y + CARD_PAD + 7);

      // Language chip
      if (repo.lang) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        const langW = doc.getTextWidth(repo.lang) + 8;
        fill(doc, C.indigoPale);
        stroke(doc, C.indigoBorder);
        lw(doc, 0.25);
        doc.roundedRect(MARGIN + CARD_PAD, y + CARD_PAD + 9, langW, 5, 1, 1, "FD");
        rgb(doc, C.indigo);
        doc.text(repo.lang, MARGIN + CARD_PAD + 4, y + CARD_PAD + 12.8);
      }

      // Description
      if (repoDescLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        rgb(doc, C.muted);
        doc.text(repoDescLines, MARGIN + CARD_PAD, y + CARD_PAD + 16);
      }

      y += cardH + 4;
    }
    y += 4;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARKET CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  if (a.marketContext) {
    const mcLines = wrapText(doc, a.marketContext, CONTENT_W - 10);
    const mcH = mcLines.length * 4.5 + 12;
    y = ensureSpace(y, mcH + 20);
    y += drawSectionHeader(doc, "Market Context", y, "🌐");

    drawCard(doc, MARGIN, y, CONTENT_W, mcH);

    // Subtle left bar
    fill(doc, C.cyanDark);
    doc.roundedRect(MARGIN, y, 3, mcH, 1, 1, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    rgb(doc, C.dark);
    doc.text(mcLines, MARGIN + 7, y + 7);
    y += mcH + 10;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRAW CHROME (header + footer) ON ALL CONTENT PAGES (skip cover = page 1)
  // ─────────────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageHeader(doc, p, totalPages);
    drawPageFooter(doc, idea.title, exportDate);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────────────────────────────────
  const safeTitle = idea.title
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .slice(0, 40);
  doc.save(`clariva-analysis-${safeTitle}.pdf`);
}
