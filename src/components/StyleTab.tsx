"use client";

import { useState } from "react";
import { DTBadge, DTButton, DTCard } from "@/components/catalog-primitives";
import { TeachingCard, HonestyChip } from "@/components/TeachingCard";

export type StyleTokens = {
  brand: string;
  brandContrast: string;
  border: string;
  radius: string;
  gap: string;
};

/** The "Editorial" baseline — matches the :root --dt-* defaults in globals.css.
   This is the beautiful starting point attendees restyle FROM; their edits
   override it live, so their choices lead in the rendered output. */
export const DEFAULT_TOKENS: StyleTokens = {
  brand: "#1f5d59",
  brandContrast: "#ffffff",
  border: "#e3dccf",
  radius: "10px",
  gap: "12px",
};

/**
 * Theme sets — named bundles of the --dt-* tokens. A designer picks one and
 * every rendered block re-skins (Studio Slice 2). The same sets power both the
 * Theme authoring tab and the surfaced theme-set lever in the Preview rail.
 * Editorial equals the globals.css :root default (the reset baseline). The
 * sets vary the STYLISTIC axes (brand, border, shape, density) only; semantic
 * tone colors stay stable on purpose.
 */
export const STYLE_SETS: { name: string; tokens: StyleTokens }[] = [
  { name: "Editorial", tokens: DEFAULT_TOKENS },
  {
    name: "Modern",
    tokens: { brand: "#2f6f8f", brandContrast: "#ffffff", border: "#dfe4ea", radius: "16px", gap: "16px" },
  },
  {
    name: "Square",
    tokens: { brand: "#1f5d59", brandContrast: "#ffffff", border: "#5f5a4f", radius: "0px", gap: "8px" },
  },
];

/**
 * Which named set the current tokens match, or null when the designer has
 * fine-tuned away from any set ("custom"). Shared by the Theme tab and the
 * Preview-rail lever so the active-set indication stays honest.
 */
export function activeStyleSetName(tokens: StyleTokens): string | null {
  const match = STYLE_SETS.find(
    (s) =>
      s.tokens.brand === tokens.brand &&
      s.tokens.brandContrast === tokens.brandContrast &&
      s.tokens.border === tokens.border &&
      s.tokens.radius === tokens.radius &&
      s.tokens.gap === tokens.gap
  );
  return match ? match.name : null;
}

function px(value: string) {
  return parseInt(value, 10) || 0;
}

/**
 * Theme tab — the design tokens as a visual form, not raw CSS. In a popup
 * (`bare`) it shows the mockup's direct token controls (brand, radius, gap, and
 * the read-only tone swatches); the canvas behind applies every change live, so
 * "Applies instantly, no run needed." In the first-run stepper (non-bare) it
 * keeps the fuller form (preset sets, the "what the agent sees" beat, advanced
 * fine-tuning, and a live sample).
 */
