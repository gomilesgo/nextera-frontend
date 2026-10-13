// Scroll-position screenshot harness for the landing build.
// node lab/shoot.mjs --out lab/desktop --width 1440 --height 900 [--reduced] [--frames 14]
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (!key.startsWith("--")) continue;
  const next = process.argv[i + 1];
  args.set(key.slice(2), next && !next.startsWith("--") ? next : "true");
}

const url = args.get("url") ?? "http://localhost:3000/";
const out = args.get("out") ?? "lab/desktop";
const width = Number(args.get("width") ?? 1440);
const height = Number(args.get("height") ?? 900);
const frames = Number(args.get("frames") ?? 14);
const reduced = args.get("reduced") === "true";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 1,
  reducedMotion: reduced ? "reduce" : "no-preference",
  hasTouch: width < 700,
  isMobile: width < 700,
});
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1200);

const pageTotal = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const from = Number(args.get("from") ?? 0);
const total = Number(args.get("to") ?? pageTotal) - from;
const acts = await page.evaluate(() =>
  [...document.querySelectorAll("section[id]")].map((node) => ({
    id: node.id,
    top: Math.round(node.getBoundingClientRect().top + window.scrollY),
    height: Math.round(node.getBoundingClientRect().height),
  })),
);

const shots = [];
for (let index = 0; index < frames; index += 1) {
  const y = Math.round(from + (total * index) / (frames - 1));
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.waitForTimeout(reduced ? 200 : 520);
  const file = `${out}/${String(index).padStart(2, "0")}.png`;
  const buffer = await page.screenshot({ path: file });
  const state = await page.evaluate(() => {
    const bar = document.querySelector(".instrument");
    const here = [...document.querySelectorAll("section[id]")].find((node) => {
      const box = node.getBoundingClientRect();
      return box.top <= window.innerHeight / 2 && box.bottom >= window.innerHeight / 2;
    });
    return {
      act: here?.id ?? "",
      bar: bar ? bar.textContent.replace(/\s+/g, " ").trim() : null,
    };
  });
  shots.push({ index, y, file, hash: createHash("sha1").update(buffer).digest("hex").slice(0, 12), ...state });
}

const dead = [];
for (let index = 1; index < shots.length; index += 1) {
  if (shots[index].hash === shots[index - 1].hash) {
    dead.push({ from: shots[index - 1].y, to: shots[index].y, act: shots[index].act });
  }
}

const report = { url, width, height, reduced, total, acts, shots, dead, consoleErrors };
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));

console.log(`page height ${total + height}px, ${frames} frames -> ${out}`);
console.log("acts:", acts.map((a) => `${a.id}:${a.height}`).join("  "));
if (dead.length) console.log("DEAD SCROLL:", JSON.stringify(dead));
else console.log("no dead scroll between sampled frames");
if (consoleErrors.length) console.log("CONSOLE ERRORS:", consoleErrors.slice(0, 6));

await browser.close();
