"use client";

import { DTBadge, DTButton, DTCard } from "@/components/catalog-primitives";

export type StyleTokens = {
  brand: string;
  brandContrast: string;
  border: string;
  radius: string;
  gap: string;
};

/** Matches the :root defaults in globals.css (which stay intact as fallback). */
export const DEFAULT_TOKENS: StyleTokens = {
  brand: "#1d4ed8",
  brandContrast: "#ffffff",
  border: "#e5e5e5",
  radius: "8px",
  gap: "12px",
};

export const STYLE_PRESETS: { name: string; tokens: StyleTokens }[] = [
  { name: "Default", tokens: DEFAULT_TOKENS },
  {
    name: "Midnight",
    tokens: { brand: "#6366f1", brandContrast: "#ffffff", border: "#cbd5e1", radius: "14px", gap: "16px" },
  },
  {
    name: "Warm",
    tokens: { brand: "#ea580c", brandContrast: "#ffffff", border: "#e7e5e4", radius: "4px", gap: "10px" },
  },
];

function px(value: string) {
  return parseInt(value, 10) || 0;
}

/**
 * Style tab — one of the three creativity levers. The design tokens as a
 * visual form, not raw CSS. Presets set the whole group; advanced controls
 * tune individual tokens. Every catalog primitive reads these tokens, so the
 * sample below (and the agent's renders) re-theme live as you edit. The
 * globals.css defaults stay intact as the reset baseline.
 */
export function StyleTab({
  tokens,
  onChange,
}: {
  tokens: StyleTokens;
  onChange: (next: StyleTokens) => void;
}) {
  const set = (patch: Partial<StyleTokens>) => onChange({ ...tokens, ...patch });

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <p className="text-sm text-neutral-500">
        Lever 2 of 3: visual style. Your design tokens as a form. Pick a preset
        or tune each token; the sample updates live, and so does every component
        the agent renders.
      </p>

      <div>
        <div className="mb-1 text-xs font-medium text-neutral-700">Presets</div>
        <div className="flex flex-wrap gap-2">
          {STYLE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onChange(p.tokens)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-400"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Color label="Brand" value={tokens.brand} onChange={(v) => set({ brand: v })} />
        <Color label="Brand contrast" value={tokens.brandContrast} onChange={(v) => set({ brandContrast: v })} />
        <Color label="Border" value={tokens.border} onChange={(v) => set({ border: v })} />
        <Range label="Radius" value={px(tokens.radius)} min={0} max={24} onChange={(n) => set({ radius: `${n}px` })} />
        <Range label="Gap" value={px(tokens.gap)} min={0} max={32} onChange={(n) => set({ gap: `${n}px` })} />
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-neutral-700">Live sample</div>
        <div className="flex flex-col" style={{ gap: "var(--dt-gap)" }}>
          <DTCard title="Themed card" body="This card reads your tokens." accent="brand" />
          <div className="flex items-center" style={{ gap: "var(--dt-gap)" }}>
            <DTBadge label="Status" tone="success" />
            <DTButton label="Primary" intent="primary" />
            <DTButton label="Secondary" intent="secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
      <span className="text-neutral-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-xs text-neutral-400">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded"
        />
      </span>
    </label>
  );
}

function Range({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
      <span className="text-neutral-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="w-9 text-right text-xs text-neutral-400">{value}px</span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
    </label>
  );
}
