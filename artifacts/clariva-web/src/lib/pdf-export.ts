import jsPDF from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
// BRAND PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  indigo: [53, 37, 205] as const,
  indigoMid: [87, 68, 255] as const,
  indigoPale: [237, 233, 254] as const,
  indigoBorder: [196, 181, 253] as const,

  darkest: [10, 9, 28] as const,
  dark: [18, 17, 43] as const,
  darkCard: [22, 21, 52] as const,

  emerald: [5, 150, 105] as const,
  emeraldPale: [209, 250, 229] as const,
  amber: [217, 119, 6] as const,
  amberPale: [254, 243, 199] as const,
  red: [220, 38, 38] as const,
  redPale: [254, 226, 226] as const,
  purple: [126, 34, 206] as const,
  purplePale: [243, 232, 255] as const,

  muted: [100, 116, 139] as const,
  border: [226, 232, 240] as const,
  bg: [248, 250, 252] as const,
  bgAlt: [241, 245, 249] as const,
  white: [255, 255, 255] as const,
  black: [0, 0, 0] as const,

  cyan: [87, 223, 254] as const,
  cyanDark: [14, 165, 233] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE GEOMETRY (A4 in mm)
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 13;
const FOOTER_H = 11;
const CONTENT_TOP = MARGIN + HEADER_H + 5;
const CONTENT_BOTTOM = PAGE_H - FOOTER_H - 4;

const GAP_SM = 4;
const GAP_MD = 8;
const GAP_LG = 12;

// Line-height (mm) tuned to Helvetica @ given font size (pt)
const LH = (sizePt: number) => sizePt * 0.42;

