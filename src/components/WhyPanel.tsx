"use client";

import type { WhyAccount } from "@/lib/catalog";
import { HonestyChip } from "@/components/TeachingCard";

/**
 * The why-strip — two PROVENANCE cards beneath the rendered output, so the demo
 * never blurs a guarantee with a claim:
 *   - "Computed by the app" (verified): the active pattern, the AI-freedom level,
 *     and the components allowed (allowedComponentNames) — app truth, not a model
 *     claim. Small models hallucinate their own catalog, so this is enforced.
 *   - "Reported by the model" (the agent's account): rules applied, intent,
 *     structure, drawn-from, notes — the model's self-report, which can be wrong.
 * On the Real A2UI path the agent emits operations and no written why-account, so
 * the model zone is replaced by an honest note rather than empty fields.
 *
 * Each zone is its own card on the chrome --surface (the "card" color, distinct
 * from the --paper panel ground), padded on the 8/4 grid (p-4, gap-2, mb-2).
 */
const cardClass =
  "rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] p-5";

export function WhyPanel({
  why,
  usedNames,
  rejections,
  commentary,
  freedom,
  pattern,
  realPath,
}: {
  why: WhyAccount | null;
  /** App truth: the components THIS run actually RENDERED — per pattern, the
   *  rendered blocks (Controlled) or the emitted A2UI ops minus anything the
   *  catalog refused (Real A2UI). Shown as the "Components used" set. */
  usedNames: string[];
  /** App truth (Real-A2UI only): components the agent NAMED but the catalog
   *  refused (off-catalog or disabled). Deterministic enforcement, not a model
   *  claim; empty on Controlled (the tool simply never exists). */
  rejections: string[];
  /** The agent's free-text prose (its non-fenced reply). Shown as the agent's
   *  account when there is no structured ```why — chiefly the Real A2UI path. */
  commentary: string;
  /** App-derived AI-freedom level for the active pattern (Low / Medium / High). */
  freedom: string;
  /** Active pattern from app state — authoritative, NOT the model's why.pattern. */
  pattern: string;
  /** True when the active render path is real A2UI (no written model account). */
  realPath: boolean;
}) {
  const label = "text-[11px] uppercase tracking-wide text-[var(--faint)]";

  // The receipt is mounted only once the canvas has a completed render (gated in
  // page.tsx), so there is no pre-run placeholder here — both provenance cards
  // always have app-truth to show.
  const patternName = pattern === "static" ? "Controlled" : pattern;

  // The model's account, in precedence: a structured ```why (Controlled /
  // simplified) wins; else the agent's free-text prose (Real A2UI writes prose
  // but no structured why); else, nothing was reported.
  const hasStructuredWhy = !!(
    why?.intent ||
    why?.structure ||
    why?.source ||
    why?.notes ||
    (why?.rulesApplied?.length ?? 0) > 0
  );
  const agentNote = commentary.trim();

  return (
    <aside className="flex flex-col gap-3">
      {/* Computed by the app — verified, not a model claim. Its own card. */}
      <div className={cardClass}>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--ink)]">
            Computed by the app
          </span>
          <HonestyChip variant="hard">Verified</HonestyChip>
        </div>
        <p className="mb-5 text-[11px] leading-relaxed text-[var(--faint)]">
          What the app computed and checked — not the model&apos;s say-so.
        </p>
        <div className="flex flex-wrap gap-x-12 gap-y-5">
          <div>
            <div className={label}>Pattern</div>
            <div className="mt-1.5 font-serif text-[15px] capitalize">{patternName}</div>
            <div className="mt-1 text-[11px] text-[var(--faint)]">
              {freedom} AI freedom
            </div>
          </div>
          <div className="min-w-0">
            {pattern === "open-ended" ? (
              // Open-Ended renders raw HTML in a sandboxed iframe: no catalog,
              // no tool calls, no ops. The honest non-answer, not an empty list.
              <>
                <div className={label}>Components used</div>
                <p className="mt-1 text-sm text-[var(--faint)]">
                  No verifiable component calls — this pattern renders raw HTML,
                  so there is nothing to attribute.
                </p>
              </>
            ) : (
              // Controlled / Declarative: what the agent ACTUALLY used this run,
              // counted against the allow-list. The count carries the constraint
              // ("3 of 18"); we do not list the untouched remainder.
              <>
                <div className={label}>Components used</div>
                {usedNames.length === 0 ? (
                  <div className="mt-1 text-sm text-[var(--faint)]">
                    No components used this run.
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {usedNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-[11px] text-[var(--ink)]"
                      >
                        <span className="text-[var(--dt-brand)]" aria-hidden>
                          ✓
                        </span>
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {realPath && rejections.length > 0 ? (
          // Real-A2UI only: the agent NAMED a component the catalog refused, so it
          // was not rendered. Deterministic (catalog membership / enabledNames),
          // not a model claim. Terracotta harmonises with --hero-wash; it must
          // read categorically different from a used chip.
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <div className="text-[11px] text-[#8f4a31]">
              Named by the agent, blocked by your catalog
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {rejections.map((msg, i) => {
                const name = msg.match(/^"([^"]+)"/)?.[1] ?? msg;
                const reason = /is disabled/.test(msg)
                  ? "disabled"
                  : "not in catalog";
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-[#e4c9ba] bg-[#f4e3d8] px-2 py-1 text-[11px] text-[#8f4a31]"
                  >
                    <span aria-hidden>⊘</span>
                    {name}
                    <span className="opacity-70">{reason}</span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Reported by the model — the agent's own account (can be wrong). Its own
          card. On the real A2UI path the card shows the agent's parsed why-account
          when present; the honest "operations, not words" note shows only when no
          written account was emitted. */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--ink)]">
            Reported by the model
          </span>
          <HonestyChip variant="soft">Agent&apos;s account</HonestyChip>
        </div>
        {hasStructuredWhy ? (
          // Each field as an eyebrow label + value (matching the Verified card),
          // generously spaced, so the labels lead the eye instead of blending in.
          <div className="flex flex-col gap-5 text-sm">
            <div>
              <div className={label}>Rules fired</div>
              <div className="mt-1.5">
                {!why || why.rulesApplied.length === 0 ? (
                  <span className="text-[var(--faint)]">none reported</span>
                ) : (
                  <span className="text-[var(--ink)]">
                    {why.rulesApplied.join(" · ")}
                  </span>
                )}
              </div>
            </div>
            {why?.intent ? (
              <div>
                <div className={label}>Intent</div>
                <div className="mt-1.5 leading-relaxed text-[var(--muted)]">
                  {why.intent}
                </div>
              </div>
            ) : null}
            {why?.structure ? (
              <div>
                <div className={label}>Structure inferred</div>
                <div className="mt-1.5 leading-relaxed text-[var(--muted)]">
                  {why.structure}
                </div>
              </div>
            ) : null}
            {why?.source ? (
              <div>
                <div className={label}>Drawn from</div>
                <div className="mt-1.5 leading-relaxed text-[var(--muted)]">
                  {why.source}
                </div>
              </div>
            ) : null}
            {why?.notes ? (
              <div>
                <div className={label}>Decisions the rules didn&apos;t cover</div>
                <div className="mt-1.5 leading-relaxed text-[var(--muted)]">
                  {why.notes}
                </div>
              </div>
            ) : null}
          </div>
        ) : agentNote ? (
          // The agent's own prose — its account when it wrote no structured why
          // (chiefly the Real A2UI path, which emits operations + a text reply).
          <div>
            <div className={label}>In its own words</div>
            <p className="mt-1.5 leading-relaxed text-[var(--muted)]">{agentNote}</p>
          </div>
        ) : realPath ? (
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            On the Real A2UI path the agent emits operations, not a written
            account, so there is nothing for it to self-report here.
          </p>
        ) : (
          <p className="text-sm text-[var(--faint)]">
            The model reported no account for this render.
          </p>
        )}
        <p className="mt-5 border-t border-[var(--line)] pt-4 text-[11px] leading-relaxed text-[var(--faint)]">
          Not verifiable — the app can confirm what the agent built, but not
          whether it actually followed a rule. This is the model&apos;s own claim.
        </p>
      </div>
    </aside>
  );
}
