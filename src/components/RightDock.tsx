"use client";

// Right-side authoring dock (v3 shell). Replaces the old left <nav> tab-router.
// A vertical column of four icon tiles — Data, Rules, Catalog, Theme — each
// carrying a save-state badge. It is CHROME, so it uses the fixed chrome tokens
// (--petrol accent, --line, --surface, --vellum), never the swappable --dt-*
// render tokens, matching the retired nav's intent (page.tsx:614).
// It renders NO run control: running is the canvas request input's submit arrow.
// Pass 4: chunkier tiles + readable (>=11px) labels + inactive contrast raised
// off --faint to --muted, so the dock reads present, not faint.

export type AuthoringTab = "data" | "rules" | "catalog" | "style";
export type LayerStatus = "applied" | "pending" | "live";

type Tile = { key: AuthoringTab; name: string; glyph: string };

// Glyphs + designer-facing names mirror the retired PRIMARY_NAV so the icons
// stay familiar (this project ships no icon font; the nav used unicode glyphs).
const TILES: Tile[] = [
  { key: "data", name: "Data", glyph: "▦" },
  { key: "rules", name: "Rules", glyph: "☰" },
  { key: "catalog", name: "Catalog", glyph: "▤" },
  { key: "style", name: "Theme", glyph: "◑" },
];

// Badge per save-state. applied = petrol check, live = faint tilde, pending =
// amber bang. Amber (#d97706, Tailwind amber-600) is the one intentional
// exception to chrome-tokens-only: there is no amber chrome token, and this
// matches the app's existing warning treatment (rate-limit / rejection notices)
// and the v3 mockup's pending colour.
const BADGE: Record<LayerStatus, { mark: string; label: string; tone: string }> = {
  applied: { mark: "✓", label: "applied", tone: "var(--petrol)" },
  pending: { mark: "!", label: "needs a run", tone: "#d97706" },
  live: { mark: "~", label: "live", tone: "var(--faint)" },
};

export function RightDock({
  tabs,
  status,
  active,
  onOpen,
}: {
  tabs: AuthoringTab[];
  status: Record<AuthoringTab, LayerStatus>;
  active: AuthoringTab | null;
  onOpen: (tab: AuthoringTab) => void;
}) {
  const tiles = TILES.filter((t) => tabs.includes(t.key));
  return (
    <nav
      aria-label="Authoring layers"
      className="sticky top-0 flex h-dvh shrink-0 flex-col items-center gap-2 self-start border-l border-[var(--line)] bg-[var(--vellum)] px-2.5 py-4"
    >
      {tiles.map((t) => {
        const on = active === t.key;
        const badge = BADGE[status[t.key]];
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onOpen(t.key)}
            aria-pressed={on}
            aria-label={`${t.name} — ${badge.label}`}
            title={`${t.name} · ${badge.label}`}
            className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-[12px] transition-colors ${
              on
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                : "text-[var(--muted)] hover:bg-[rgba(255,255,255,0.5)]"
            }`}
          >
            {on && (
              <span
                className="absolute inset-y-2 right-0 w-1 rounded-l bg-[var(--petrol)]"
                aria-hidden
              />
            )}
            <span
              className={`text-[20px] leading-none ${
                on ? "text-[var(--petrol)]" : "text-[var(--muted)]"
              }`}
              aria-hidden
            >
              {t.glyph}
            </span>
            <span
              className={`mt-1 text-[11px] leading-none ${
                on ? "text-[var(--ink)]" : "text-[var(--muted)]"
              }`}
              aria-hidden
            >
              {t.name}
            </span>
            <span
              className="absolute right-1.5 top-1.5 text-[10px] font-semibold leading-none"
              style={{ color: badge.tone }}
              aria-hidden
            >
              {badge.mark}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
