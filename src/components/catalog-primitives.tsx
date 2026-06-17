/**
 * Catalog primitives — the pre-built components the agent assembles.
 *
 * Every visual decision here reads from the design tokens in globals.css
 * (--dt-*). The Style tab (Pass 3) edits those tokens; these components
 * re-render automatically. Keep them token-driven, not hard-coded.
 */

import type { ReactNode } from "react";

export function DTHeading({ text, level = 2 }: { text: string; level?: number }) {
  const Tag = (level === 1 ? "h1" : level === 3 ? "h3" : "h2") as "h1" | "h2" | "h3";
  const size =
    level === 1 ? "text-2xl" : level === 3 ? "text-base" : "text-xl";
  return <Tag className={`${size} font-serif font-medium tracking-tight`}>{text}</Tag>;
}

export function DTCard({
  title,
  body,
  accent = "none",
  children,
}: {
  title: string;
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
      <div className="font-serif text-base font-medium">{title}</div>
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

// Pie slice colors, token-driven so the chart re-themes with the Style tab.
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
