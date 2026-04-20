"use client";

import { useMemo } from "react";

type Props = {
  timeIso: string[];
  pressureHpa: (number | null)[];
  timeZone: string;
  intlLocale: string;
  /** Accessible description, e.g. pressure range */
  "aria-label": string;
};

function formatHourLabel(iso: string, timeZone: string, intlLocale: string) {
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function FishingPressureChart({
  timeIso,
  pressureHpa,
  timeZone,
  intlLocale,
  "aria-label": ariaLabel,
}: Props) {
  const model = useMemo(() => {
    const series: { time: string; p: number }[] = [];
    for (let i = 0; i < timeIso.length; i++) {
      const p = pressureHpa[i];
      if (p != null && Number.isFinite(p)) {
        series.push({ time: timeIso[i]!, p });
      }
    }
    if (series.length === 0) return null;

    const ps = series.map((s) => s.p);
    const minP = Math.min(...ps);
    const maxP = Math.max(...ps);
    const spread = maxP - minP;
    const pad = Math.max(0.9, spread * 0.15, spread < 0.01 ? 2 : 0);
    const yMin = minP - pad;
    const yMax = maxP + pad;
    const n = series.length;

    return { series, minP, maxP, yMin, yMax, n };
  }, [timeIso, pressureHpa]);

  if (!model) return null;

  const { series, minP, maxP, yMin, yMax, n } = model;

  const W = 420;
  const H = 200;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xAt = (i: number) =>
    padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (p: number) =>
    padT + innerH - ((p - yMin) / (yMax - yMin)) * innerH;

  const baseY = padT + innerH;
  const lineD = series.map((s, i) => `${xAt(i)},${yAt(s.p)}`).join(" ");
  const areaD = [
    `M ${xAt(0)},${baseY}`,
    ...series.map((s, i) => `L ${xAt(i)},${yAt(s.p)}`),
    `L ${xAt(n - 1)},${baseY}`,
    "Z",
  ].join(" ");

  const xLabelIdx =
    n <= 1 ? [0] : n <= 3 ? [...Array(n).keys()] : [0, Math.floor((n - 1) / 2), n - 1];

  const yTicks = 3;
  const yLabels: { y: number; val: number }[] = [];
  for (let t = 0; t < yTicks; t++) {
    const frac = t / (yTicks - 1);
    const val = yMax - frac * (yMax - yMin);
    yLabels.push({ y: padT + frac * innerH, val });
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-h-52 text-zinc-500 lg:max-h-64 xl:max-h-72 dark:text-zinc-400"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="pressureFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.04} />
        </linearGradient>
      </defs>

      {/* Grid */}
      {yLabels.map(({ y }, i) => (
        <line
          key={`h-${i}`}
          x1={padL}
          x2={padL + innerW}
          y1={y}
          y2={y}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
      ))}

      {/* Y-axis labels (hPa) */}
      {yLabels.map(({ y, val }, i) => (
        <text
          key={`yl-${i}`}
          x={padL - 6}
          y={y + 4}
          textAnchor="end"
          className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
        >
          {Math.round(val)}
        </text>
      ))}

      <text
        x={8}
        y={H / 2}
        transform={`rotate(-90 8 ${H / 2})`}
        textAnchor="middle"
        className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
      >
        hPa
      </text>

      {/* Area + line (two points minimum for a visible polyline) */}
      <path d={areaD} fill="url(#pressureFill)" />
      {n === 1 ? (
        <line
          x1={xAt(0) - 24}
          x2={xAt(0) + 24}
          y1={yAt(series[0]!.p)}
          y2={yAt(series[0]!.p)}
          stroke="rgb(14 165 233)"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="dark:stroke-sky-400"
        />
      ) : (
        <polyline
          fill="none"
          stroke="rgb(14 165 233)"
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={lineD}
          className="dark:stroke-sky-400"
        />
      )}

      {/* Points for hover targets */}
      {series.map((s, i) => (
        <circle
          key={s.time}
          cx={xAt(i)}
          cy={yAt(s.p)}
          r={3.5}
          className="fill-sky-600 dark:fill-sky-400"
        >
          <title>{`${formatHourLabel(s.time, timeZone, intlLocale)} — ${s.p.toFixed(0)} hPa`}</title>
        </circle>
      ))}

      {/* X-axis labels */}
      {xLabelIdx.map((idx) => (
        <text
          key={series[idx]!.time}
          x={xAt(idx)}
          y={H - 10}
          textAnchor="middle"
          className="fill-zinc-600 text-[10px] dark:fill-zinc-300"
        >
          {formatHourLabel(series[idx]!.time, timeZone, intlLocale)}
        </text>
      ))}

      {/* Min/max annotation when nearly flat */}
      <text
        x={padL + innerW}
        y={padT - 2}
        textAnchor="end"
        className="fill-zinc-500 text-[9px] dark:fill-zinc-400"
      >
        {minP === maxP
          ? `${minP.toFixed(0)} hPa`
          : `${minP.toFixed(0)}–${maxP.toFixed(0)} hPa`}
      </text>
    </svg>
  );
}
