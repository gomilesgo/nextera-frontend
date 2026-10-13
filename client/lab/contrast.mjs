// Measures contrast of text against the actually-composited page behind it.
// The element is hidden, the ground under its box is sampled at a grid of
// points, and the worst (brightest, for light text) sample is reported.
import { inflateSync } from "node:zlib";
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = process.argv[2] ?? "http://localhost:3000/";

/** Decode a 1x1 PNG screenshot into [r, g, b]. */
function pixel(buffer) {
  let offset = 8;
  let colorType = 6;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") colorType = data[9];
    if (type === "IDAT") idat.push(data);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  // One pixel, one scanline: every filter type resolves to the raw bytes.
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const body = raw.subarray(1, 1 + channels);
  return channels === 1 ? [body[0], body[0], body[0]] : [body[0], body[1], body[2]];
}

function channel(value) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a, b) {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function parseColor(text) {
  const match = text.match(/rgba?\(([^)]+)\)/);
  if (!match) return [255, 255, 255];
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [parts[0], parts[1], parts[2]];
}

const targets = [
  { scroll: 0, selector: "#hero-heading", label: "hero h1 over photo" },
  { scroll: 0, selector: "#hero p.mt-7", label: "hero paragraph over photo" },
  { scroll: 700, selector: "#hero p.mt-7", label: "hero paragraph, mid-scroll" },
  { scroll: 0, selector: ".instrument p:first-of-type", label: "instrument standing order", fixed: true },
  { scroll: 0, selector: ".instrument p:last-of-type", label: "instrument credited total", fixed: true },
  { view: "#year-heading", label: "year heading" },
  { view: "#year tbody tr:last-child th", label: "pending credit row, date" },
  { view: "#year tbody tr:first-child td", label: "landed credit, ember" },
  { view: "#plans-heading", label: "plans heading" },
  { view: "#risks h2", label: "disclosure heading on paper" },
  { view: "#risks li span:last-child", label: "disclosure body on paper" },
  { view: "#maturity dd", label: "maturity figure" },
];

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1000);

for (const target of targets) {
  if (target.view) {
    await page.evaluate((selector) => {
      document.querySelector(selector)?.scrollIntoView({ block: "center", behavior: "instant" });
    }, target.view);
  } else {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), target.scroll);
  }
  await page.waitForTimeout(650);

  const info = await page.evaluate((selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      color: style.color,
      opacity: Number(style.opacity),
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
    };
  }, target.view ?? target.selector);

  if (!info || info.box.width < 2 || info.box.height < 2) {
    console.log(`${target.label.padEnd(32)} NOT FOUND`);
    continue;
  }

  await page.evaluate((selector) => {
    document.querySelector(selector).style.visibility = "hidden";
  }, target.view ?? target.selector);
  await page.waitForTimeout(80);

  let brightest = 0;
  let darkest = 1;
  let samples = 0;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const x = Math.round(info.box.x + (info.box.width * (col + 0.5)) / 7);
      const y = Math.round(info.box.y + (info.box.height * (row + 0.5)) / 4);
      // Page copy is sampled only where no fixed chrome covers it; the bar
      // itself is the top layer, so it is sampled over its own box.
      const top = target.fixed ? 0 : 72;
      const bottom = target.fixed ? 899 : 840;
      if (x < 0 || x > 1439 || y < top || y > bottom) continue;
      samples += 1;
      const shot = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
      const sample = luminance(pixel(shot));
      brightest = Math.max(brightest, sample);
      darkest = Math.min(darkest, sample);
    }
  }

  await page.evaluate((selector) => {
    document.querySelector(selector).style.visibility = "";
  }, target.view ?? target.selector);

  if (samples === 0) {
    console.log(`${target.label.padEnd(32)} NO SAMPLES (off-screen)`);
    continue;
  }

  const ink = luminance(parseColor(info.color));
  // The worst ground is whichever sampled extreme sits closest to the ink.
  const value = Math.min(ratio(ink, brightest), ratio(ink, darkest));
  const pass = value >= 4.5 ? "pass" : value >= 3 ? "large-only" : "FAIL";
  console.log(`${target.label.padEnd(32)} ${value.toFixed(2)}:1  ${pass}  ${info.color}`);
}

await browser.close();
