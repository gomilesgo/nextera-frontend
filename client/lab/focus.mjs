// Walks the tab order and reports each stop plus whether its focus ring is visible.
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(process.argv[2] ?? "http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

for (let step = 0; step < 24; step += 1) {
  await page.keyboard.press("Tab");
  const stop = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 44),
      outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
      visible: box.width > 0 && box.height > 0,
      inViewport: box.top >= -1 && box.bottom <= window.innerHeight + 1,
      size: `${Math.round(box.width)}x${Math.round(box.height)}`,
    };
  });
  if (!stop) {
    console.log(`${String(step + 1).padStart(2)}  <end of document>`);
    break;
  }
  console.log(
    `${String(step + 1).padStart(2)}  ${stop.tag.padEnd(6)} ${stop.size.padEnd(9)} ${stop.text.padEnd(46)} ${stop.outline}`,
  );
}

await browser.close();