export function StyleTab({
  tokens,
  onChange,
  bare,
}: {
  tokens: StyleTokens;
  onChange: (next: StyleTokens) => void;
  /** In-popup mode: show the mockup's direct token controls; drop the chip /
      intro / teaching (the popup chrome states them). */
  bare?: boolean;
}) {
  const set = (patch: Partial<StyleTokens>) => onChange({ ...tokens, ...patch });
  const activeSet = activeStyleSetName(tokens);
  const [agentSeesOpen, setAgentSeesOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {!bare && (
        <>
          <div className="flex justify-end">
            <HonestyChip variant="invisible">AGENT-INVISIBLE</HonestyChip>
          </div>
          <p className="text-sm text-neutral-500">
            Lever 2 of 3: visual theme. Your design tokens as a form. Pick a
            preset or tune each token; the live sample and every catalog
            component the agent renders re-skin together, without re-running the
            agent. Open-ended output lives in its own sandbox, so it keeps its
            own styling.
          </p>
        </>
      )}

      {bare ? (
        <div className="tok">
          <div className="tok-row">
            <span className="k">Brand</span>
            <span className="v">
              <input
                type="color"
                value={tokens.brand}
                onChange={(e) => set({ brand: e.target.value })}
                aria-label="Brand color"
              />
              {tokens.brand}
            </span>
          </div>
          <div className="tok-row">
            <span className="k">Corner radius</span>
            <span className="v">
              <input
                type="range"
                min={0}
                max={20}
                value={px(tokens.radius)}
                onChange={(e) => set({ radius: `${e.target.value}px` })}
                style={{ width: 120 }}
                aria-label="Corner radius"
              />
              <span style={{ minWidth: 36, textAlign: "right" }}>{px(tokens.radius)}px</span>
            </span>
          </div>
          <div className="tok-row">
            <span className="k">Gap</span>
            <span className="v">
              <input
                type="range"
                min={4}
                max={24}
                value={px(tokens.gap)}
                onChange={(e) => set({ gap: `${e.target.value}px` })}
                style={{ width: 120 }}
                aria-label="Gap"
              />
              <span style={{ minWidth: 36, textAlign: "right" }}>{px(tokens.gap)}px</span>
            </span>
          </div>
          <div>
            <div className="tok-row" style={{ marginBottom: 7 }}>
              <span className="k">Tones</span>
              <span className="v">neutral · success · warning · danger</span>
            </div>
            <div className="tones">
              <span className="tone" style={{ background: "#e8ece4" }} />
              <span className="tone" style={{ background: "#e9f0ea" }} />
              <span className="tone" style={{ background: "#f6edd9" }} />
              <span className="tone" style={{ background: "#f4e9e7" }} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-neutral-700">Theme sets</span>
              <span className="text-xs text-neutral-400">{activeSet ?? "Custom"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_SETS.map((p) => {
                const on = activeSet === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => onChange(p.tokens)}
                    aria-pressed={on}
                    className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                      on
                        ? "border-[var(--ink)] font-medium text-[var(--ink)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-neutral-400"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* The signature Theme beat: what the agent sees is nothing. */}
          <div>
            <button
              type="button"
              aria-expanded={agentSeesOpen}
              onClick={() => setAgentSeesOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              <span aria-hidden>{agentSeesOpen ? "▾" : "▸"}</span>
              <span aria-hidden>◉</span>
              what the agent sees
            </button>
            {agentSeesOpen ? (
              <p className="mt-1 rounded-lg border border-[var(--line)] bg-[var(--vellum)] px-3 py-2 text-xs text-[var(--muted)]">
                Nothing. Your tokens are applied by code. The agent picks
                components and asks for roles, never colors.
              </p>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              <span aria-hidden>{advancedOpen ? "▾" : "▸"}</span>
              Advanced · fine-tune tokens
            </button>
            {advancedOpen ? (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Color label="Brand" value={tokens.brand} onChange={(v) => set({ brand: v })} />
                <Color label="Brand contrast" value={tokens.brandContrast} onChange={(v) => set({ brandContrast: v })} />
                <Color label="Border" value={tokens.border} onChange={(v) => set({ border: v })} />
                <Range label="Radius" value={px(tokens.radius)} min={0} max={24} onChange={(n) => set({ radius: `${n}px` })} />
                <Range label="Gap" value={px(tokens.gap)} min={0} max={32} onChange={(n) => set({ gap: `${n}px` })} />
              </div>
            ) : null}
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
        </>
      )}

      {!bare && (
        <TeachingCard
          name="Theme"
          mechanism="The agent asks for a role, “the brand accent,” never a color. What each role looks like is yours: set here as tokens and joined to the role in code at the render boundary. The agent can't see these values or override them, so your visual rules hold on every output. Change a token and everything on screen re-skins with no re-run. Styling was never the agent's decision to make."
          purpose="Theme is a constraint, not a coat of paint: the agent owns meaning, you own appearance. These controls are the runtime face of a design system whose real work, the tokens and their bindings, lives in code, not this panel. CopilotKit names this same layer `theme`."
        />
      )}
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
    <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
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
    <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
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
