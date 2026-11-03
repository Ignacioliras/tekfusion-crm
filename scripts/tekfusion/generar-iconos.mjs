// Regenerates the whole favicon / PWA icon set from one SVG design.
// Usage: node scripts/tekfusion/generar-iconos.mjs
// Uses the Playwright Chromium already installed for the tests (no new dependency).
// Every PNG in public/appIcon keeps its current size; favicon.ico gets
// 16/24/32/48 px PNG entries. Replace ICON_SVG when TekFusion delivers its logo.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = join(import.meta.dirname, "..", "..", "public");
const ICON_DIR = join(ROOT, "appIcon");
const BACKGROUND = "#0f172a";
const ACCENT = "#f97316";
const ICO_SIZES = [16, 24, 32, 48];

// `scale` shrinks the letters: maskable icons must keep content inside the
// central 80% safe zone, because the platform crops them to a circle.
const iconSvg = (scale) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <rect width="100" height="100" fill="${BACKGROUND}"/>
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    <text x="50" y="66" text-anchor="middle" font-family="'Segoe UI', Helvetica, Arial, sans-serif"
      font-size="52" font-weight="700" fill="#ffffff">T<tspan fill="${ACCENT}">F</tspan></text>
  </g>
</svg>`;

const pngSize = (file) => {
  const buffer = readFileSync(file);
  return buffer.readUInt32BE(16); // IHDR width; the icons are square
};

const render = async (page, size, scale) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0">${iconSvg(scale)}</body></html>`,
  );
  return page.screenshot({ omitBackground: false });
};

// ICO container with PNG-compressed entries (supported by every current browser).
const buildIco = (pngs) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const files = readdirSync(ICON_DIR).filter((f) => f.endsWith(".png"));
  for (const file of files) {
    const path = join(ICON_DIR, file);
    const scale = file.startsWith("maskable") ? 0.7 : 1;
    writeFileSync(path, await render(page, pngSize(path), scale));
  }
  const icoImages = [];
  for (const size of ICO_SIZES) {
    icoImages.push({ size, data: await render(page, size, 1) });
  }
  writeFileSync(join(ROOT, "favicon.ico"), buildIco(icoImages));
  console.log(`${files.length} PNG + favicon.ico regenerados`); // eslint-disable-line no-console
} finally {
  await browser.close();
}
