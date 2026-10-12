"use client";

import { useId, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { formatPaise } from "@nextera/contracts";
import { compactRupees, linearTicks, monthTickIndexes } from "@/lib/chart";
import { formatIsoDate, formatIsoMonth } from "@/lib/dates";
import { lastCreditedMonth } from "@/lib/investmentGrowth";
import type { GrowthChartPoint } from "@/lib/investmentGrowth";

const WIDTH = 560;
const HEIGHT = 260;
const PAD = { top: 16, right: 12, bottom: 34, left: 60 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

export function InvestmentGrowthChart({ points, indicative }: { points: GrowthChartPoint[]; indicative: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();
  const readoutId = useId();
  const last = points[points.length - 1];
  if (!last || points.length < 2) return null;

  const lastMonth = last.month;
  const creditedUntil = lastCreditedMonth(points);
  const ticks = linearTicks(last.returnsPaise);
  const top = ticks[ticks.length - 1] ?? 1;
  const x = (month: number) => PAD.left + (month / lastMonth) * PLOT_W;
  const y = (paise: number) => PAD.top + PLOT_H - (paise / top) * PLOT_H;
  const path = (subset: GrowthChartPoint[]) =>
    subset.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.month)},${y(point.returnsPaise)}`).join(" ");

  const credited = points.filter((point) => point.month <= creditedUntil);
  const projected = points.filter((point) => point.month >= creditedUntil);
  const creditedPath = path(credited);
  const area = credited.length > 1 ? `${creditedPath} L${x(creditedUntil)},${y(0)} L${x(0)},${y(0)} Z` : null;
  const focus = active === null ? null : (points[active] ?? null);
  const creditedTotal = points[creditedUntil]?.returnsPaise ?? 0;

  function pick(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const plotX = ((event.clientX - rect.left) / rect.width) * WIDTH - PAD.left;
    setActive(Math.min(Math.max(Math.round((plotX / PLOT_W) * lastMonth), 0), lastMonth));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const current = active ?? creditedUntil;
    const moves: Record<string, number> = {
      ArrowRight: Math.min(current + 1, lastMonth),
      ArrowLeft: Math.max(current - 1, 0),
      Home: 0,
      End: lastMonth,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key] ?? current);
    }
    if (event.key === "Escape") setActive(null);
  }

  const tooltipLeft = focus ? (x(focus.month) / WIDTH) * 100 : 0;
  const summary = indicative
    ? `Projected returns: ${formatPaise(last.returnsPaise)} over ${lastMonth} months once your payment is confirmed.`
    : `Returns credited so far: ${formatPaise(creditedTotal)} after ${creditedUntil} of ${lastMonth} months. Projected total ${formatPaise(last.returnsPaise)} by ${formatIsoDate(last.date)}.`;

  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="label">Returns before TDS</span>
        <span className="flex items-center gap-4 text-xs text-dust">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-5 bg-gold" /> Credited
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0 w-5 border-t-2 border-dashed border-parchment/50" /> Projected
          </span>
        </span>
      </figcaption>
      <div
        className="relative mt-3 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-lagoon/60"
        tabIndex={0}
        role="group"
        aria-label={`Growth chart. ${summary} Use the arrow keys to read each month.`}
        aria-describedby={readoutId}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full touch-pan-y select-none"
          aria-hidden="true"
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d4a24a" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#d4a24a" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#f3ebd8" strokeOpacity={tick === 0 ? 0.22 : 0.07} />
              <text x={PAD.left - 10} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-dust font-mono text-[12px]">
                {compactRupees(tick)}
              </text>
            </g>
          ))}
          {monthTickIndexes(lastMonth).map((month) => (
            <text
              key={month}
              x={x(month)}
              y={HEIGHT - 10}
              textAnchor={month === 0 ? "start" : month === lastMonth ? "end" : "middle"}
              className="fill-dust font-mono text-[12px]"
            >
              {formatIsoMonth(points[month]?.date ?? last.date)}
            </text>
          ))}
          {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
          {projected.length > 1 ? (
            <path d={path(projected)} fill="none" stroke="#f3ebd8" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="5 5" />
          ) : null}
          {credited.length > 1 ? (
            <path d={creditedPath} fill="none" stroke="#d4a24a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          ) : null}
          <circle cx={x(creditedUntil)} cy={y(creditedTotal)} r={4.5} fill="#d4a24a" stroke="#0c1c24" strokeWidth={2} />
          {focus ? (
            <g>
              <line x1={x(focus.month)} x2={x(focus.month)} y1={PAD.top} y2={y(0)} stroke="#f3ebd8" strokeOpacity={0.35} strokeDasharray="3 3" />
              <circle cx={x(focus.month)} cy={y(focus.returnsPaise)} r={5} fill={focus.credited ? "#d4a24a" : "#f3ebd8"} stroke="#0c1c24" strokeWidth={2} />
            </g>
          ) : null}
        </svg>
        {focus ? (
          <div
            className="pointer-events-none absolute top-2 z-10 w-max max-w-[60%] rounded-[2px] border border-parchment/15 bg-inkwell/95 px-3 py-2 text-xs shadow-lg"
            style={{ left: `${tooltipLeft}%`, transform: `translateX(${tooltipLeft > 60 ? "calc(-100% - 12px)" : "12px"})` }}
          >
            <p className="font-medium text-parchment tnum">{formatPaise(focus.returnsPaise)}</p>
            <p className="mt-0.5 text-dust">
              {focus.month === 0 ? "Start" : `Month ${focus.month} · ${focus.credited ? "Credited" : "Projected"}`}
            </p>
            <p className="mt-1 text-dust tnum">{formatIsoDate(focus.date)}</p>
          </div>
        ) : null}
        <p id={readoutId} className="sr-only" aria-live="polite">
          {focus
            ? `${focus.month === 0 ? "Start" : `Month ${focus.month}`}, ${formatIsoDate(focus.date)}: returns to date ${formatPaise(focus.returnsPaise)}${focus.month === 0 ? "" : focus.credited ? ", credited" : ", projected"}.`
            : ""}
        </p>
      </div>
    </figure>
  );
}
