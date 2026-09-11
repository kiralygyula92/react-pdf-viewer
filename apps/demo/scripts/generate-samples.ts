/**
 * Generates the demo's sample PDFs (license-clean and reproducible: no dates, no random IDs).
 *
 *   pnpm --filter demo generate-samples
 *
 * Outputs to public/samples/ together with manifest.json. `password.pdf` is encrypted with the
 * PDF standard security handler (RC4, 128-bit, revision 3) implemented below, so no external tool
 * such as qpdf is needed. User password: `demo`.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  degrees,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFRawStream,
  PDFStream,
  PDFString,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFObject,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib';

const OUT_DIR = fileURLToPath(new URL('../public/samples/', import.meta.url));

type Size = [width: number, height: number];
const LETTER: Size = [612, 792];
const A4: Size = [595.28, 841.89];
const A3_LANDSCAPE: Size = [1190.55, 841.89];
const RECEIPT: Size = [226.77, 566.93];

const INK = rgb(0.13, 0.17, 0.22);
const MUTED = rgb(0.42, 0.47, 0.53);
const GRID = rgb(0.86, 0.89, 0.92);
const ACCENT = rgb(0.2, 0.4, 0.75);

interface ManifestEntry {
  file: string;
  title: string;
  pages: number;
  notes: string;
}

const manifest: ManifestEntry[] = [];

async function createDocument(title: string) {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(title);
  doc.setProducer('react-pdf-viewer demo sample generator');
  return doc;
}

async function save(
  doc: PDFDocument,
  file: string,
  notes: string,
  transform?: (doc: PDFDocument) => Promise<Uint8Array>,
) {
  // Read metadata before `transform`: encryption rewrites the Info strings.
  const title = doc.getTitle() ?? file;
  const pages = doc.getPageCount();
  const bytes = transform ? await transform(doc) : await doc.save({ useObjectStreams: false });
  writeFileSync(`${OUT_DIR}${file}`, bytes);
  manifest.push({ file, title, pages, notes });
}

function drawGrid(page: PDFPage, step = 36) {
  const { width, height } = page.getSize();
  for (let x = step; x < width; x += step) {
    page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.5, color: GRID });
  }
  for (let y = step; y < height; y += step) {
    page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.5, color: GRID });
  }
  page.drawRectangle({
    x: 12,
    y: 12,
    width: width - 24,
    height: height - 24,
    borderColor: MUTED,
    borderWidth: 1,
  });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Deterministic pseudo-random generator (mulberry32). */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS =
  'the viewer renders each page of a portable document onto a canvas while the toolbar offers zoom rotation navigation download and print controls every sample in this collection exists to exercise one behaviour such as fitting centering continuous scrolling search or accessibility of the text layer quality matters because readers depend on documents for reports contracts research and receipts'.split(
    ' ',
  );

function paragraph(next: () => number, sentences: number): string {
  const out: string[] = [];
  for (let s = 0; s < sentences; s++) {
    const length = 8 + Math.floor(next() * 12);
    const words = Array.from({ length }, () => WORDS[Math.floor(next() * WORDS.length)] ?? 'pdf');
    const sentence = words.join(' ');
    out.push(`${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`);
  }
  return out.join(' ');
}

// ── Samples ─────────────────────────────────────────────────────────────────

async function letterThreePages() {
  const doc = await createDocument('US Letter, 3 pages');
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let n = 1; n <= 3; n++) {
    const page = doc.addPage(LETTER);
    drawGrid(page);
    page.drawText(`Page ${n} of 3`, { x: 48, y: 736, size: 28, font: bold, color: INK });
    page.drawText('US Letter, 8.5 × 11 in (612 × 792 pt)', {
      x: 48,
      y: 706,
      size: 14,
      font,
      color: MUTED,
    });
    const label = String(n);
    const size = 320;
    page.drawText(label, {
      x: (612 - bold.widthOfTextAtSize(label, size)) / 2,
      y: 280,
      size,
      font: bold,
      color: ACCENT,
    });
    page.drawText('Grid: 0.5 in', { x: 48, y: 40, size: 10, font, color: MUTED });
  }
  await save(
    doc,
    'letter-3pages.pdf',
    'Large page numbers on a grid. Navigation and parity screenshots.',
  );
}

