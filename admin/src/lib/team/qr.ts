import "server-only";
import { create } from "qrcode";

export type QrMatrix = { size: number; path: string };

export function qrMatrix(text: string): QrMatrix {
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  const { size, data } = modules;
  const segments: string[] = [];
  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < size && data[y * size + x + run]) run += 1;
      segments.push(`M${x} ${y}h${run}v1h-${run}z`);
      x += run;
    }
  }
  return { size, path: segments.join("") };
}
