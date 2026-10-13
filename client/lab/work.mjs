// Deterministic main-thread rendering work for one scripted scroll of the page.
// Uses CDP cumulative counters, which do not depend on frame pacing.
// node lab/work.mjs [url]
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = process.argv[2] ?? "http://localhost:3001/";
const RUNS = 3;

const browser = await chromium.launch({ executablePath: CHROME });
const totals = [];

for (let run = 0; run < RUNS; run += 1) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);

  const session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");

  const read = async () => {
    const { metrics } = await session.send("Performance.getMetrics");
    return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
  };

  const before = await read();

  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const steps = 300;
    for (let i = 0; i <= steps; i += 1) {
      window.scrollTo(0, (total * i) / steps);
      await new Promise((r) => requestAnimationFrame(r));
    }
  });
  await page.waitForTimeout(300);

  const after = await read();
  const delta = (key) => (after[key] ?? 0) - (before[key] ?? 0);

  totals.push({
    layouts: delta("LayoutCount"),
    recalcs: delta("RecalcStyleCount"),
    layoutMs: delta("LayoutDuration") * 1000,
    styleMs: delta("RecalcStyleDuration") * 1000,
    scriptMs: delta("ScriptDuration") * 1000,
    taskMs: delta("TaskDuration") * 1000,
  });

  await page.close();
}

const avg = (key) => totals.reduce((sum, t) => sum + t[key], 0) / totals.length;
console.log(`over ${RUNS} runs of a 300-step full-page scroll:`);
console.log(`  layouts        ${avg("layouts").toFixed(0)}`);
console.log(`  style recalcs  ${avg("recalcs").toFixed(0)}`);
console.log(`  layout time    ${avg("layoutMs").toFixed(1)}ms`);
console.log(`  style time     ${avg("styleMs").toFixed(1)}ms`);
console.log(`  script time    ${avg("scriptMs").toFixed(1)}ms`);
console.log(`  total task     ${avg("taskMs").toFixed(1)}ms`);

await browser.close();
