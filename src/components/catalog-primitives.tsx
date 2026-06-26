"use client";

/**
 * Catalog primitives — the pre-built components the agent assembles.
 *
 * Every visual decision here reads from the design tokens in globals.css
 * (--dt-*). The Style tab (Pass 3) edits those tokens; these components
 * re-render automatically. Keep them token-driven, not hard-coded.
 */

import { useState, type ReactNode } from "react";

export function DTHeading({ text, level = 2 }: { text: string; level?: number }) {
  const Tag = (level === 1 ? "h1" : level === 3 ? "h3" : "h2") as "h1" | "h2" | "h3";
  const size =
    level === 1 ? "text-2xl" : level === 3 ? "text-base" : "text-xl";
  return <Tag className={`${size} font-serif font-medium tracking-tight`}>{text}</Tag>;
}

export function DTText({
  text,
  tone = "default",
}: {
  text: string;
  tone?: "default" | "muted";
}) {
  return (
    <p
      className="text-sm leading-relaxed"
      style={tone === "muted" ? { color: "var(--muted)" } : undefined}
    >
      {text}
    </p>
  );
}

export function DTCard({
  title,
  body,
  accent = "none",
  children,
}: {
  title?: string;
  body?: string;
  accent?: "none" | "brand";
  children?: ReactNode;
}) {
  return (
    <div
      className="border bg-[var(--surface)] p-[var(--dt-gap)]"
      style={{
        borderRadius: "var(--dt-radius)",
        borderColor: accent === "brand" ? "var(--dt-brand)" : "var(--dt-border)",
        borderLeftWidth: accent === "brand" ? 4 : 1,
      }}
    >
      {title ? <div className="font-serif text-base font-medium">{title}</div> : null}
      {body ? <div className="mt-1 text-sm text-[var(--muted)]">{body}</div> : null}
      {children}
    </div>
  );
}

const TONES: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: "var(--dt-tone-neutral-bg)", fg: "var(--dt-tone-neutral-fg)" },
  success: { bg: "var(--dt-tone-success-bg)", fg: "var(--dt-tone-success-fg)" },
  warning: { bg: "var(--dt-tone-warning-bg)", fg: "var(--dt-tone-warning-fg)" },
  danger: { bg: "var(--dt-tone-danger-bg)", fg: "var(--dt-tone-danger-fg)" },
};

export function DTBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span
      className="inline-block px-2 py-0.5 text-xs font-medium"
      style={{ background: t.bg, color: t.fg, borderRadius: "var(--dt-radius)" }}
    >
      {label}
    </span>
  );
}