type RGB = readonly [number, number, number];

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function rgb(doc: jsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function fill(doc: jsPDF, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function stroke(doc: jsPDF, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function lw(doc: jsPDF, w: number) {
  doc.setLineWidth(w);
}

/**
 * splitTextToSize is font-size sensitive. This helper guarantees the wrap
 * measurement matches the render font, and restores prior state.
 */
function wrapText(
  doc: jsPDF,
  text: string,
  maxW: number,
  sizePt: number,
  style: "normal" | "bold" | "italic" = "normal",
): string[] {
  const prevSize = doc.getFontSize();
  const prev = doc.getFont();
  doc.setFont("helvetica", style);
  doc.setFontSize(sizePt);
  const cleaned = sanitizeWinAnsi(String(text ?? ""));
  const lines = doc.splitTextToSize(cleaned, maxW) as string[];
  doc.setFont(
    prev.fontName || "helvetica",
    (prev.fontStyle as string) || "normal",
  );
  doc.setFontSize(prevSize);
  return lines;
}

/**
 * Replace glyphs Helvetica (WinAnsi) can't render, and normalise typography.
 */
function sanitizeWinAnsi(s: string): string {
  return (
    s
      // Smart quotes
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      // Dashes
      .replace(/[\u2013\u2014]/g, "-")
      // Ellipsis
      .replace(/\u2026/g, "...")
      // Bullets → ASCII bullet char (WinAnsi 0x95)
      .replace(/[\u2022\u2023\u25E6]/g, "\u2022")
      // Stars, arrows, geometric shapes: strip (we draw them as vectors)
      .replace(
        /[\u2605\u2606\u2726\u2727\u2728\u2729\u272A\u272B\u272C\u272D\u272E\u272F\u2730\u2731\u2732\u2733]/g,
        "",
      )
      .replace(/[\u2190-\u21FF]/g, "->")
      .replace(/[\u2192]/g, "->")
      // Any emoji / surrogate pair range → drop
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
      .replace(/[\u{2600}-\u{27BF}]/gu, "")
      // Non-breaking spaces
      .replace(/\u00A0/g, " ")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE SEMANTICS
// ─────────────────────────────────────────────────────────────────────────────
function scoreColor(s: number): RGB {
  if (s >= 80) return C.emerald;
  if (s >= 60) return C.indigo;
  if (s >= 40) return C.amber;
  return C.red;
}
function scorePale(s: number): RGB {
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
function scoreTierCount(s: number): number {
  if (s >= 80) return 5;
  if (s >= 60) return 4;
  if (s >= 40) return 3;
  return 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// VECTOR GLYPHS
// ─────────────────────────────────────────────────────────────────────────────
/** Draw a filled 4-point sparkle centered at (cx, cy) with radius r. */
function drawSparkle(doc: jsPDF, cx: number, cy: number, r: number, c: RGB) {
  fill(doc, c);
  stroke(doc, c);
  // Vertical diamond
  doc.triangle(cx, cy - r, cx - r * 0.32, cy, cx + r * 0.32, cy, "F");
  doc.triangle(cx, cy + r, cx - r * 0.32, cy, cx + r * 0.32, cy, "F");
  // Horizontal diamond
  doc.triangle(cx - r, cy, cx, cy - r * 0.32, cx, cy + r * 0.32, "F");
  doc.triangle(cx + r, cy, cx, cy - r * 0.32, cx, cy + r * 0.32, "F");
}

/** Draw one filled 5-point star centered at (cx, cy). */
function drawStar(doc: jsPDF, cx: number, cy: number, r: number, c: RGB) {
  fill(doc, c);
  stroke(doc, c);
  lw(doc, 0.01);
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push([cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad]);
  }
  // jsPDF lines() expects relative segments
  const segs = pts
    .slice(1)
    .map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]] as [number, number]);
  // Close
  segs.push([
    pts[0][0] - pts[pts.length - 1][0],
    pts[0][1] - pts[pts.length - 1][1],
  ]);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], "F", true);
}

/** Draw a row of filled + outline stars representing tier / N. */
function drawStarRow(
  doc: jsPDF,
  cx: number,
  cy: number,
  filled: number,
  total: number,
  size: number,
  fillC: RGB,
  emptyC: RGB,
) {
  const gap = size * 0.6;
  const step = size * 2 + gap;
  const totalW = step * total - gap;
  let x = cx - totalW / 2 + size;
  for (let i = 0; i < total; i++) {
    drawStar(doc, x, cy, size, i < filled ? fillC : emptyC);
    x += step;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CHROME — HEADER
// ─────────────────────────────────────────────────────────────────────────────
function drawPageHeader(doc: jsPDF, pageNum: number, totalPages: number) {
  fill(doc, C.darkest);
  doc.rect(0, 0, PAGE_W * 0.55, HEADER_H, "F");
  fill(doc, C.dark);
  doc.rect(PAGE_W * 0.55, 0, PAGE_W * 0.45, HEADER_H, "F");

  fill(doc, C.cyan);
  doc.rect(0, 0, 2.5, HEADER_H, "F");

  // Logo tile with vector sparkle
  fill(doc, C.cyan);
  doc.roundedRect(MARGIN, 2, 9, 9, 1, 1, "F");
  drawSparkle(doc, MARGIN + 4.5, 6.5, 2.6, C.darkest);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  rgb(doc, C.white);
  doc.text("CLARIVA", MARGIN + 13, 6.6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  rgb(doc, C.cyan);
  doc.text("IDEA ANALYSIS REPORT", MARGIN + 13, 10.4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  rgb(doc, [160, 170, 200]);
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, 6.6, {
    align: "right",
  });

  doc.setFontSize(6);
  rgb(doc, [130, 140, 175]);
  doc.text("CONFIDENTIAL - CLARIVA PLATFORM", PAGE_W - MARGIN, 10.4, {
    align: "right",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CHROME — FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function drawPageFooter(doc: jsPDF, ideaTitle: string, exportDate: string) {
  const y = PAGE_H - FOOTER_H;

  stroke(doc, C.border);
  lw(doc, 0.25);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

  const truncated =
    ideaTitle.length > 52 ? ideaTitle.slice(0, 49) + "..." : ideaTitle;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  rgb(doc, C.muted);
  doc.text(sanitizeWinAnsi(truncated), MARGIN, y + 4.5);

  doc.setFont("helvetica", "italic");
  rgb(doc, [140, 150, 180]);
  doc.text("Generated by Clariva - clariva.app", PAGE_W / 2, y + 4.5, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  rgb(doc, C.muted);
  doc.text(exportDate, PAGE_W - MARGIN, y + 4.5, { align: "right" });
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function drawCoverPage(doc: jsPDF, idea: PdfExportIdea) {
  const a = idea.analysis;
  const overall = a.overallScore ?? 0;

  fill(doc, C.darkest);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  fill(doc, [20, 18, 55]);
  doc.circle(PAGE_W + 10, -10, 70, "F");

  fill(doc, C.cyan);
  doc.rect(0, 0, 3, PAGE_H, "F");

  // Logo
  fill(doc, C.cyan);
  doc.roundedRect(MARGIN, 24, 14, 14, 2, 2, "F");
  drawSparkle(doc, MARGIN + 7, 31, 4.2, C.darkest);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  rgb(doc, C.white);
  doc.text("CLARIVA", MARGIN + 19, 34);

  fill(doc, C.cyan);
  doc.rect(MARGIN, 42, 40, 0.8, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  rgb(doc, C.cyan);
  doc.text("IDEA ANALYSIS REPORT", MARGIN, 50);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  rgb(doc, C.white);
  const titleLines = wrapText(
    doc,
    idea.title,
    CONTENT_W - 10,
    26,
    "bold",
  ).slice(0, 3);
  doc.text(titleLines, MARGIN, 68);
  const titleBottom = 68 + (titleLines.length - 1) * 10;

  // Domain badge
  const domain = sanitizeWinAnsi((idea.domain || "General").toUpperCase());
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const domainW = doc.getTextWidth(domain) + 10;
  fill(doc, [40, 36, 100]);
  stroke(doc, C.indigoMid);
  lw(doc, 0.4);
  doc.roundedRect(MARGIN, titleBottom + 10, domainW, 7, 1.5, 1.5, "FD");
  rgb(doc, C.cyan);
  doc.text(domain, MARGIN + 5, titleBottom + 14.8);

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  rgb(doc, [180, 190, 220]);
  const descLines = wrapText(
    doc,
    idea.description,
    CONTENT_W - 20,
    9,
    "normal",
  ).slice(0, 4);
  doc.text(descLines, MARGIN, titleBottom + 26);

  // Score ring
  const scoreY = 170;
  fill(doc, [20, 18, 55]);
  stroke(doc, scoreColor(overall));
  lw(doc, 1.5);
  doc.circle(PAGE_W / 2, scoreY, 28, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  rgb(doc, scoreColor(overall));
  doc.text(String(overall), PAGE_W / 2, scoreY + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rgb(doc, [140, 150, 190]);
  doc.text("/ 100", PAGE_W / 2, scoreY + 14, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  rgb(doc, scoreColor(overall));
  doc.text(scoreLabel(overall), PAGE_W / 2, scoreY + 35, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  rgb(doc, [120, 130, 175]);
  doc.text("OVERALL SCORE", PAGE_W / 2, scoreY + 41, { align: "center" });

  // Sub-scores
  const subs = [
    { label: "Feasibility", val: a.feasibilityScore ?? 0 },
    { label: "Uniqueness", val: a.uniquenessScore ?? 0 },
    { label: "Impact", val: a.impactScore ?? 0 },
    { label: "Innovation", val: a.innovationScore ?? 0 },
  ];
  const subW = CONTENT_W / subs.length;
  const subY = scoreY + 54;

  fill(doc, [18, 16, 50]);
  stroke(doc, [40, 36, 100]);
  lw(doc, 0.3);
  doc.roundedRect(MARGIN, subY - 2, CONTENT_W, 20, 2, 2, "FD");

  let subX = MARGIN;
  for (const s of subs) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    rgb(doc, scoreColor(s.val));
    doc.text(String(s.val), subX + subW / 2, subY + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    rgb(doc, [140, 150, 195]);
    doc.text(s.label.toUpperCase(), subX + subW / 2, subY + 14, {
      align: "center",
    });
    subX += subW;
  }

  // Meta row
  const infoY = subY + 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  rgb(doc, [130, 140, 185]);
  const dateStr = new Date(idea.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const exportStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Submitted: ${dateStr}`, MARGIN, infoY);
  doc.text(`Exported: ${exportStr}`, PAGE_W - MARGIN, infoY, {
    align: "right",
  });

  // Bottom disclaimer
  fill(doc, [15, 14, 40]);
  doc.rect(0, PAGE_H - 18, PAGE_W, 18, "F");
  fill(doc, C.cyan);
  doc.rect(0, PAGE_H - 18, 3, 18, "F");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  rgb(doc, [130, 140, 185]);
  doc.text(
    "This report was automatically generated by the Clariva AI platform. All analysis is for informational purposes only.",
    PAGE_W / 2,
    PAGE_H - 10,
    { align: "center", maxWidth: CONTENT_W },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER (with coloured bullet, no emoji)
// ─────────────────────────────────────────────────────────────────────────────
function drawSectionHeader(
  doc: jsPDF,
  title: string,
  y: number,
  accent: RGB = C.indigo,
): number {
  const H = 9;
  fill(doc, C.bgAlt);
  stroke(doc, C.border);
  lw(doc, 0.25);
  doc.roundedRect(MARGIN, y, CONTENT_W, H, 1, 1, "FD");

  fill(doc, accent);
  doc.roundedRect(MARGIN, y, 3, H, 1, 1, "F");

  // Small round bullet in accent colour
  fill(doc, accent);
  doc.circle(MARGIN + 8, y + H / 2, 1.4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  rgb(doc, C.dark);
  doc.text(sanitizeWinAnsi(title), MARGIN + 12, y + 6);

  return H + GAP_SM;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BAR
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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  rgb(doc, C.dark);
  doc.text(label, x, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  rgb(doc, color);
  doc.text(`${score}`, x + barW - 20, y + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  rgb(doc, color);
  doc.text(`/ 100`, x + barW, y + 5, { align: "right" });

  fill(doc, C.border);
  stroke(doc, C.border);
  lw(doc, 0);
  doc.roundedRect(x, BAR_Y, barW, BAR_H, BAR_H / 2, BAR_H / 2, "F");

  const fillW = Math.max(BAR_H, (score / 100) * barW);
  fill(doc, color);
  doc.roundedRect(x, BAR_Y, fillW, BAR_H, BAR_H / 2, BAR_H / 2, "F");

  return ROW_H;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────────────────────
function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { bg?: RGB; borderColor?: RGB; radius?: number },
) {
  fill(doc, opts?.bg ?? C.bg);
  stroke(doc, opts?.borderColor ?? C.border);
  lw(doc, 0.3);
  const r = opts?.radius ?? 2;
  doc.roundedRect(x, y, w, h, r, r, "FD");
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHT ITEM
// ─────────────────────────────────────────────────────────────────────────────
function drawInsightItem(
  doc: jsPDF,
  item: { title: string; desc: string },
  x: number,
  y: number,
  maxW: number,
  accent: RGB,
  pale: RGB,
): number {
  const INDENT = 8;
  const PAD_X = 4;
  const PAD_Y = 5;

  const descLines = wrapText(
    doc,
    mdToPlain(item.desc),
    maxW - INDENT - PAD_X * 2 - 2,
    7.8,
    "normal",
  );
  const totalH = PAD_Y + 5.5 + descLines.length * LH(7.8) + PAD_Y + 1;

  drawCard(doc, x, y, maxW, totalH, {
    bg: pale,
    borderColor: accent,
    radius: 1.5,
  });

  fill(doc, accent);
  doc.roundedRect(x, y, 2.5, totalH, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  rgb(doc, C.dark);
  doc.text(sanitizeWinAnsi(item.title), x + INDENT, y + PAD_Y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  rgb(doc, [70, 80, 105]);
  doc.text(descLines, x + INDENT, y + PAD_Y + 10);

  return totalH + GAP_SM;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHIP
// ─────────────────────────────────────────────────────────────────────────────
function drawChip(doc: jsPDF, label: string, x: number, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const clean = sanitizeWinAnsi(label);
  const chipW = doc.getTextWidth(clean) + 10;
  const chipH = 6.5;
  fill(doc, C.indigoPale);
  stroke(doc, C.indigoBorder);
  lw(doc, 0.3);
  doc.roundedRect(x, y, chipW, chipH, chipH / 2, chipH / 2, "FD");
  rgb(doc, C.indigo);
  doc.text(clean, x + 5, y + 4.6);
  return chipW;
}

function drawDivider(doc: jsPDF, y: number): number {
  stroke(doc, C.border);
  lw(doc, 0.25);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineDashPattern([], 0);
  return 5;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN -> PDF-FRIENDLY BLOCKS
// ─────────────────────────────────────────────────────────────────────────────
type MdBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | {
      kind: "para";
      runs: Array<{ text: string; bold?: boolean; url?: string }>;
    }
  | {
      kind: "bullet";
      runs: Array<{ text: string; bold?: boolean; url?: string }>;
    }
  | { kind: "space" };

/** Strip all markdown to a single plain string (used for tight fields). */
function mdToPlain(md: string | null | undefined): string {
  if (!md) return "";
  return sanitizeWinAnsi(
    md
      .replace(/```[\s\S]*?```/g, "") // fenced code
      .replace(/`([^`]+)`/g, "$1") // inline code
      .replace(/^\s{0,3}#{1,6}\s+/gm, "") // headings
      .replace(/\*\*(.+?)\*\*/g, "$1") // bold
      .replace(/\*(.+?)\*/g, "$1") // italic
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, "- ")
      .replace(/\r/g, "")
      .trim(),
  );
}

/** Parse markdown into blocks preserving bold + links. */
function parseMarkdown(md: string): MdBlock[] {
  const out: MdBlock[] = [];
  const src = String(md ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\r/g, "");
  const lines = src.split("\n");

  const parseInline = (
    text: string,
  ): Array<{ text: string; bold?: boolean; url?: string }> => {
    const cleaned = sanitizeWinAnsi(text);
    const runs: Array<{ text: string; bold?: boolean; url?: string }> = [];
    // Pattern captures: [label](url) OR **bold** OR plain text
    const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|([^\[*]+|\*|\[)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(cleaned)) !== null) {
      if (m[1] && m[2]) runs.push({ text: m[1], url: m[2], bold: false });
      else if (m[3]) runs.push({ text: m[3], bold: true });
      else if (m[4]) runs.push({ text: m[4] });
    }
    return runs.length ? runs : [{ text: cleaned }];
  };

  let paraBuf: string[] = [];
  const flushPara = () => {
    if (paraBuf.length === 0) return;
    const joined = paraBuf.join(" ").replace(/\s+/g, " ").trim();
    if (joined) out.push({ kind: "para", runs: parseInline(joined) });
    paraBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      if (out.length && out[out.length - 1].kind !== "space")
        out.push({ kind: "space" });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      const level = Math.min(3, h[1].length) as 1 | 2 | 3;
      out.push({
        kind: "heading",
        level,
        text: sanitizeWinAnsi(h[2].replace(/\*\*/g, "")),
      });
      continue;
    }
    const b = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (b) {
      flushPara();
      out.push({ kind: "bullet", runs: parseInline(b[1]) });
      continue;
    }
    paraBuf.push(line);
  }
  flushPara();
  return out;
}

/**
 * Render markdown blocks inside a padded content area starting at (x, y),
 * wrapping to width w. Returns final y (bottom).
 * NB: does NOT draw a background — caller sizes and draws the card afterwards.
 */
function measureAndRenderMarkdown(
  doc: jsPDF,
  md: string,
  x: number,
  y: number,
  w: number,
  opts: {
    body?: RGB;
    heading?: RGB;
    link?: RGB;
    bodySize?: number;
    dryRun?: boolean;
  } = {},
): number {
  const body = opts.body ?? C.dark;
  const headingC = opts.heading ?? C.indigo;
  const linkC = opts.link ?? C.indigo;
  const bodySize = opts.bodySize ?? 8.5;
  const dry = !!opts.dryRun;

  const blocks = parseMarkdown(md);
  let cy = y;

  for (const b of blocks) {
    if (b.kind === "space") {
      cy += 2;
      continue;
    }

    if (b.kind === "heading") {
      const size = b.level === 1 ? 11 : b.level === 2 ? 10 : 9.2;
      const lines = wrapText(doc, b.text, w, size, "bold");
      if (!dry) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        rgb(doc, headingC);
        doc.text(lines, x, cy + size * 0.35);
      }
      cy += lines.length * LH(size) + 1.5;
      continue;
    }

    // paragraph / bullet
    const bulletIndent = b.kind === "bullet" ? 4 : 0;
    const innerW = w - bulletIndent;

    // Flatten runs to a single string for wrapping, then render span-by-span.
    // Simpler: render bold/link runs by measuring each run and hard-wrapping.
    // For robustness, we linearise: build a token stream of (text, bold, url).
    const tokens: Array<{
      w: number;
      text: string;
      bold?: boolean;
      url?: string;
      brk?: boolean;
    }> = [];
    for (const run of b.runs) {
      // Split on whitespace but preserve spaces
      const parts = run.text.split(/(\s+)/);
      for (const p of parts) {
        if (!p) continue;
        const isSpace = /^\s+$/.test(p);
        doc.setFont("helvetica", run.bold ? "bold" : "normal");
        doc.setFontSize(bodySize);
        tokens.push({
          w: doc.getTextWidth(p),
          text: p,
          bold: run.bold,
          url: run.url,
          brk: isSpace,
        });
      }
    }

    // Word-wrap tokens into lines
    let lineTokens: typeof tokens = [];
    let lineW = 0;
    const flushLine = (last = false) => {
      if (!lineTokens.length) return;
      if (!dry) {
        let cx = x + bulletIndent;
        // draw bullet marker on first line only
        if (b.kind === "bullet" && cy === y + 0) {
          /* handled below */
        }
        for (const t of lineTokens) {
          doc.setFont("helvetica", t.bold ? "bold" : "normal");
          doc.setFontSize(bodySize);
          rgb(doc, t.url ? linkC : body);
          if (t.url) {
            doc.textWithLink(t.text, cx, cy + bodySize * 0.35, { url: t.url });
          } else {
            doc.text(t.text, cx, cy + bodySize * 0.35);
          }
          cx += t.w;
        }
      }
      cy += LH(bodySize);
      lineTokens = [];
      lineW = 0;
    };

    // Bullet marker
    if (b.kind === "bullet" && !dry) {
      fill(doc, body);
      doc.circle(x + 1.4, cy + bodySize * 0.28, 0.7, "F");
    }

    for (const tk of tokens) {
      // Drop leading space at line start
      if (!lineTokens.length && tk.brk) continue;
      if (lineW + tk.w > innerW) {
        // wrap: drop trailing space
        while (lineTokens.length && lineTokens[lineTokens.length - 1].brk) {
          const last = lineTokens.pop()!;
          lineW -= last.w;
        }
        flushLine();
        if (tk.brk) continue;
      }
      lineTokens.push(tk);
      lineW += tk.w;
    }
    flushLine(true);
    cy += 1.5;
  }

  return cy;
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
    overallScore?: number | null;
    feasibilityScore?: number | null;
    uniquenessScore?: number | null;
    impactScore?: number | null;
    innovationScore?: number | null;
    verdictSummary?: string | null;
    strengths?: Array<{ title: string; desc: string }> | null;
    weaknesses?: Array<{ title: string; desc: string }> | null;
    risks?: Array<{ title: string; desc: string }> | null;
    suggestions?: Array<{ title: string; desc: string }> | null;
    techStack?: string[] | null;
    githubRepos?: Array<{
      name: string;
      org: string;
      stars: number;
      desc: string;
      lang: string;
      url: string;
    }> | null;
    marketContext?: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportIdeaAnalysisPdf(idea: PdfExportIdea): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const a = idea.analysis;

  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  let pageNum = 1;
  const newPage = (): number => {
    doc.addPage();
    pageNum++;
    return CONTENT_TOP;
  };
  const ensureSpace = (y: number, needed: number): number =>
    y + needed > CONTENT_BOTTOM ? newPage() : y;

  // ───────────────── COVER ─────────────────
  drawCoverPage(doc, idea);

  // ───────────────── CONTENT ─────────────────
  let y = newPage();

  // Idea title recap
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  rgb(doc, C.dark);
  const titleLines = wrapText(doc, idea.title, CONTENT_W, 15, "bold").slice(
    0,
    2,
  );
  doc.text(titleLines, MARGIN, y + 4);
  y += titleLines.length * LH(15) + 2;

  // Domain chip
  const domainText = sanitizeWinAnsi((idea.domain || "General").toUpperCase());
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

  // ── Description ─────────────────────────────────────────────────
  {
    const size = 8.5;
    const innerW = CONTENT_W - 10;
    const lines = wrapText(doc, idea.description, innerW, size, "normal");
    const cardH = lines.length * LH(size) + 12;
    y = ensureSpace(y, cardH + 18);
    y += drawSectionHeader(doc, "Idea Description", y, C.indigo);
    drawCard(doc, MARGIN, y, CONTENT_W, cardH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    rgb(doc, C.dark);
    doc.text(lines, MARGIN + 5, y + 6);
    y += cardH + GAP_LG;
  }

  // ── ANALYSIS SCORES ─────────────────────────────────────────────
  y = ensureSpace(y, 70);
  y += drawSectionHeader(doc, "Analysis Scores", y, C.indigo);

  const overall = a.overallScore ?? 0;
  const oc = scoreColor(overall);
  const colW = (CONTENT_W - 8) / 2;
  const scoreCardH = 52;

  drawCard(doc, MARGIN, y, colW, scoreCardH, {
    bg: scorePale(overall),
    borderColor: oc,
  });

  // Star tier row (vector stars)
  drawStarRow(
    doc,
    MARGIN + colW / 2,
    y + 8,
    scoreTierCount(overall),
    5,
    1.4,
    oc,
    C.border,
  );

  // Big number + /100 as a single grouped baseline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  rgb(doc, oc);
  const bigStr = String(overall);
  const bigW = doc.getTextWidth(bigStr);
  doc.setFontSize(10);
  const smallStr = "/ 100";
  const smallW = doc.getTextWidth(smallStr);
  const groupW = bigW + 2 + smallW;
  const groupX = MARGIN + colW / 2 - groupW / 2;
  doc.setFontSize(38);
  doc.text(bigStr, groupX, y + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rgb(doc, C.muted);
  doc.text(smallStr, groupX + bigW + 2, y + 28);

  // Label + sub-label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  rgb(doc, oc);
  doc.text(scoreLabel(overall), MARGIN + colW / 2, y + 40, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  rgb(doc, C.muted);
  doc.text("OVERALL VERDICT", MARGIN + colW / 2, y + 45, { align: "center" });

  // Sub-scores card
  const barsX = MARGIN + colW + 8;
  const barsW = colW;
  drawCard(doc, barsX, y, barsW, scoreCardH);
  let barY = y + 4;
  const subScoreRows = [
    { label: "Feasibility", val: a.feasibilityScore },
    { label: "Uniqueness", val: a.uniquenessScore },
    { label: "Impact", val: a.impactScore },
    { label: "Innovation", val: a.innovationScore },
  ];
  for (const s of subScoreRows) {
    if (s.val != null) {
      barY += drawScoreBar(doc, s.label, s.val, barsX + 4, barY, barsW - 8);
    }
  }
  y += scoreCardH + GAP_LG;

  // ── ENGINE VERDICT (markdown-aware) ─────────────────────────────
  if (a.verdictSummary) {
    y = ensureSpace(y, 30);
    y += drawSectionHeader(doc, "Engine Verdict", y, C.indigo);

    // Measure first (dry run)
    const innerW = CONTENT_W - 14;
    const startY = y + 6;
    const measuredBottom = measureAndRenderMarkdown(
      doc,
      a.verdictSummary,
      MARGIN + 7,
      startY,
      innerW,
      {
        body: C.dark,
        heading: C.indigo,
        link: C.indigo,
        bodySize: 8.5,
        dryRun: true,
      },
    );
    const cardH = measuredBottom - y + 4;

    // If the card would run past the page, paginate the render.
    if (y + cardH <= CONTENT_BOTTOM) {
      drawCard(doc, MARGIN, y, CONTENT_W, cardH, {
        bg: C.indigoPale,
        borderColor: C.indigoBorder,
      });
      fill(doc, C.indigo);
      doc.roundedRect(MARGIN, y, 3, cardH, 1, 1, "F");
      measureAndRenderMarkdown(
        doc,
        a.verdictSummary,
        MARGIN + 7,
        startY,
        innerW,
        {
          body: C.dark,
          heading: C.indigo,
          link: C.indigo,
          bodySize: 8.5,
        },
      );
      y += cardH + GAP_LG;
    } else {
      // Render across pages without card frame to avoid clipping
      y = renderLongMarkdownAcrossPages(
        doc,
        a.verdictSummary,
        y,
        CONTENT_BOTTOM,
        newPage,
        ensureSpace,
        {
          body: C.dark,
          heading: C.indigo,
          link: C.indigo,
          bodySize: 8.5,
        },
      );
      y += GAP_LG;
    }
  }

  // ── INSIGHT SECTIONS ────────────────────────────────────────────
  const insightGroups = [
    {
      title: "Strengths",
      items: a.strengths,
      color: C.emerald,
      pale: C.emeraldPale,
    },
    {
      title: "Weaknesses",
      items: a.weaknesses,
      color: C.amber,
      pale: C.amberPale,
    },
    { title: "Market Risks", items: a.risks, color: C.red, pale: C.redPale },
    {
      title: "Strategic Pivots",
      items: a.suggestions,
      color: C.purple,
      pale: C.purplePale,
    },
  ] as const;

  for (const group of insightGroups) {
    if (!group.items || group.items.length === 0) continue;
    y = ensureSpace(y, 24);
    y += drawSectionHeader(doc, group.title, y, group.color);
    for (const item of group.items) {
      const descLines = wrapText(
        doc,
        mdToPlain(item.desc),
        CONTENT_W - 22,
        7.8,
        "normal",
      );
      const itemH = 5 + 5.5 + descLines.length * LH(7.8) + 5 + 1 + GAP_SM;
      y = ensureSpace(y, itemH);
      y += drawInsightItem(
        doc,
        item,
        MARGIN,
        y,
        CONTENT_W,
        group.color,
        group.pale,
      );
    }
    y += GAP_SM;
  }

  // ── TECH STACK ──────────────────────────────────────────────────
  if (a.techStack && a.techStack.length > 0) {
    y = ensureSpace(y, 30);
    y += drawSectionHeader(doc, "Recommended Tech Stack", y, C.indigo);

    let tagX = MARGIN;
    let tagRowY = y;
    const CHIP_H = 6.5;
    const CHIP_GAP_X = 3;
    const CHIP_GAP_Y = 4;

    for (const tech of a.techStack) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const chipW = doc.getTextWidth(sanitizeWinAnsi(tech)) + 10;

      if (tagX + chipW > PAGE_W - MARGIN) {
        tagX = MARGIN;
        tagRowY += CHIP_H + CHIP_GAP_Y;
        tagRowY = ensureSpace(tagRowY, CHIP_H + 4);
      }
      drawChip(doc, tech, tagX, tagRowY);
      tagX += chipW + CHIP_GAP_X;
    }
    y = tagRowY + CHIP_H + GAP_LG;
  }

  // ── GITHUB PRIOR ART ────────────────────────────────────────────
  if (a.githubRepos && a.githubRepos.length > 0) {
    y = ensureSpace(y, 30);
    y += drawSectionHeader(doc, "Relevant Prior Art (GitHub)", y, C.indigo);

    for (const repo of a.githubRepos) {
      const repoDescLines = wrapText(
        doc,
        mdToPlain(repo.desc),
        CONTENT_W - 14,
        7.5,
        "normal",
      );
      const CARD_PAD = 5;
      const cardH =
        CARD_PAD + 6 + 6 + repoDescLines.length * LH(7.5) + CARD_PAD;
      y = ensureSpace(y, cardH + GAP_SM);

      drawCard(doc, MARGIN, y, CONTENT_W, cardH);

      // Repo name (link)
      const repoName = sanitizeWinAnsi(`${repo.org}/${repo.name}`);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      rgb(doc, C.indigo);
      doc.textWithLink(repoName, MARGIN + CARD_PAD, y + CARD_PAD + 4, {
        url: repo.url,
      });

      // Star + count (vector star)
      const starsStr =
        repo.stars >= 1000
          ? `${(repo.stars / 1000).toFixed(1)}k`
          : String(repo.stars);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      const sw = doc.getTextWidth(starsStr);
      const rightX = PAGE_W - MARGIN - CARD_PAD;
      drawStar(doc, rightX - sw - 2.5, y + CARD_PAD + 3, 1.6, C.amber);
      rgb(doc, C.amber);
      doc.text(starsStr, rightX, y + CARD_PAD + 4, { align: "right" });

      // Separator
      stroke(doc, C.border);
      lw(doc, 0.2);
      doc.line(
        MARGIN + CARD_PAD,
        y + CARD_PAD + 6,
        PAGE_W - MARGIN - CARD_PAD,
        y + CARD_PAD + 6,
      );

      // Language chip
      let contentY = y + CARD_PAD + 9;
      if (repo.lang) {
        const clean = sanitizeWinAnsi(repo.lang);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        const langW = doc.getTextWidth(clean) + 8;
        fill(doc, C.indigoPale);
        stroke(doc, C.indigoBorder);
        lw(doc, 0.25);
        doc.roundedRect(MARGIN + CARD_PAD, contentY, langW, 5, 1, 1, "FD");
        rgb(doc, C.indigo);
        doc.text(clean, MARGIN + CARD_PAD + 4, contentY + 3.6);
        contentY += 7;
      }

      if (repoDescLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        rgb(doc, C.muted);
        doc.text(repoDescLines, MARGIN + CARD_PAD, contentY + 1);
      }

      y += cardH + GAP_SM;
    }
    y += GAP_SM;
  }

  // ── MARKET CONTEXT (markdown-aware) ─────────────────────────────
  if (a.marketContext) {
    y = ensureSpace(y, 30);
    y += drawSectionHeader(doc, "Market Context", y, C.cyanDark);

    const innerW = CONTENT_W - 14;
    const startY = y + 6;
    const measuredBottom = measureAndRenderMarkdown(
      doc,
      a.marketContext,
      MARGIN + 7,
      startY,
      innerW,
      {
        body: C.dark,
        heading: C.cyanDark,
        link: C.cyanDark,
        bodySize: 8.5,
        dryRun: true,
      },
    );
    const cardH = measuredBottom - y + 4;

    if (y + cardH <= CONTENT_BOTTOM) {
      drawCard(doc, MARGIN, y, CONTENT_W, cardH);
      fill(doc, C.cyanDark);
      doc.roundedRect(MARGIN, y, 3, cardH, 1, 1, "F");
      measureAndRenderMarkdown(
        doc,
        a.marketContext,
        MARGIN + 7,
        startY,
        innerW,
        {
          body: C.dark,
          heading: C.cyanDark,
          link: C.cyanDark,
          bodySize: 8.5,
        },
      );
      y += cardH + GAP_LG;
    } else {
      y = renderLongMarkdownAcrossPages(
        doc,
        a.marketContext,
        y,
        CONTENT_BOTTOM,
        newPage,
        ensureSpace,
        {
          body: C.dark,
          heading: C.cyanDark,
          link: C.cyanDark,
          bodySize: 8.5,
        },
      );
      y += GAP_LG;
    }
  }

  // ───────────────── CHROME ─────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageHeader(doc, p, totalPages);
    drawPageFooter(doc, idea.title, exportDate);
  }

  // ───────────────── SAVE ─────────────────
  const safeTitle = idea.title
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .slice(0, 40);
  doc.save(`clariva-analysis-${safeTitle}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// LONG-MARKDOWN RENDERER (block-by-block pagination, no clipping)
// ─────────────────────────────────────────────────────────────────────────────
function renderLongMarkdownAcrossPages(
  doc: jsPDF,
  md: string,
  y: number,
  bottom: number,
  newPage: () => number,
  ensureSpace: (y: number, need: number) => number,
  opts: { body: RGB; heading: RGB; link: RGB; bodySize: number },
): number {
  const blocks = parseMarkdown(md);
  const innerX = MARGIN + 4;
  const innerW = CONTENT_W - 8;
  let cy = y + 2;

  for (const b of blocks) {
    // Measure block height in isolation
    const measure = (yy: number) =>
      measureAndRenderMarkdown(doc, blockToMd(b), innerX, yy, innerW, {
        ...opts,
        dryRun: true,
      }) - yy;
    const h = measure(cy);
    if (cy + h > bottom) cy = newPage();
    measureAndRenderMarkdown(doc, blockToMd(b), innerX, cy, innerW, opts);
    cy += h;
  }
  return cy;
}

function blockToMd(b: MdBlock): string {
  if (b.kind === "space") return "";
  if (b.kind === "heading") return "#".repeat(b.level) + " " + b.text;
  const inline = b.runs
    .map((r) => {
      if (r.url) return `[${r.text}](${r.url})`;
      if (r.bold) return `**${r.text}**`;
      return r.text;
    })
    .join("");
  return b.kind === "bullet" ? `- ${inline}` : inline;
}
