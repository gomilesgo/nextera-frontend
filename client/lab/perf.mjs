// Measures main-thread frame pacing while the page is scrolled under script.
// node lab/perf.mjs [url] [--width 1440] [--height 900]
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:3000/";

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--enable-gpu", "--use-gl=angle", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cssIndex = process.argv.indexOf("--css");
const extraCss = cssIndex > -1 ? process.argv[cssIndex + 1] : "";
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
if (extraCss) await page.addStyleTag({ content: extraCss });
await page.waitForTimeout(1500);

// Throttle the CPU so a fast desktop does not hide what a phone would feel.
const session = await page.context().newCDPSession(page);
await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const range = { from: Number(process.argv[3] ?? 0), to: Number(process.argv[4] ?? 0) };
const result = await page.evaluate(async (range) => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const from = range.from || 0;
  const to = range.to || max;
  const total = to - from;
  const frames = [];
  const longTasks = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) longTasks.push(Math.round(entry.duration));
  });
  try {
    observer.observe({ entryTypes: ["longtask"] });
  } catch {
    /* not supported */
  }

  let last = performance.now();
  let y = from;
  const step = total / 420;

  await new Promise((resolve) => {
    function tick(now) {
      frames.push(now - last);
      last = now;
      y += step;
      window.scrollTo(0, y);
      if (y >= to) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  observer.disconnect();
  const sorted = frames.slice(1).sort((a, b) => a - b);
  const at = (q) => sorted[Math.floor(sorted.length * q)] ?? 0;
  return {
    frames: sorted.length,
    median: at(0.5),
    p75: at(0.75),
    p95: at(0.95),
    p99: at(0.99),
    worst: sorted.at(-1),
    over32: sorted.filter((f) => f > 32).length,
    over50: sorted.filter((f) => f > 50).length,
    longTasks: longTasks.sort((a, b) => b - a).slice(0, 8),
  };
}, range);

const f = (n) => `${n.toFixed(1)}ms`;
console.log(`frames ${result.frames}  (CPU throttled 4x)`);
console.log(`median ${f(result.median)}   p75 ${f(result.p75)}   p95 ${f(result.p95)}   p99 ${f(result.p99)}   worst ${f(result.worst)}`);
console.log(`frames over 32ms: ${result.over32}   over 50ms: ${result.over50}`);
console.log(`longest long-tasks: ${result.longTasks.join(", ") || "none"}`);

await browser.close();