async function multipage() {
  const doc = await createDocument('Long document, 40 pages');
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const next = random(40);
  for (let n = 1; n <= 40; n++) {
    const page = doc.addPage(LETTER);
    let y = 720;
    page.drawText(`Chapter ${n}`, { x: 54, y, size: 22, font: bold, color: INK });
    y -= 34;
    while (y > 90) {
      const lines = wrap(paragraph(next, 4), font, 11, 612 - 108);
      if (y - lines.length * 15 < 80) break;
      for (const line of lines) {
        page.drawText(line, { x: 54, y, size: 11, font, color: INK });
        y -= 15;
      }
      y -= 10;
    }
    page.drawText(`${n} / 40`, { x: 290, y: 40, size: 10, font, color: MUTED });
  }
  await save(
    doc,
    'multipage.pdf',
    'Text-heavy. Continuous scroll, search, thumbnails and performance.',
  );
}

async function mixedSizes() {
  const doc = await createDocument('Mixed page sizes');
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const sizes: [string, Size][] = [
    ['US Letter (612 × 792 pt)', LETTER],
    ['A4 (595 × 842 pt)', A4],
    ['A3 landscape (1191 × 842 pt)', A3_LANDSCAPE],
    ['Receipt, 80 × 200 mm', RECEIPT],
  ];
  sizes.forEach(([name, size], index) => {
    const page = doc.addPage(size);
    drawGrid(page, size === RECEIPT ? 18 : 36);
    const titleSize = size === RECEIPT ? 14 : 28;
    page.drawText(`Page ${index + 1}`, {
      x: 28,
      y: size[1] - 28 - titleSize,
      size: titleSize,
      font: bold,
      color: INK,
    });
    for (const [i, line] of wrap(name, font, titleSize * 0.6, size[0] - 56).entries()) {
      page.drawText(line, {
        x: 28,
        y: size[1] - 56 - titleSize - i * titleSize * 0.8,
        size: titleSize * 0.6,
        font,
        color: MUTED,
      });
    }
  });
  await save(
    doc,
    'mixed-sizes.pdf',
    'Letter, A4, A3 landscape and a narrow receipt. Fitting and centering.',
  );
}

async function intrinsicRotation() {
  const doc = await createDocument('Intrinsic page rotation');
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const upright = doc.addPage(LETTER);
  drawGrid(upright);
  upright.drawText('Page 1: no /Rotate', { x: 48, y: 730, size: 26, font: bold, color: INK });
  upright.drawText('Reference page stored and shown in portrait.', {
    x: 48,
    y: 700,
    size: 14,
    font,
    color: MUTED,
  });

  // Stored portrait with its content drawn sideways, as scanners do; /Rotate 90 makes it
  // upright in landscape. A viewer that ignores /Rotate shows sideways text (KI-03).
  const rotated = doc.addPage(LETTER);
  rotated.setRotation(degrees(90));
  drawGrid(rotated);
  const lines: [string, number, PDFFont][] = [
    ['Page 2: /Rotate 90', 26, bold],
    ['Shown in landscape with this text upright when /Rotate is honoured.', 14, font],
    ['If this text runs vertically, the viewer ignored the page rotation.', 14, font],
  ];
  lines.forEach(([text, size, face], index) => {
    // Displayed (X from left, Y from top) maps to page space x = Y, y = X for /Rotate 90.
    rotated.drawText(text, {
      x: 70 + index * 32,
      y: 48,
      size,
      font: face,
      color: index === 0 ? INK : MUTED,
      rotate: degrees(90),
    });
  });

  const flipped = doc.addPage(LETTER);
  flipped.setRotation(degrees(180));
  drawGrid(flipped);
  flipped.drawText('Page 3: /Rotate 180', {
    x: 612 - 48,
    y: 70,
    size: 26,
    font: bold,
    color: INK,
    rotate: degrees(180),
  });
  await save(doc, 'intrinsic-rotation.pdf', 'Pages with /Rotate 90 and 180. Verifies KI-03.');
}

function addLink(
  page: PDFPage,
  rect: [number, number, number, number],
  action: PDFDict | PDFArray,
) {
  const { context } = page.doc;
  const annotation = context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: rect,
    Border: [0, 0, 0],
    ...(action instanceof PDFArray ? { Dest: action } : { A: action }),
  });
  const ref = context.register(annotation);
  const existing = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (existing) existing.push(ref);
  else page.node.set(PDFName.of('Annots'), context.obj([ref]));
}