export function DTList({
  title,
  items,
  ordered = false,
}: {
  title?: string;
  items: string[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <div>
      {title ? <div className="mb-1 font-serif text-base font-medium">{title}</div> : null}
      <ListTag
        className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5 text-sm text-[var(--ink)]`}
      >
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ListTag>
    </div>
  );
}

export function DTButton({
  label,
  intent = "primary",
}: {
  label: string;
  intent?: "primary" | "secondary";
}) {
  const primary = intent === "primary";
  return (
    <button
      type="button"
      className="px-3 py-1.5 text-sm font-medium"
      style={{
        borderRadius: "var(--dt-radius)",
        background: primary ? "var(--dt-brand)" : "transparent",
        color: primary ? "var(--dt-brand-contrast)" : "var(--dt-brand)",
        border: primary ? "1px solid transparent" : "1px solid var(--dt-brand)",
      }}
      title="Display-only in this version"
    >
      {label}
    </button>
  );
}

/**
 * Image. Display-only and honest: it renders a real <img> only when a usable
 * src is supplied (the agent is told never to invent one); otherwise, or if the
 * URL fails to load, it shows a captioned placeholder. The onError fallback is
 * why this module is a client component, and it makes a later "permissive src"
 * mode safe to test without broken-image glyphs.
 */
export function DTImage({ alt, src }: { alt: string; src?: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src && src.trim()) && !broken;
  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={() => setBroken(true)}
        className="block w-full object-cover"
        style={{ borderRadius: "var(--dt-radius)", maxHeight: 240 }}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className="flex flex-col items-center justify-center gap-2 border text-center"
      style={{
        borderRadius: "var(--dt-radius)",
        borderColor: "var(--dt-border)",
        background: "var(--surface)",
        minHeight: 120,
        padding: "var(--dt-gap)",
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--faint)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span className="text-xs text-[var(--muted)]">{alt}</span>
    </div>
  );
}

// --- Composed "whole" components (Pass 2) --------------------------------
// Multi-part display blocks the agent selects as one unit. The image-bearing
// ones reuse DTImage so the honest placeholder is shared, not re-implemented.

export function DTCardWithImage({
  title,
  caption,
  alt,
  src,
}: {
  title: string;
  caption?: string;
  alt: string;
  src?: string;
}) {
  return (
    <div
      className="overflow-hidden border bg-[var(--surface)]"
      style={{ borderRadius: "var(--dt-radius)", borderColor: "var(--dt-border)" }}
    >
      <DTImage alt={alt} src={src} />
      <div style={{ padding: "var(--dt-gap)" }}>
        <div className="font-serif text-base font-medium">{title}</div>
        {caption ? <div className="mt-1 text-sm text-[var(--muted)]">{caption}</div> : null}
      </div>
    </div>
  );
}

export function DTProductCard({
  title,
  price,
  meta,
  alt,
  src,
}: {
  title: string;
  price: string;
  meta?: string;
  alt?: string;
  src?: string;
}) {
  return (
    <div
      className="overflow-hidden border bg-[var(--surface)]"
      style={{ borderRadius: "var(--dt-radius)", borderColor: "var(--dt-border)" }}
    >
      <DTImage alt={alt ?? title} src={src} />
      <div
        className="flex items-start justify-between gap-3"
        style={{ padding: "var(--dt-gap)" }}
      >
        <div>
          <div className="font-serif text-base font-medium">{title}</div>
          {meta ? <div className="mt-1 text-xs text-[var(--muted)]">{meta}</div> : null}
        </div>
        <div
          className="text-base font-medium tabular-nums"
          style={{ textAlign: "right", whiteSpace: "nowrap" }}
        >
          {price}
        </div>
      </div>
    </div>
  );
}

const TREND_GLYPH: Record<string, string> = { up: "↑", down: "↓", flat: "→" };
const TREND_COLOR: Record<string, string> = {
  up: "var(--dt-tone-success-fg)",
  down: "var(--dt-tone-danger-fg)",
  flat: "var(--muted)",
};

export function DTStatCard({
  label,
  value,
  unit,
  trend,
}: {
  label: string;
  value: string;
  unit?: string;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <div
      className="border bg-[var(--surface)]"
      style={{
        borderRadius: "var(--dt-radius)",
        borderColor: "var(--dt-border)",
        padding: "var(--dt-gap)",
      }}
    >
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 flex items-baseline justify-end gap-1 tabular-nums">
        <span className="font-serif text-2xl font-medium">{value}</span>
        {unit ? <span className="text-sm text-[var(--muted)]">{unit}</span> : null}
        {trend ? (
          <span className="text-sm" style={{ color: TREND_COLOR[trend] }}>
            {TREND_GLYPH[trend]}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function DTIconCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 border bg-[var(--surface)]"
      style={{
        borderRadius: "var(--dt-radius)",
        borderColor: "var(--dt-border)",
        padding: "var(--dt-gap)",
      }}
    >
      <DTIcon name={icon} label={label} />
      <div>
        <div className="text-sm font-medium">{label}</div>
        {value ? <div className="text-sm text-[var(--muted)]">{value}</div> : null}
      </div>
    </div>
  );
}

// A small, fixed glyph set. Curated on purpose: the agent picks a name from
// this list, an unknown name degrades to a neutral dot. Stroke-driven so they
// inherit the brand token; 'star' and 'dot' fill for weight.
const ICON_GLYPHS: Record<string, ReactNode> = {
  check: <path d="M20 6L9 17l-5-5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  star: (
    <path
      d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.9 6.6 20l1-6.1L3.2 9.5l6.1-.9z"
      fill="var(--dt-brand)"
      stroke="none"
    />
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="4.5" fill="var(--dt-brand)" stroke="none" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function DTIcon({ name, label }: { name: string; label?: string }) {
  const glyph = ICON_GLYPHS[name] ?? ICON_GLYPHS.dot;
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--dt-brand)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {glyph}
    </svg>
  );
}

export function DTDivider() {
  return (
    <hr
      className="border-0"
      style={{ height: 1, background: "var(--dt-border)", margin: "var(--dt-gap) 0" }}
    />
  );
}

export function DTStack({
  direction = "vertical",
  children,
}: {
  direction?: "vertical" | "horizontal";
  children?: ReactNode;
}) {
  return (
    <div
      className={direction === "horizontal" ? "flex flex-row flex-wrap items-start" : "flex flex-col"}
      style={{ gap: "var(--dt-gap)" }}
    >
      {children}
    </div>
  );
}

// Pie slice colors, token-driven so the chart re-themes with the Theme tab.
const PIE_PALETTE = [
  "var(--dt-brand)",
  "var(--dt-tone-success-fg)",
  "var(--dt-tone-warning-fg)",
  "var(--dt-tone-danger-fg)",
  "var(--dt-tone-neutral-fg)",
];

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** Pie-only summary chart. Hand-rolled SVG, no charting dependency. */
export function DTPieChart({
  title,
  labels,
  values,
}: {
  title?: string;
  labels: string[];
  values: number[];
}) {
  const data = (labels ?? [])
    .map((label, i) => ({ label, value: Number(values?.[i]) || 0 }))
    .filter((d) => d.value > 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  const slices: { d: string; fill: string }[] = [];
  let angle = -Math.PI / 2;
  for (let i = 0; i < data.length; i++) {
    const sweep = (data[i].value / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const [x1, y1] = polar(cx, cy, r, start);
    const [x2, y2] = polar(cx, cy, r, end);
    const large = sweep > Math.PI ? 1 : 0;
    slices.push({
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      fill: PIE_PALETTE[i % PIE_PALETTE.length],
    });
  }

  return (
    <div>
      {title ? <div className="mb-1 font-serif text-base font-medium">{title}</div> : null}
      {total === 0 ? (
        <div className="text-sm text-[var(--faint)]">No values to chart.</div>
      ) : (
        <div className="flex items-center gap-4">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
            {data.length === 1 ? (
              <circle cx={cx} cy={cy} r={r} fill={PIE_PALETTE[0]} />
            ) : (
              slices.map((s, i) => <path key={i} d={s.d} fill={s.fill} />)
            )}
          </svg>
          <ul className="space-y-1 text-xs text-[var(--muted)]">
            {data.map((d, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }}
                />
                {d.label} ({Math.round((d.value / total) * 100)}%)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Structured-data components (Slice A). Each tolerates ragged or mismatched
// model output: missing cells render empty, mismatched array lengths are
// clamped, and an empty payload shows a quiet placeholder instead of throwing.
// All visuals read --dt-* tokens, so they re-skin with the Style sets.
// ---------------------------------------------------------------------------

/** Clamp a model-supplied score to the 0-100 plotting range; default to the
    midpoint when the value is missing or not a number. */
function clamp01to100(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 50;
}

export function DTTable({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: string[][];
  caption?: string;
}) {
  const cols = columns ?? [];
  const body = (rows ?? []).filter((r) => Array.isArray(r));
  if (cols.length === 0) {
    return <div className="text-sm text-[var(--faint)]">No columns to show.</div>;
  }
  return (
    <div className="overflow-x-auto">
      {caption ? (
        <div className="mb-1 font-serif text-base font-medium">{caption}</div>
      ) : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                className="border-b px-2 py-1.5 text-left font-serif font-medium text-[var(--ink)]"
                style={{ borderColor: "var(--dt-border)" }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {cols.map((_, c) => (
                <td
                  key={c}
                  className="border-b px-2 py-1.5 align-top text-[var(--muted)]"
                  style={{ borderColor: "var(--dt-border)" }}
                >
                  {row[c] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DTTimeline({
  title,
  dates,
  events,
}: {
  title?: string;
  dates: string[];
  events: string[];
}) {
  const items = (events ?? []).map((event, i) => ({
    date: dates?.[i] ?? "",
    event,
  }));
  if (items.length === 0) {
    return <div className="text-sm text-[var(--faint)]">No events to show.</div>;
  }
  return (
    <div>
      {title ? (
        <div className="mb-2 font-serif text-base font-medium">{title}</div>
      ) : null}
      <ol className="flex flex-col gap-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3">
            <div className="w-24 shrink-0 text-xs font-medium text-[var(--muted)]">
              {it.date}
            </div>
            <div className="flex flex-col items-center pt-1">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: "var(--dt-brand)" }}
                aria-hidden
              />
              {i < items.length - 1 ? (
                <span
                  className="mt-1 w-px flex-1"
                  style={{ background: "var(--dt-border)" }}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="flex-1 pb-1 text-sm text-[var(--ink)]">{it.event}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DTKanban({
  columnTitles,
  columnCards,
}: {
  columnTitles: string[];
  columnCards: string[][];
}) {
  const titles = columnTitles ?? [];
  if (titles.length === 0) {
    return <div className="text-sm text-[var(--faint)]">No columns to show.</div>;
  }
  return (
    <div className="flex gap-3 overflow-x-auto">
      {titles.map((title, i) => {
        const cards = Array.isArray(columnCards?.[i]) ? columnCards[i] : [];
        return (
          <div key={i} className="min-w-[150px] flex-1">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-serif text-sm font-medium text-[var(--ink)]">
                {title}
              </span>
              <span className="text-xs text-[var(--faint)]">{cards.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {cards.length === 0 ? (
                <div className="text-xs text-[var(--faint)]">—</div>
              ) : (
                cards.map((card, c) => (
                  <div
                    key={c}
                    className="border bg-[var(--surface)] px-2.5 py-2 text-sm text-[var(--ink)]"
                    style={{
                      borderRadius: "var(--dt-radius)",
                      borderColor: "var(--dt-border)",
                    }}
                  >
                    {card}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DTMatrix({
  title,
  xAxis,
  yAxis,
  items,
  x,
  y,
}: {
  title?: string;
  xAxis: string;
  yAxis: string;
  items: string[];
  x: number[];
  y: number[];
}) {
  const pts = (items ?? []).map((label, i) => ({
    label,
    x: clamp01to100(x?.[i]),
    y: clamp01to100(y?.[i]),
  }));
  const SIZE = 240;
  return (
    <div>
      {title ? (
        <div className="mb-2 font-serif text-base font-medium">{title}</div>
      ) : null}
      <div className="flex gap-2">
        <div className="flex items-center">
          <span
            className="text-xs text-[var(--muted)]"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {yAxis}
          </span>
        </div>
        <div>
          <div
            className="relative border"
            style={{
              width: SIZE,
              height: SIZE,
              borderColor: "var(--dt-border)",
              borderRadius: "var(--dt-radius)",
            }}
          >
            <span
              className="absolute left-1/2 top-0 h-full w-px"
              style={{ background: "var(--dt-border)" }}
              aria-hidden
            />
            <span
              className="absolute left-0 top-1/2 h-px w-full"
              style={{ background: "var(--dt-border)" }}
              aria-hidden
            />
            {pts.map((p, i) => (
              <div
                key={i}
                className="absolute flex -translate-y-1/2 items-center gap-1"
                style={{ left: `${p.x}%`, top: `${100 - p.y}%` }}
              >
                <span
                  className="block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "var(--dt-brand)" }}
                />
                <span className="whitespace-nowrap text-[10px] leading-none text-[var(--ink)]">
                  {p.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1 text-center text-xs text-[var(--muted)]">{xAxis}</div>
        </div>
      </div>
    </div>
  );
}