async function links() {
  const doc = await createDocument('Internal and external links');
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const first = doc.addPage(LETTER);
  const second = doc.addPage(LETTER);
  const { context } = doc;

  const button = (page: PDFPage, y: number, text: string) => {
    page.drawRectangle({ x: 48, y, width: 300, height: 36, borderColor: ACCENT, borderWidth: 1.5 });
    page.drawText(text, { x: 60, y: y + 12, size: 14, font, color: ACCENT });
    return [48, y, 348, y + 36] as [number, number, number, number];
  };

  first.drawText('Links', { x: 48, y: 720, size: 28, font: bold, color: INK });
  addLink(
    first,
    button(first, 640, 'Go to page 2 (internal link)'),
    context.obj([second.ref, PDFName.of('XYZ'), PDFNull, PDFNull, PDFNull]),
  );
  addLink(
    first,
    button(first, 580, 'Open mozilla.github.io/pdf.js (external)'),
    context.obj({
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of('https://mozilla.github.io/pdf.js/'),
    }),
  );
  second.drawText('Page 2', { x: 48, y: 720, size: 28, font: bold, color: INK });
  addLink(
    second,
    button(second, 640, 'Back to page 1'),
    context.obj([first.ref, PDFName.of('XYZ'), PDFNull, PDFNull, PDFNull]),
  );
  await save(doc, 'links.pdf', 'Internal and external link annotations. Annotation layer.');
}

async function nonEmbeddedFonts() {
  const doc = await createDocument('Standard 14 fonts (not embedded)');
  const page = doc.addPage(LETTER);
  const title = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('Standard 14 fonts, referenced but not embedded', {
    x: 48,
    y: 730,
    size: 20,
    font: title,
    color: INK,
  });
  const samples: [StandardFonts, string][] = [
    [StandardFonts.Helvetica, 'Helvetica: The quick brown fox jumps over the lazy dog'],
    [StandardFonts.HelveticaBold, 'Helvetica-Bold: The quick brown fox'],
    [StandardFonts.HelveticaOblique, 'Helvetica-Oblique: The quick brown fox'],
    [StandardFonts.HelveticaBoldOblique, 'Helvetica-BoldOblique: The quick brown fox'],
    [StandardFonts.TimesRoman, 'Times-Roman: The quick brown fox jumps over the lazy dog'],
    [StandardFonts.TimesRomanBold, 'Times-Bold: The quick brown fox'],
    [StandardFonts.TimesRomanItalic, 'Times-Italic: The quick brown fox'],
    [StandardFonts.TimesRomanBoldItalic, 'Times-BoldItalic: The quick brown fox'],
    [StandardFonts.Courier, 'Courier: The quick brown fox jumps over the lazy dog'],
    [StandardFonts.CourierBold, 'Courier-Bold: The quick brown fox'],
    [StandardFonts.CourierOblique, 'Courier-Oblique: The quick brown fox'],
    [StandardFonts.CourierBoldOblique, 'Courier-BoldOblique: The quick brown fox'],
    [StandardFonts.Symbol, 'αβγδε ΣΩ'],
    [StandardFonts.ZapfDingbats, '✓✔✈❤'],
  ];
  let y = 680;
  for (const [name, text] of samples) {
    const font = await doc.embedFont(name);
    page.drawText(text, { x: 48, y, size: 16, font, color: INK });
    y -= 40;
  }
  await save(
    doc,
    'non-embedded-fonts.pdf',
    'Uses the standard 14 fonts without embedding. Verifies KI-20.',
  );
}

// ── Encryption (PDF standard security handler, RC4 128-bit, R3) ────────────

const PASSWORD_PADDING = Buffer.from(
  '28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a',
  'hex',
);

function rc4(key: Uint8Array, data: Uint8Array): Buffer {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + (s[i] ?? 0) + (key[i % key.length] ?? 0)) & 255;
    [s[i], s[j]] = [s[j] ?? 0, s[i] ?? 0];
  }
  const out = Buffer.alloc(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 255;
    j = (j + (s[i] ?? 0)) & 255;
    [s[i], s[j]] = [s[j] ?? 0, s[i] ?? 0];
    out[k] = (data[k] ?? 0) ^ (s[((s[i] ?? 0) + (s[j] ?? 0)) & 255] ?? 0);
  }
  return out;
}

const md5 = (...parts: Uint8Array[]) => createHash('md5').update(Buffer.concat(parts)).digest();
const padPassword = (password: string) =>
  Buffer.concat([Buffer.from(password, 'latin1'), PASSWORD_PADDING]).subarray(0, 32);
const xorKey = (key: Uint8Array, value: number) => Buffer.from(key.map((byte) => byte ^ value));

function encryptionEntries(user: string, owner: string, permissions: number, id: Buffer) {
  // Algorithm 3: owner password entry.
  let ownerHash = md5(padPassword(owner));
  for (let i = 0; i < 50; i++) ownerHash = md5(ownerHash);
  let o = rc4(ownerHash, padPassword(user));
  for (let i = 1; i <= 19; i++) o = rc4(xorKey(ownerHash, i), o);

  // Algorithm 2: file encryption key.
  const p = Buffer.alloc(4);
  p.writeInt32LE(permissions);
  let key = md5(padPassword(user), o, p, id);
  for (let i = 0; i < 50; i++) key = md5(key);

  // Algorithm 5: user password entry.
  let u = rc4(key, md5(PASSWORD_PADDING, id));
  for (let i = 1; i <= 19; i++) u = rc4(xorKey(key, i), u);
  return { o, u: Buffer.concat([u, Buffer.alloc(16)]), key };
}

function objectKey(key: Buffer, ref: PDFRef): Buffer {
  const { objectNumber: num, generationNumber: gen } = ref;
  const suffix = Buffer.from([
    num & 255,
    (num >> 8) & 255,
    (num >> 16) & 255,
    gen & 255,
    (gen >> 8) & 255,
  ]);
  return md5(key, suffix).subarray(0, Math.min(key.length + 5, 16));
}

function encryptStrings(value: PDFObject, key: Buffer): PDFObject {
  if (value instanceof PDFString || value instanceof PDFHexString) {
    return PDFHexString.of(rc4(key, value.asBytes()).toString('hex'));
  }
  if (value instanceof PDFDict) {
    for (const [name, entry] of value.entries()) value.set(name, encryptStrings(entry, key));
  } else if (value instanceof PDFArray) {
    for (let i = 0; i < value.size(); i++) value.set(i, encryptStrings(value.get(i), key));
  }
  return value;
}

async function encrypt(doc: PDFDocument, user: string, owner: string): Promise<Uint8Array> {
  await doc.flush();
  const { context } = doc;
  const id = md5(Buffer.from('react-pdf-viewer demo password sample'));
  const permissions = -4;
  const { o, u, key } = encryptionEntries(user, owner, permissions, id);

  for (const [ref, object] of context.enumerateIndirectObjects()) {
    const objKey = objectKey(key, ref);
    if (object instanceof PDFStream) {
      const encrypted = rc4(objKey, object.getContents());
      encryptStrings(object.dict, objKey);
      context.assign(ref, PDFRawStream.of(object.dict, encrypted));
    } else {
      context.assign(ref, encryptStrings(object, objKey));
    }
  }

  context.trailerInfo.Encrypt = context.register(
    context.obj({
      Filter: 'Standard',
      V: 2,
      R: 3,
      Length: 128,
      P: permissions,
      O: PDFHexString.of(o.toString('hex')),
      U: PDFHexString.of(u.toString('hex')),
    }),
  );
  const idHex = PDFHexString.of(id.toString('hex'));
  context.trailerInfo.ID = context.obj([idHex, idHex]);
  return doc.save({ useObjectStreams: false, updateFieldAppearances: false });
}

async function passwordProtected() {
  const doc = await createDocument('Password protected (password: demo)');
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage(LETTER);
  drawGrid(page);
  page.drawText('Unlocked!', { x: 48, y: 720, size: 32, font: bold, color: INK });
  page.drawText('This document is encrypted (RC4, 128-bit). The password is "demo".', {
    x: 48,
    y: 688,
    size: 14,
    font,
    color: MUTED,
  });
  await save(
    doc,
    'password.pdf',
    'Encrypted; user password "demo". Password prompt (KI-23).',
    (d) => encrypt(d, 'demo', 'react-pdf-viewer-owner'),
  );
}

function notAPdf() {
  const html =
    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Sign in</title></head>' +
    '<body><h1>Please sign in</h1><p>This is an HTML page served with a .pdf name.</p></body></html>\n';
  writeFileSync(`${OUT_DIR}not-a-pdf.pdf`, html);
  manifest.push({
    file: 'not-a-pdf.pdf',
    title: 'Not a PDF (HTML page)',
    pages: 0,
    notes: 'HTML content with a .pdf name. Produces an INVALID_PDF error.',
  });
}

mkdirSync(OUT_DIR, { recursive: true });
await letterThreePages();
await multipage();
await mixedSizes();
await intrinsicRotation();
await links();
await nonEmbeddedFonts();
await passwordProtected();
notAPdf();
writeFileSync(`${OUT_DIR}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.length} samples to ${OUT_DIR}`);
